/**
 * Audio plumbing for Voice Mode.
 *
 * Capture: microphone -> AudioWorklet -> 16 kHz mono 16-bit little-endian PCM
 * chunks (base64) ready for `sendRealtimeInput`.
 * Playback: 24 kHz PCM from the model, scheduled gaplessly on an AudioContext
 * with support for instant interruption.
 */

export const INPUT_SAMPLE_RATE = 16_000;
export const OUTPUT_SAMPLE_RATE = 24_000;

/** ~64ms of audio per websocket message: low latency without flooding. */
const CAPTURE_CHUNK_SAMPLES = 1024;

const WORKLET_NAME = "silvia-pcm-capture";
const WORKLET_SOURCE = `
class SilviaPcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("${WORKLET_NAME}", SilviaPcmCapture);
`;

export function float32ToPcm16Base64(samples: Float32Array): string {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  // Int16Array is little-endian on every platform browsers run on.
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  const STRIDE = 0x8000;
  for (let i = 0; i < bytes.length; i += STRIDE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + STRIDE));
  }
  return btoa(binary);
}

export function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) out[i] = pcm[i] / 0x8000;
  return out;
}

/** Linear resampler for browsers that won't open a 16 kHz capture context. */
function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i += 1) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    out[i] = input[i0] + (input[i1] - input[i0]) * (pos - i0);
  }
  return out;
}

export type MicErrorKind = "permission-denied" | "no-microphone" | "unsupported" | "unknown";

export class MicError extends Error {
  kind: MicErrorKind;
  constructor(kind: MicErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface MicCaptureOptions {
  /** Receives base64-encoded 16 kHz PCM16 chunks while unmuted. */
  onChunk: (base64Pcm: string) => void;
  /** 0..1 RMS level for visualizations, fired per processed chunk. */
  onLevel?: (level: number) => void;
}

/** Microphone capture pipeline. One instance per Voice Mode session. */
export class MicCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private pending: Float32Array[] = [];
  private pendingLength = 0;
  private mutedInternal = false;
  private closed = false;

  constructor(private readonly options: MicCaptureOptions) {}

  get muted(): boolean {
    return this.mutedInternal;
  }

  setMuted(muted: boolean): void {
    this.mutedInternal = muted;
    if (muted) {
      this.pending = [];
      this.pendingLength = 0;
    }
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
      throw new MicError("unsupported", "This browser does not support live voice capture.");
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const name = (err as DOMException)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        throw new MicError(
          "permission-denied",
          "Microphone access was denied. Allow the microphone in your browser settings to use Voice Mode.",
        );
      }
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        throw new MicError("no-microphone", "No microphone was found on this device.");
      }
      throw new MicError("unknown", "Could not start the microphone.");
    }

    try {
      this.ctx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    } catch {
      this.ctx = new AudioContext();
    }
    await this.ctx.resume();

    const workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "text/javascript" }));
    try {
      await this.ctx.audioWorklet.addModule(workletUrl);
    } finally {
      URL.revokeObjectURL(workletUrl);
    }
    if (this.closed) {
      this.stop();
      return;
    }

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.ctx, WORKLET_NAME);
    this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
      this.handleSamples(event.data);
    };
    this.source.connect(this.workletNode);
    // The worklet has no outputs we care about; keep the graph alive silently.
    const sink = this.ctx.createGain();
    sink.gain.value = 0;
    this.workletNode.connect(sink);
    sink.connect(this.ctx.destination);
  }

  private handleSamples(samples: Float32Array): void {
    if (this.closed) return;
    if (this.options.onLevel) {
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
      this.options.onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
    }
    if (this.mutedInternal) return;

    this.pending.push(samples);
    this.pendingLength += samples.length;
    const contextRate = this.ctx?.sampleRate ?? INPUT_SAMPLE_RATE;
    const targetLength = Math.round((CAPTURE_CHUNK_SAMPLES * contextRate) / INPUT_SAMPLE_RATE);
    if (this.pendingLength < targetLength) return;

    const merged = new Float32Array(this.pendingLength);
    let offset = 0;
    for (const block of this.pending) {
      merged.set(block, offset);
      offset += block.length;
    }
    this.pending = [];
    this.pendingLength = 0;
    const resampled = resampleLinear(merged, contextRate, INPUT_SAMPLE_RATE);
    this.options.onChunk(float32ToPcm16Base64(resampled));
  }

  stop(): void {
    this.closed = true;
    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.ctx?.close().catch(() => undefined);
    this.workletNode = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
    this.pending = [];
    this.pendingLength = 0;
  }
}

/** Gapless 24 kHz PCM playback with instant interruption support. */
export class PcmPlayer {
  private ctx: AudioContext;
  private gain: GainNode;
  private analyser: AnalyserNode;
  private analyserData: Uint8Array<ArrayBuffer>;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  constructor() {
    this.ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  /** Queue a base64 PCM16 chunk from the model for seamless playback. */
  enqueue(base64Pcm: string): void {
    const samples = base64ToFloat32(base64Pcm);
    if (!samples.length || this.ctx.state === "closed") return;
    const buffer = this.ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(new Float32Array(samples), 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    const startAt = Math.max(this.nextStartTime, this.ctx.currentTime + 0.03);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  /** Seconds of audio still queued (0 when idle). */
  get queuedSeconds(): number {
    return Math.max(0, this.nextStartTime - this.ctx.currentTime);
  }

  get playing(): boolean {
    return this.queuedSeconds > 0.01;
  }

  /** 0..1 output level for the orb animation. */
  get level(): number {
    if (this.ctx.state !== "running") return 0;
    this.analyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i += 1) sum += this.analyserData[i];
    return Math.min(1, sum / (this.analyserData.length * 160));
  }

  /** Stop everything immediately (user barge-in / end of session). */
  interrupt(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.nextStartTime = 0;
  }

  close(): void {
    this.interrupt();
    void this.ctx.close().catch(() => undefined);
  }
}
