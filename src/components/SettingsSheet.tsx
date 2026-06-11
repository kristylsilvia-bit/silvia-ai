import { useCallback, useEffect, useRef, useState } from "react";

import type { SyncStatus, Theme, ThinkingLevel, UserSettings } from "../types";
import { MODELS, MODEL_ORDER } from "../config/models";
import { VOICES } from "../config/voices";
import { COLOR_SCHEMES, LAYOUT_PRESETS } from "../config/themes";
import { DEFAULT_PERSONALITY, resetAllSettings } from "../lib/storage";
import { useAuth } from "../contexts/AuthContext";
import { logOut } from "../lib/firebase";
import SyncStatusChip, { SYNC_LABEL } from "./SyncStatusChip";
import {
  CameraIcon,
  CheckIcon,
  CloudCheckIcon,
  CpuIcon,
  GearIcon,
  SparkIcon,
  SunIcon,
  TrashIcon,
  VoiceBadgeIcon,
  XIcon,
} from "./icons";

type SectionId =
  | "general"
  | "models"
  | "voice"
  | "sync"
  | "appearance"
  | "account"
  | "privacy"
  | "advanced"
  | "about";

interface SectionInfo {
  id: SectionId;
  label: string;
  icon: JSX.Element;
  desc: string;
}

const SECTIONS: SectionInfo[] = [
  { id: "general",    label: "General",    icon: <GearIcon />,        desc: "Personality and everyday behavior" },
  { id: "models",     label: "AI Models",  icon: <CpuIcon />,         desc: "Default model for new chats" },
  { id: "voice",      label: "Voice Mode", icon: <VoiceBadgeIcon />,  desc: "Voice, speech and live conversations" },
  { id: "sync",       label: "Chat Sync",  icon: <CloudCheckIcon />,  desc: "Cross-device cloud sync" },
  { id: "appearance", label: "Appearance", icon: <SunIcon />,         desc: "Theme and visual style" },
  { id: "account",    label: "Account",    icon: <CameraIcon />,      desc: "Profile, sign in and sign out" },
  { id: "privacy",    label: "Privacy",    icon: <TrashIcon />,       desc: "Storage, data and clearing chats" },
  { id: "advanced",   label: "Advanced",   icon: <CpuIcon />,         desc: "Latency, reasoning and AI tuning" },
  { id: "about",      label: "About",      icon: <SparkIcon />,       desc: "Version and project info" },
];

const THINKING_OPTIONS: { id: ThinkingLevel; label: string; desc: string }[] = [
  { id: "minimal", label: "Minimal", desc: "Lowest latency - best for natural voice conversations (recommended)." },
  { id: "low",     label: "Low",     desc: "Quick replies with light reasoning." },
  { id: "medium",  label: "Medium",  desc: "More thoughtful replies; slightly slower to start speaking." },
  { id: "high",    label: "High",    desc: "Deepest reasoning; noticeably higher voice latency." },
];

interface SettingsSheetProps {
  open: boolean;
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  theme: Theme;
  onToggleTheme: () => void;
  syncStatus: SyncStatus;
  onRetrySync: () => void;
  onClearChats: () => void;
  onSignIn: () => void;
  onClose: () => void;
  avatarBase64: string | null;
  onSaveName: (name: string) => Promise<void>;
  onSaveAvatar: (avatar: string | null) => Promise<void>;
}

// ── "Saved ✓" indicator ───────────────────────────────────────────────────────

