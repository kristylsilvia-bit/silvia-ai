export type Role = "user" | "ai";

export type ModelId = "auto" | "flash" | "pro" | "image";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  isImage: boolean;
  /** Data URL — only retained for images (used for thumbnails/previews). */
  dataUrl: string | null;
  /** Raw base64 payload (no data-URL prefix), sent to the API as inline data. */
  base64: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
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
}

export interface ModelInfo {
  id: ModelId;
  /** Gemini model id — absent for the synthetic "auto" entry. */
  api?: string;
  label: string;
  short: string;
  name: string;
  /** CSS color (a var() reference) for the model's dot/badge. */
  color: string;
  badge: string;
  desc: string;
}

export type Theme = "dark" | "light";
