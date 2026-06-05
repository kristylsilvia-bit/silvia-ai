import type { Chat, ModelId, Theme } from "../types";

const LS_CHATS_ANON = "silvia.chats.v1";
const LS_THEME = "silvia.theme";
const LS_MODEL = "silvia.model";
const LS_FREE_CHATS = "silvia.freeChats";

function chatsKey(uid: string | null): string {
  return uid ? `silvia.chats.u.${uid}` : LS_CHATS_ANON;
}

export function loadChats(uid: string | null = null): Chat[] {
  try {
    const raw = localStorage.getItem(chatsKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Chat[]) : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[], uid: string | null = null): void {
  try {
    localStorage.setItem(chatsKey(uid), JSON.stringify(chats));
  } catch {
    /* quota or privacy mode — fail silently */
  }
}

/** How many free chats this anonymous session has used. */
export function getFreeChatsUsed(): number {
  return parseInt(localStorage.getItem(LS_FREE_CHATS) ?? "0", 10);
}

export function incrementFreeChats(): void {
  try {
    localStorage.setItem(LS_FREE_CHATS, String(getFreeChatsUsed() + 1));
  } catch {
    /* ignore */
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