function useSaved(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const trigger = useCallback(() => {
    setSaved(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setSaved(false), 1500);
  }, []);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  return [saved, trigger];
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-row toggle-row">
      <span className="toggle-copy">
        <strong>{label}</strong>
        <span>{desc}</span>
      </span>
      <span className="toggle-control">
        <span className="toggle-state">{checked ? "On" : "Off"}</span>
        <input
          type="checkbox"
          checked={checked}
          aria-label={label}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch-track" aria-hidden="true">
          <span />
        </span>
      </span>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsSheet({
  open,
  settings,
  onUpdateSettings,
  theme,
  onToggleTheme,
  syncStatus,
  onRetrySync,
  onClearChats,
  onSignIn,
  onClose,
  avatarBase64,
  onSaveName,
  onSaveAvatar,
}: SettingsSheetProps) {
  const { user } = useAuth();
  const [section, setSection] = useState<SectionId>("general");
  const navRef = useRef<HTMLElement>(null);

  // Profile editing state
  const [editName, setEditName] = useState("");
  const [nameSaved, triggerNameSaved] = useSaved();
  const [avatarSaved, triggerAvatarSaved] = useSaved();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Confirmation dialogs
  const [clearConfirm, setClearConfirm] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Keyboard close
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Keep edit name in sync with auth user when panel opens or name changes after save
  useEffect(() => {
    if (open) setEditName(user?.displayName ?? "");
  }, [open, user?.displayName]);

  // Reset confirmation state on close
  useEffect(() => {
    if (!open) {
      setClearConfirm(false);
      setResetPhrase("");
      setResetConfirmOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const displayName = user?.displayName || user?.email || "Guest mode";
  const provider = user?.providerData?.[0]?.providerId;
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  const onNavKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = SECTIONS.findIndex((s) => s.id === section);
    const next =
      event.key === "ArrowDown"
        ? SECTIONS[(index + 1) % SECTIONS.length]
        : SECTIONS[(index - 1 + SECTIONS.length) % SECTIONS.length];
    setSection(next.id);
    navRef.current
      ?.querySelector<HTMLButtonElement>(`[data-section="${next.id}"]`)
      ?.focus();
  };

  const handleAvatarUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl !== "string") return;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(100, 100, 100, 0, Math.PI * 2);
        ctx.clip();
        const scale = Math.max(200 / img.width, 200 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (200 - w) / 2, (200 - h) / 2, w, h);
        const base64 = canvas.toDataURL("image/jpeg", 0.88);
        await onSaveAvatar(base64);
        triggerAvatarSaved();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const accountCard = (
    <div className="account-card">
      <div className="account-head">
        <span className="account-avatar">
          {avatarBase64 ? (
            <img src={avatarBase64} alt="" />
          ) : user?.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            (displayName || "S").slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="account-copy">
          <strong>{displayName}</strong>
          <span>{user?.email || "Sign in to sync chats across your devices."}</span>
          {provider && (
            <em>
              <CheckIcon />
              {provider === "google.com" ? "Google" : "Email"}
            </em>
          )}
        </span>
      </div>
      <button
        className={"account-action" + (user ? " secondary" : "")}
        type="button"
        onClick={() => {
          if (user) logOut();
          else {
            onClose();
            onSignIn();
          }
        }}
      >
        {user ? "Sign out" : "Sign in or create account"}
      </button>
    </div>
  );

  const content = (
    <>
      {section === "general" && (
        <section className="settings-section">
          <h3>Silvia AI Personality</h3>
          <p className="settings-subhead">
            The system prompt that shapes how Silvia AI responds in every conversation, including
            Voice Mode.
          </p>
          <textarea
            className="personality-editor"
            value={settings.personality}
            onChange={(e) => onUpdateSettings({ personality: e.target.value })}
          />
          <button
            className="settings-text-button"
            type="button"
            onClick={() => onUpdateSettings({ personality: DEFAULT_PERSONALITY })}
          >
            Restore default personality
          </button>

          <h3>Dictation & speech</h3>
          <div className="settings-list">
            <Toggle
              label="Voice input"
              desc="Use the microphone button to dictate prompts."
              checked={settings.voiceInputEnabled}
              onChange={(v) => onUpdateSettings({ voiceInputEnabled: v })}
            />
            <Toggle
              label="Speak Silvia AI replies"
              desc="Read completed text answers aloud when supported."
              checked={settings.spokenRepliesEnabled}
              onChange={(v) => onUpdateSettings({ spokenRepliesEnabled: v })}
            />
          </div>
        </section>
      )}

      {section === "models" && (
        <section className="settings-section">
          <h3>Default model</h3>
          <p className="settings-subhead">
            New chats start with this Google Gemini model. Each conversation keeps the model it
            was started or pinned with.
          </p>
          <div className="settings-list">
            {MODEL_ORDER.map((id) => {
              const model = MODELS[id];
              return (
                <button
                  className={"settings-row model-row" + (settings.defaultModel === id ? " selected" : "")}
                  key={id}
                  type="button"
                  aria-pressed={settings.defaultModel === id}
                  aria-label={`${model.name}. ${model.speed}. ${model.desc}`}
                  title={`${model.name} — ${model.desc}`}
                  onClick={() => onUpdateSettings({ defaultModel: id })}
                >
                  <span
                    className="model-row-dot"
                    style={{ background: model.color, color: model.color }}
                  />
                  <span className="model-row-copy">
                    <strong>
                      {model.name}
                      <em className={model.badge === "Fastest" ? "fastest" : undefined}>
                        {model.badge}
                      </em>
                      {model.speed !== model.badge && (
                        <span
                          className={"speed-pill" + (model.speed === "Fastest" ? " fastest" : "")}
                        >
                          {model.speed}
                        </span>
                      )}
                    </strong>
                    <span>{model.desc}</span>
                  </span>
                  <span className="model-row-check" aria-hidden="true">
                    {settings.defaultModel === id && <CheckIcon />}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="settings-caption">
            {settings.defaultModel === "flash-lite"
              ? "⚡ Fastest model selected — new chats use Gemini 3.1 Flash Lite for ultra-fast, low-latency replies."
              : MODELS[settings.defaultModel].desc}
          </p>
        </section>
      )}

      {section === "voice" && (
        <section className="settings-section">
          <h3>Voice Mode</h3>
          <p className="settings-subhead">
            Live voice conversations are powered by Gemini 3.1 Flash Live. Pick the voice Silvia
            AI speaks with - it syncs across your devices when you&apos;re signed in.
          </p>
          <div className="settings-list voice-list">
            {VOICES.map((voice) => (
              <button
                key={voice.name}
                type="button"
                className={"settings-row voice-row" + (settings.voiceName === voice.name ? " selected" : "")}
                aria-pressed={settings.voiceName === voice.name}
                onClick={() => onUpdateSettings({ voiceName: voice.name })}
              >
                <span className="voice-row-copy">
                  <strong>{voice.name}</strong>
                  <span>{voice.trait}</span>
                </span>
                <span className="model-row-check" aria-hidden="true">
                  {settings.voiceName === voice.name && <CheckIcon />}
                </span>
              </button>
            ))}
          </div>
          <p className="settings-caption">
            You can also switch voices mid-conversation from inside Voice Mode.
          </p>
        </section>
      )}

      {section === "sync" && (
        <section className="settings-section">
          <h3>Chat synchronization</h3>
          <div className="sync-card">
            <SyncStatusChip status={syncStatus} onRetry={onRetrySync} />
            <p>
              {user
                ? syncStatus === "local"
                  ? "Cloud sync is not configured for this deployment, so chats stay on this device."
                  : `Status: ${SYNC_LABEL[syncStatus]}. Chats, titles, pinned state, models and these settings sync to your account in real time. Local storage keeps everything available offline.`
                : "Sign in to sync your chats across devices. While signed out, conversations are stored only in this browser."}
            </p>
            {!user && (
              <button
                type="button"
                className="account-action"
                onClick={() => {
                  onClose();
                  onSignIn();
                }}
              >
                Sign in to enable sync
              </button>
            )}
            {syncStatus === "error" && (
              <button type="button" className="account-action secondary" onClick={onRetrySync}>
                Retry sync
              </button>
            )}
          </div>
          <p className="settings-caption">
            Synced data is private to your account and protected by Firestore security rules.
            Large attachments stay on the device they were added on.
          </p>
        </section>
      )}

      {section === "appearance" && (
        <section className="settings-section">
          <h3>Brightness</h3>
          <div className="settings-list">
            <Toggle
              label="Dark theme"
              desc="Use the dark, high-contrast Silvia AI look. Turn off for the light theme."
              checked={theme === "dark"}
              onChange={() => onToggleTheme()}
            />
          </div>

          <h3>Color scheme</h3>
          <p className="settings-subhead">
            Pick the accent gradient used across the app. Syncs to your account.
          </p>
          <div className="theme-swatch-grid">
            {COLOR_SCHEMES.map((scheme) => {
              const active = (settings.colorScheme ?? "violet") === scheme.id;
              return (
                <button
                  key={scheme.id}
                  type="button"
                  className={"theme-swatch" + (active ? " active" : "")}
                  aria-pressed={active}
                  aria-label={scheme.label}
                  title={scheme.label}
                  onClick={() => onUpdateSettings({ colorScheme: scheme.id })}
                  style={{
                    background: `linear-gradient(135deg, ${scheme.colors[0]}, ${scheme.colors[1]}, ${scheme.colors[2]})`,
                  }}
                >
                  {active && <span className="theme-swatch-check" aria-hidden="true"><CheckIcon /></span>}
                  <span className="theme-swatch-label">{scheme.label}</span>
                </button>
              );
            })}
          </div>

          <h3>Layout</h3>
          <p className="settings-subhead">
            Controls the chat column width. Syncs to your account.
          </p>
          <div className="layout-preset-grid">
            {LAYOUT_PRESETS.map((preset) => {
              const active = (settings.layoutId ?? "default") === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={"layout-preset" + (active ? " active" : "")}
                  aria-pressed={active}
                  onClick={() => onUpdateSettings({ layoutId: preset.id })}
                >
                  <span className="layout-preset-preview" aria-hidden="true">
                    <span
                      className="layout-preview-bar"
                      style={{
                        width: preset.id === "centered" ? "62%" :
                               preset.id === "relaxed"  ? "82%" :
                               preset.id === "wide"     ? "100%" : "76%",
                      }}
                    />
                    <span className="layout-preview-bar short" />
                    <span className="layout-preview-bar" style={{ width: "55%" }} />
                  </span>
                  <strong>{preset.label}</strong>
                  <span>{preset.desc}</span>
                  {active && <span className="layout-preset-check" aria-hidden="true"><CheckIcon /></span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {section === "account" && (
        <section className="settings-section">
          {user && (
            <>
              <h3>Profile picture</h3>
              <div className="as-avatar-editor">
                <div className="as-avatar-preview" aria-hidden="true">
                  {avatarBase64 ? (
                    <img src={avatarBase64} alt="" />
                  ) : user.photoURL ? (
                    <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{(displayName || "S").slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="as-avatar-actions">
                  <button
                    type="button"
                    className="as-btn-primary"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Upload photo
                  </button>
                  {avatarBase64 && (
                    <button
                      type="button"
                      className="as-btn-secondary"
                      onClick={async () => {
                        await onSaveAvatar(null);
                        triggerAvatarSaved();
                      }}
                    >
                      Remove
                    </button>
                  )}
                  <span
                    className={"as-saved" + (avatarSaved ? " visible" : "")}
                    aria-live="polite"
                  >
                    <CheckIcon /> Saved
                  </span>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="as-file-input"
                aria-label="Upload profile picture"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
              <p className="settings-caption">
                Cropped to a circle and synced to your account across all devices.
              </p>

              <h3>Display name</h3>
              <div className="as-field-row">
                <input
                  className="as-input"
                  type="text"
                  placeholder="Your name"
                  value={editName}
                  maxLength={40}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={async (e) => {
                    const name = e.target.value.trim();
                    if (name !== (user.displayName ?? "")) {
                      await onSaveName(name);
                      triggerNameSaved();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  aria-label="Display name"
                />
                <span
                  className={"as-saved" + (nameSaved ? " visible" : "")}
                  aria-live="polite"
                >
                  <CheckIcon /> Saved
                </span>
              </div>
              <p className="settings-caption">
                Updates your account name, visible across all your devices.
              </p>

              <h3>Account</h3>
            </>
          )}
          {accountCard}
        </section>
      )}

      {section === "privacy" && (
        <section className="settings-section">
          <h3>Privacy & Storage</h3>
          <div className="settings-privacy-card">
            <span>
              <CheckIcon />
              Private by design
            </span>
            <p>
              Chats are cached locally and, when you&apos;re signed in, synced to your private
              account space. API keys stay in your deployment environment and are never written
              to chat history.
            </p>
          </div>
          <a className="settings-text-button" href="/privacy-policy.html">
            Read the privacy policy
          </a>

          <h3>Chat history</h3>
          <p className="settings-subhead">
            Clear all saved conversations from this account. This cannot be undone.
          </p>
          {!clearConfirm ? (
            <button className="danger-row" type="button" onClick={() => setClearConfirm(true)}>
              Clear saved chats
            </button>
          ) : (
            <div className="as-confirm-box">
              <p>This will permanently delete all your chat history. Are you sure?</p>
              <div className="as-confirm-actions">
                <button
                  type="button"
                  className="as-btn-secondary"
                  onClick={() => setClearConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="as-danger-confirm-btn"
                  onClick={() => {
                    onClearChats();
                    setClearConfirm(false);
                    onClose();
                  }}
                >
                  Yes, clear all
                </button>
              </div>
            </div>
          )}

          <h3>Danger zone</h3>
          <p className="settings-subhead">
            Clears your display name, avatar, theme preference, default model, and all other
            Silvia AI settings from this device. Chat history is not affected. The page reloads
            after reset.
          </p>
          {!resetConfirmOpen ? (
            <button
              type="button"
              className="as-danger-btn"
              onClick={() => {
                setResetConfirmOpen(true);
                setResetPhrase("");
              }}
            >
              Reset all settings
            </button>
          ) : (
            <div className="as-confirm-box">
              <p>
                Type <strong>RESET</strong> below to confirm. This cannot be undone.
              </p>
              <input
                className="as-input"
                type="text"
                placeholder="Type RESET to confirm"
                value={resetPhrase}
                onChange={(e) => setResetPhrase(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-label="Type RESET to confirm"
              />
              <div className="as-confirm-actions">
                <button
                  type="button"
                  className="as-btn-secondary"
                  onClick={() => {
                    setResetConfirmOpen(false);
                    setResetPhrase("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="as-danger-confirm-btn"
                  disabled={resetPhrase !== "RESET"}
                  onClick={() => {
                    resetAllSettings();
                    window.location.reload();
                  }}
                >
                  Reset everything
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {section === "advanced" && (
        <section className="settings-section">
          <h3>Voice reasoning depth</h3>
          <p className="settings-subhead">
            How much Silvia AI thinks before speaking in Voice Mode. Minimal keeps the
            conversation snappy.
          </p>
          <div className="settings-list">
            {THINKING_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={"settings-row model-row" + (settings.thinkingLevel === option.id ? " selected" : "")}
                aria-pressed={settings.thinkingLevel === option.id}
                onClick={() => onUpdateSettings({ thinkingLevel: option.id })}
              >
                <span className="model-row-copy">
                  <strong>{option.label}</strong>
                  <span>{option.desc}</span>
                </span>
                <span className="model-row-check" aria-hidden="true">
                  {settings.thinkingLevel === option.id && <CheckIcon />}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {section === "about" && (
        <section className="settings-section">
          <div className="as-about-card">
            <div className="as-about-logo">
              <SparkIcon />
            </div>
            <strong>Silvia AI</strong>
            <span>Version 1.0.0</span>
          </div>
          <p className="settings-caption">
            A premium, multi-model Gemini chat studio built for performance and privacy.
          </p>
          <a
            className="as-link"
            href="https://github.com/kristylsilvia-bit/silvia-ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            View source on GitHub ↗
          </a>
        </section>
      )}
    </>
  );

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Silvia AI settings">
      <div className="settings-backdrop" onClick={onClose} />
      <section className="settings-window">
        <header className="settings-nav">
          <button className="settings-close" type="button" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
          <h2>Settings</h2>
          <button className="settings-done" type="button" onClick={onClose}>
            Done
          </button>
        </header>

        <div className="settings-body">
          <nav
            ref={navRef}
            className="settings-sidenav"
            aria-label="Settings sections"
            onKeyDown={onNavKeyDown}
          >
            <div className="settings-sidenav-brand">
              <span className="settings-hero-mark">
                <SparkIcon />
              </span>
              <span>
                <strong>Silvia AI</strong>
                <small>Settings</small>
              </span>
            </div>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                data-section={s.id}
                className={"settings-nav-item" + (section === s.id ? " active" : "")}
                aria-current={section === s.id ? "page" : undefined}
                onClick={() => setSection(s.id)}
              >
                <span className="sni-icon">{s.icon}</span>
                <span className="sni-copy">
                  <strong>{s.label}</strong>
                  <small>{s.desc}</small>
                </span>
              </button>
            ))}
          </nav>

          <div className="settings-content" key={section}>
            <div className="settings-content-head">
              <h3>{active.label}</h3>
              <p>{active.desc}</p>
            </div>
            <div className="settings-scroll">{content}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
