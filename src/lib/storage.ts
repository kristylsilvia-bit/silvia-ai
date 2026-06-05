import type { Chat, ModelId, Theme } from "../types";

const LS_CHATS = "silvia.chats.v1";
const LS_THEME = "silvia.theme";
const LS_MODEL = "silvia.model";

export function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(LS_CHATS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Chat[]) : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]): void {
  try {
    localStorage.setItem(LS_CHATS, JSON.stringify(chats));
  } catch {
    /* quota or privacy mode — fail silently, same as the prototype */
  }
}

export function loadTheme(fallback: Theme = "dark"): Theme {
  const t = localStorage.getItem(LS_THEME);
  return t === "light" || t === "dark" ? t : fallback;
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(LS_THEME, theme);
  } catch {
    /* ignore */
  }
}

export function loadModel(fallback: ModelId = "auto"): ModelId {
  const m = localStorage.getItem(LS_MODEL);
  return m === "auto" || m === "flash" || m === "pro" || m === "image" ? m : fallback;
}

export function saveModel(model: ModelId): void {
  try {
    localStorage.setItem(LS_MODEL, model);
  } catch {
    /* ignore */
  }
}
