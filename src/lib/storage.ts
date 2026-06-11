import type { Chat, ModelId, Theme, ThinkingLevel, UserSettings } from "../types";
import { isModelId } from "../config/models";
import { DEFAULT_VOICE, isVoiceName } from "../config/voices";
import { isColorSchemeId, isLayoutId } from "../config/themes";

const LS_CHATS_ANON = "silvia.chats.v1";
const LS_THEME = "silvia.theme";
/** Legacy "last selected model" key, read once to seed the default model. */
const LS_MODEL = "silvia.model";
const LS_DEFAULT_MODEL = "silvia.defaultModel";
const LS_FREE_CHATS = "silvia.freeChats";
const LS_SETTINGS = "silvia.settings.v1";
/** Legacy keys, folded into the settings object on first load. */
const LS_VOICE_INPUT = "silvia.voiceInput";
const LS_SPOKEN_REPLIES = "silvia.spokenReplies";
const LS_PERSONALITY = "silvia.systemPrompt";

export const DEFAULT_PERSONALITY =
  "You are Silvia AI - a polished, warm, highly capable AI assistant. Be clear, friendly, practical, and concise unless the user asks for depth. Preserve the premium chat-studio personality: confident, helpful, creative, and safe.";

function chatsKey(uid: string | null): string {
  return uid ? `silvia.chats.u.${uid}` : LS_CHATS_ANON;
}

export function loadChats(uid: string | null = null): Chat[] {
  try {
    const raw = localStorage.getItem(chatsKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop model ids this build doesn't know so the chat falls back to the default model.
    return (parsed as Chat[]).map((chat) =>
      chat.modelId !== undefined && !isModelId(chat.modelId) ? { ...chat, modelId: undefined } : chat,
    );
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[], uid: string | null = null): void {
  try {
    localStorage.setItem(chatsKey(uid), JSON.stringify(chats));
  } catch {
    /* Quota or privacy mode: fail silently. */
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

/** Model new chats start with. Falls back to the pre-settings "last model" key. */
export function loadDefaultModel(fallback: ModelId = "auto"): ModelId {
  const m = localStorage.getItem(LS_DEFAULT_MODEL) ?? localStorage.getItem(LS_MODEL);
  return isModelId(m) ? m : fallback;
}

export function saveDefaultModel(model: ModelId): void {
  try {
    localStorage.setItem(LS_DEFAULT_MODEL, model);
  } catch {
    /* ignore */
  }
}

const THINKING_LEVELS: ThinkingLevel[] = ["minimal", "low", "medium", "high"];

export function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return typeof value === "string" && (THINKING_LEVELS as string[]).includes(value);
}

export function defaultSettings(): UserSettings {
  return {
    defaultModel: "auto",
    voiceName: DEFAULT_VOICE,
    thinkingLevel: "minimal",
    personality: DEFAULT_PERSONALITY,
    voiceInputEnabled: false,
    spokenRepliesEnabled: false,
    theme: "dark",
    colorScheme: "violet",
    layoutId: "default",
    updatedAt: 0,
  };
}

/** Coerce arbitrary (cloud or stored) data into a valid settings object. */
export function normalizeSettings(raw: Partial<UserSettings>, base: UserSettings): UserSettings {
  return {
    defaultModel: isModelId(raw.defaultModel) ? raw.defaultModel : base.defaultModel,
    voiceName: isVoiceName(raw.voiceName) ? raw.voiceName : base.voiceName,
    thinkingLevel: isThinkingLevel(raw.thinkingLevel) ? raw.thinkingLevel : base.thinkingLevel,
    personality: typeof raw.personality === "string" ? raw.personality : base.personality,
    voiceInputEnabled:
      typeof raw.voiceInputEnabled === "boolean" ? raw.voiceInputEnabled : base.voiceInputEnabled,
    spokenRepliesEnabled:
      typeof raw.spokenRepliesEnabled === "boolean"
        ? raw.spokenRepliesEnabled
        : base.spokenRepliesEnabled,
    theme: raw.theme === "dark" || raw.theme === "light" ? raw.theme : base.theme,
    colorScheme: isColorSchemeId(raw.colorScheme) ? raw.colorScheme : base.colorScheme,
    layoutId: isLayoutId(raw.layoutId) ? raw.layoutId : base.layoutId,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : base.updatedAt,
  };
}

export function loadSettings(): UserSettings {
  const base = defaultSettings();
  // Fold in pre-settings-object keys so existing installs keep their choices.
  base.defaultModel = loadDefaultModel(base.defaultModel);
  base.voiceInputEnabled = localStorage.getItem(LS_VOICE_INPUT) === "1";
  base.spokenRepliesEnabled = localStorage.getItem(LS_SPOKEN_REPLIES) === "1";
  base.personality = localStorage.getItem(LS_PERSONALITY) || base.personality;
  base.theme = loadTheme(base.theme);
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return base;
    return normalizeSettings(JSON.parse(raw) as Partial<UserSettings>, base);
  } catch {
    return base;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
    // Keep legacy keys aligned for anything still reading them.
    localStorage.setItem(LS_DEFAULT_MODEL, settings.defaultModel);
    localStorage.setItem(LS_VOICE_INPUT, settings.voiceInputEnabled ? "1" : "0");
    localStorage.setItem(LS_SPOKEN_REPLIES, settings.spokenRepliesEnabled ? "1" : "0");
    localStorage.setItem(LS_PERSONALITY, settings.personality);
    saveTheme(settings.theme);
  } catch {
    /* ignore */
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────

const LS_DISPLAY_NAME = "silvia_display_name";
const LS_AVATAR = "silvia_avatar";

export function loadDisplayName(): string {
  return localStorage.getItem(LS_DISPLAY_NAME) ?? "";
}

export function saveDisplayName(name: string): void {
  try {
    if (name.trim()) localStorage.setItem(LS_DISPLAY_NAME, name);
    else localStorage.removeItem(LS_DISPLAY_NAME);
  } catch { /* ignore */ }
}

export function loadAvatar(): string | null {
  return localStorage.getItem(LS_AVATAR);
}

export function saveAvatar(avatar: string | null): void {
  try {
    if (avatar) localStorage.setItem(LS_AVATAR, avatar);
    else localStorage.removeItem(LS_AVATAR);
  } catch { /* ignore */ }
}

/** Wipes every silvia_* and silvia.* key from localStorage. */
export function resetAllSettings(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("silvia_") || key.startsWith("silvia."))) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
}
