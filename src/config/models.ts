import type { ModelId, ModelInfo } from "../types";

/**
 * Model catalog. The `api` strings are the exact Gemini model ids requested in
 * the design brief — swap them here if any aren't enabled on your key.
 */
export const MODELS: Record<ModelId, ModelInfo> = {
  auto: {
    id: "auto",
    label: "Auto",
    short: "Smart",
    name: "Auto · Smart routing",
    color: "var(--grad-violet)",
    badge: "Default",
    desc: "Silvia picks the right model for each message — Flash for chat, Pro for files, Nano Banana for images.",
  },
  flash: {
    id: "flash",
    api: "gemini-2.0-flash",
    label: "Flash",
    short: "Chat",
    name: "Gemini 2.0 Flash",
    color: "var(--grad-teal)",
    badge: "Fast",
    desc: "General chat, writing and quick reasoning. Fast and conversational.",
  },
  pro: {
    id: "pro",
    api: "gemini-1.5-pro",
    label: "Pro",
    short: "Vision",
    name: "Gemini 1.5 Pro",
    color: "var(--grad-indigo)",
    badge: "Files",
    desc: "Deep document & image analysis, vision and long-context reasoning.",
  },
  image: {
    id: "image",
    api: "imagen-3.0-generate-002",
    label: "Nano Banana 2",
    short: "Image",
    name: "Nano Banana 2",
    color: "var(--grad-amber)",
    badge: "Create",
    desc: "Generates images from a text prompt using Imagen 3.",
  },
};

/** Stable display order for the model menu. */
export const MODEL_ORDER: ModelId[] = ["auto", "flash", "pro", "image"];
