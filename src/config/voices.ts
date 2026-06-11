/**
 * Prebuilt Gemini Live voices, as documented for the Live API speech config.
 * The `name` string is passed verbatim as
 * `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`.
 */
export interface VoiceInfo {
  name: string;
  /** One-word character from the official voice list. */
  trait: string;
}

export const VOICES: VoiceInfo[] = [
  { name: "Zephyr", trait: "Bright" },
  { name: "Puck", trait: "Upbeat" },
  { name: "Charon", trait: "Informative" },
  { name: "Kore", trait: "Firm" },
  { name: "Fenrir", trait: "Excitable" },
  { name: "Leda", trait: "Youthful" },
  { name: "Orus", trait: "Firm" },
  { name: "Aoede", trait: "Breezy" },
  { name: "Callirrhoe", trait: "Easy-going" },
  { name: "Autonoe", trait: "Bright" },
  { name: "Enceladus", trait: "Breathy" },
  { name: "Iapetus", trait: "Clear" },
  { name: "Umbriel", trait: "Easy-going" },
  { name: "Algieba", trait: "Smooth" },
  { name: "Despina", trait: "Smooth" },
  { name: "Erinome", trait: "Clear" },
  { name: "Algenib", trait: "Gravelly" },
  { name: "Rasalgethi", trait: "Informative" },
  { name: "Laomedeia", trait: "Upbeat" },
  { name: "Achernar", trait: "Soft" },
  { name: "Alnilam", trait: "Firm" },
  { name: "Schedar", trait: "Even" },
  { name: "Gacrux", trait: "Mature" },
  { name: "Pulcherrima", trait: "Forward" },
  { name: "Achird", trait: "Friendly" },
  { name: "Zubenelgenubi", trait: "Casual" },
  { name: "Vindemiatrix", trait: "Gentle" },
  { name: "Sadachbia", trait: "Lively" },
  { name: "Sadaltager", trait: "Knowledgeable" },
  { name: "Sulafat", trait: "Warm" },
];

export const DEFAULT_VOICE = "Puck";

export function isVoiceName(value: unknown): value is string {
  return typeof value === "string" && VOICES.some((v) => v.name === value);
}

export function voiceTrait(name: string): string {
  return VOICES.find((v) => v.name === name)?.trait ?? "";
}
