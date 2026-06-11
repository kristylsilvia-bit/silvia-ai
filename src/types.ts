export type Role = "user" | "ai";

export type ModelId = "auto" | "flash-lite" | "flash" | "pro" | "image";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  isImage: boolean;
  /** Data URL retained only for images (used for thumbnails/previews). */
  dataUrl: string | null;
  /** Raw base64 payload (no data-URL prefix), sent to the API as inline data. */
  base64: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  /** Creation timestamp used for native-style message metadata. */
  createdAt?: number;
  attachments?: Attachment[];
  /** Which model produced this AI message (for the route badge). */
  modelId?: ModelId;
  /** True while the AI bubble is awaiting its first token. */
  pending?: boolean;
  /** Data URL of a generated image (Nano Banana 2 replies). */
  image?: string;
  /** True if the message is an error notice. */
  error?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  /**
   * Last local mutation time. Drives cross-device conflict resolution
   * (last-write-wins per chat) and history ordering.
   */
  updatedAt?: number;
  /** Pinned chats sort to the top of the history list and sync across devices. */
  pinned?: boolean;
  /**
   * Soft-delete tombstone. Deleted chats are hidden in the UI but kept (briefly)
   * so the deletion propagates to other devices instead of being resurrected.
   */
  deleted?: boolean;
  /** True when the chat contains at least one Voice Mode conversation. */
  voice?: boolean;
  /**
   * Model pinned to this conversation. Unset on chats from older versions and
   * on brand-new chats until the user picks a model or sends a message, in
   * which case the default model applies.
   */
  modelId?: ModelId;
}

/** Connection state of the Firestore chat sync engine. */
export type SyncStatus = "local" | "syncing" | "synced" | "offline" | "error";

/** Reasoning depth for Gemini Live voice conversations. */
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

/** Lifecycle of a Voice Mode session. */
export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted"
  | "reconnecting"
  | "error";

/** User preferences that sync across devices for signed-in users. */
export interface UserSettings {
  defaultModel: ModelId;
  voiceName: string;
  thinkingLevel: ThinkingLevel;
  personality: string;
  voiceInputEnabled: boolean;
  spokenRepliesEnabled: boolean;
  theme: Theme;
  /** Gradient / accent color scheme — "violet" | "ocean" | "sunset" | … */
  colorScheme: string;
  /** Chat column width preset — "default" | "centered" | "relaxed" | "wide" */
  layoutId: string;
  /** Last local mutation time, for cross-device last-write-wins. */
  updatedAt: number;
}

export interface ModelInfo {
  id: ModelId;
  /** Gemini model id, absent for the synthetic "auto" entry. */
  api?: string;
  label: string;
  short: string;
  name: string;
  /** CSS color (a var() reference) for the model's dot/badge. */
  color: string;
  badge: string;
  desc: string;
  /** Speed/quality indicator shown in model pickers and settings. */
  speed: string;
  /** Model to retry with when the API reports this one as unavailable. */
  fallback?: ModelId;
}

export type Theme = "dark" | "light";
