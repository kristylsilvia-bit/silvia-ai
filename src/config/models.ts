import type { ModelId, ModelInfo } from "../types";

/**
 * Model catalog. The `api` strings are the exact Gemini model ids requested in
 * the design brief - swap them here if any are not enabled on your key.
 */
export const MODELS: Record<ModelId, ModelInfo> = {
  auto: {
    id: "auto",
    label: "Auto",
    short: "Smart",
    name: "Auto - Smart routing",
    color: "var(--grad-violet)",
    badge: "Default",
    desc: "Silvia AI picks the right model for each message - Flash for chat, Pro for files, Nano Banana for images.",
    speed: "Smart",
  },
  "flash-lite": {
    id: "flash-lite",
    api: "gemini-3.1-flash-lite",
    label: "Flash Lite",
    short: "Fastest",
    name: "Gemini 3.1 Flash Lite",
    color: "var(--grad-pink)",
    badge: "Fastest",
    desc: "Ultra-fast responses with the lowest latency.",
    speed: "Fastest",
    fallback: "flash",
  },
  flash: {
    id: "flash",
    api: "gemini-3.5-flash",
    label: "Flash",
    short: "Chat",
    name: "Gemini 3.5 Flash",
    color: "var(--grad-teal)",
    badge: "Fast",
    desc: "General chat, writing and quick reasoning. Fast and conversational.",
    speed: "Fast",
  },
  pro: {
    id: "pro",
    api: "gemini-3.1-pro-preview",
    label: "Pro",
    short: "Vision",
    name: "Gemini 3.1 Pro",
    color: "var(--grad-indigo)",
    badge: "Files",
    desc: "Deep document & image analysis, vision and long-context reasoning.",
    speed: "Balanced",
  },
  image: {
    id: "image",
    api: "gemini-3.1-flash-image",
    label: "Nano Banana 2",
    short: "Image",
    name: "Nano Banana 2",
    color: "var(--grad-amber)",
    badge: "Create",
    desc: "Generates and edits images from a text prompt.",
    speed: "Creative",
  },
};

/** Stable display order for the model menu. */
export const MODEL_ORDER: ModelId[] = ["auto", "flash-lite", "flash", "pro", "image"];

export function isModelId(value: unknown): value is ModelId {
  return typeof value === "string" && value in MODELS;
}
