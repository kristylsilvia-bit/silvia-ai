import {
  GoogleGenAI,
  Modality,
  ThinkingLevel as SdkThinkingLevel,
  type Content,
  type LiveServerMessage,
  type Session,
} from "@google/genai";

import type { Chat, ThinkingLevel, VoiceState } from "../types";
import { GEMINI_API_KEY, hasApiKey } from "./gemini";
import { MicCapture, MicError, PcmPlayer } from "./audio";

/** Exact Live model required by the product spec. */
export const LIVE_MODEL = "gemini-3.1-flash-live-preview";

/** How many turns of an existing chat are replayed as context when starting. */
const CONTEXT_TURNS = 24;
const MAX_RECONNECT_ATTEMPTS = 3;

const THINKING_LEVEL_MAP: Record<ThinkingLevel, SdkThinkingLevel> = {
  minimal: SdkThinkingLevel.MINIMAL,
  low: SdkThinkingLevel.LOW,
  medium: SdkThinkingLevel.MEDIUM,
  high: SdkThinkingLevel.HIGH,
};

export interface VoiceTurn {
  userText: string;
  assistantText: string;
  at: number;
}

export interface VoiceSessionOptions {
  voiceName: string;
  thinkingLevel: ThinkingLevel;
  systemPrompt?: string;
  /** Existing conversation replayed as context so Silvia AI remembers it. */
  contextChat?: Chat | null;
  onStateChange: (state: VoiceState) => void;
  /** Streaming transcript of what the user is currently saying. */
  onUserTranscript: (text: string) => void;
  /** Streaming transcript of what the model is currently saying. */
  onAssistantTranscript: (text: string) => void;
  /** A completed exchange, ready to be persisted into chat history. */
  onTurnComplete: (turn: VoiceTurn) => void;
  onError: (message: string) => void;
  /** Mic input level, 0..1. */
  onInputLevel?: (level: number) => void;
}

interface LiveAuth {
  apiKey: string;
  /** Ephemeral tokens are only honoured on the v1alpha API surface. */
  apiVersion?: string;
}

/**
 * Resolve credentials for the realtime connection. Production deployments
 * mint short-lived ephemeral tokens server-side (/api/live-token) so the real
 * Gemini key never ships to the browser; local dev falls back to the Vite key.
 */
async function resolveLiveAuth(): Promise<LiveAuth> {
  try {
    const res = await fetch("/api/live-token", { method: "POST" });
    if (res.ok) {
      const body = (await res.json()) as { token?: string };
      if (body.token) return { apiKey: body.token, apiVersion: "v1alpha" };
    }
  } catch {
    /* endpoint unavailable (e.g. vite dev server) - fall through */
  }
  if (hasApiKey()) return { apiKey: GEMINI_API_KEY };
  throw new Error(
    "Voice Mode is not configured. Deploy the /api/live-token endpoint with GEMINI_API_KEY, or set VITE_GEMINI_API_KEY for local development.",
  );
}

/** Convert recent chat history into Live API content for context seeding. */
function buildContextTurns(chat: Chat, systemPrompt?: string): Content[] {
  const turns: Content[] = [];
  const prompt = systemPrompt?.trim();
  if (prompt) {
    turns.push({ role: "user", parts: [{ text: prompt }] });
    turns.push({ role: "model", parts: [{ text: "Understood. I will respond as Silvia AI." }] });
  }
  chat.messages
    .filter((m) => !m.pending && !m.image && m.content && !m.error)
    .slice(-CONTEXT_TURNS)
    .forEach((m) => {
      turns.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      });
    });
  return turns;
}

/** True for the only session allowed to run; prevents parallel connections. */
let activeSession: VoiceSession | null = null;

export class VoiceSession {
  private session: Session | null = null;
  private mic: MicCapture | null = null;
  private player: PcmPlayer | null = null;
  private state: VoiceState = "idle";
  private mutedFlag = false;
  private endedByUser = false;
  private reconnectAttempts = 0;
  private userBuffer = "";
  private assistantBuffer = "";
  private speakingWatchdog: number | undefined;
  private thinkingTimer: number | undefined;
  private lastUserSpeechAt = 0;

  constructor(private readonly options: VoiceSessionOptions) {}

  get currentState(): VoiceState {
    return this.state;
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  get outputLevel(): number {
    return this.player?.level ?? 0;
  }

  private setState(state: VoiceState): void {
    if (this.state === state || this.endedByUser) return;
    this.state = state;
    this.options.onStateChange(state);
  }

  async start(): Promise<void> {
    // Only one live conversation may exist at a time.
    if (activeSession && activeSession !== this) activeSession.end();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    activeSession = this;
    this.setState("connecting");

    this.player = new PcmPlayer();
    await this.player.resume();

    this.mic = new MicCapture({
      onChunk: (base64Pcm) => {
        this.session?.sendRealtimeInput({
          audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" },
        });
      },
      onLevel: (level) => {
        if (level > 0.06) this.lastUserSpeechAt = Date.now();
        this.options.onInputLevel?.(this.mutedFlag ? 0 : level);
      },
    });

    try {
      await this.mic.start();
    } catch (err) {
      this.cleanup();
      this.setState("error");
      this.options.onError(
        err instanceof MicError ? err.message : "Could not start the microphone.",
      );
      return;
    }

    await this.connect();
  }

  private async connect(): Promise<void> {
    let auth: LiveAuth;
    try {
      auth = await resolveLiveAuth();
    } catch (err) {
      this.cleanup();
      this.setState("error");
      this.options.onError((err as Error).message);
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: auth.apiKey,
      ...(auth.apiVersion ? { httpOptions: { apiVersion: auth.apiVersion } } : {}),
    });

    try {
      this.session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.options.voiceName } },
          },
          thinkingConfig: { thinkingLevel: THINKING_LEVEL_MAP[this.options.thinkingLevel] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          ...(this.options.systemPrompt?.trim()
            ? { systemInstruction: this.options.systemPrompt.trim() }
            : {}),
        },
        callbacks: {
          onopen: () => this.handleOpen(),
          onmessage: (message: LiveServerMessage) => this.handleMessage(message),
          onerror: (event: ErrorEvent) => this.handleTransportFailure(event.message),
          onclose: (event: CloseEvent) => {
            if (!this.endedByUser) this.handleTransportFailure(event.reason || "Connection closed");
          },
        },
      });
    } catch (err) {
      this.handleTransportFailure((err as Error).message);
    }
  }

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    // Seed prior conversation so voice picks up where text left off. Client
    // content is only used here, for initial context - never for live audio.
    const context = this.options.contextChat;
    if (context && context.messages.length && this.session) {
      const turns = buildContextTurns(context, this.options.systemPrompt);
      if (turns.length) this.session.sendClientContent({ turns, turnComplete: false });
    }
    this.setState(this.mutedFlag ? "muted" : "listening");
  }

  private handleMessage(message: LiveServerMessage): void {
    const content = message.serverContent;
    if (!content) return;

    // The user barged in: drop queued audio instantly and hand the floor back.
    if (content.interrupted) {
      this.player?.interrupt();
      this.flushTurn();
      this.setState(this.mutedFlag ? "muted" : "listening");
      return;
    }

    if (content.inputTranscription?.text) {
      this.userBuffer += content.inputTranscription.text;
      this.options.onUserTranscript(this.userBuffer);
      this.scheduleThinkingProbe();
    }
    if (content.outputTranscription?.text) {
      this.assistantBuffer += content.outputTranscription.text;
      this.options.onAssistantTranscript(this.assistantBuffer);
    }

    // A single server event can carry multiple parts - process every one.
    const parts = content.modelTurn?.parts ?? [];
    for (const part of parts) {
      const audioData = part.inlineData?.data;
      if (audioData && this.player) {
        this.player.enqueue(audioData);
        this.setState("speaking");
        this.armSpeakingWatchdog();
      }
      if (part.text) {
        this.assistantBuffer += part.text;
        this.options.onAssistantTranscript(this.assistantBuffer);
      }
    }

    if (content.turnComplete) {
      this.flushTurn();
      this.armSpeakingWatchdog();
    }
  }

  /** Persist the finished exchange and reset the live transcript buffers. */
  private flushTurn(): void {
    const userText = this.userBuffer.trim();
    const assistantText = this.assistantBuffer.trim();
    this.userBuffer = "";
    this.assistantBuffer = "";
    window.clearTimeout(this.thinkingTimer);
    if (userText || assistantText) {
      this.options.onTurnComplete({ userText, assistantText, at: Date.now() });
    }
  }

  /** Flip back to "listening" once the playback queue drains. */
  private armSpeakingWatchdog(): void {
    window.clearTimeout(this.speakingWatchdog);
    const player = this.player;
    if (!player) return;
    const remaining = player.queuedSeconds;
    if (remaining <= 0.02) {
      if (this.state === "speaking") this.setState(this.mutedFlag ? "muted" : "listening");
      return;
    }
    this.speakingWatchdog = window.setTimeout(() => this.armSpeakingWatchdog(), remaining * 1000 + 60);
  }

  /**
   * Heuristic "thinking" indicator: the user said something, then went quiet,
   * and the model has not started talking yet.
   */
  private scheduleThinkingProbe(): void {
    window.clearTimeout(this.thinkingTimer);
    this.thinkingTimer = window.setTimeout(() => {
      const quietFor = Date.now() - this.lastUserSpeechAt;
      if (this.state === "listening" && quietFor > 500 && !(this.player?.playing ?? false)) {
        this.setState("thinking");
      }
    }, 700);
  }

  private handleTransportFailure(reason: string): void {
    if (this.endedByUser) return;
    this.session = null;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.cleanup();
      this.setState("error");
      this.options.onError(reason || "The voice connection was lost.");
      return;
    }
    this.reconnectAttempts += 1;
    this.setState("reconnecting");
    const delay = 600 * 2 ** (this.reconnectAttempts - 1);
    window.setTimeout(() => {
      if (!this.endedByUser) void this.connect();
    }, delay);
  }

  setMuted(muted: boolean): void {
    if (this.mutedFlag === muted) return;
    this.mutedFlag = muted;
    this.mic?.setMuted(muted);
    if (muted) {
      // Tell automatic VAD the input stream paused so it can close the turn.
      try {
        this.session?.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        /* socket may be mid-reconnect */
      }
      if (this.state === "listening" || this.state === "thinking") this.setState("muted");
    } else if (this.state === "muted") {
      this.setState("listening");
    }
  }

  /** End the conversation and release every audio/network resource. */
  end(): void {
    if (this.endedByUser) return;
    this.endedByUser = true;
    this.flushTurn();
    this.cleanup();
    if (activeSession === this) activeSession = null;
    this.state = "idle";
  }

  private cleanup(): void {
    window.clearTimeout(this.speakingWatchdog);
    window.clearTimeout(this.thinkingTimer);
    try {
      this.session?.close();
    } catch {
      /* already closed */
    }
    this.session = null;
    this.mic?.stop();
    this.mic = null;
    this.player?.close();
    this.player = null;
  }
}
