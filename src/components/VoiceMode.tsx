import { useCallback, useEffect, useRef, useState } from "react";

import type { Chat, UserSettings, VoiceState } from "../types";
import { VOICES } from "../config/voices";
import { VoiceSession, type VoiceTurn } from "../lib/liveVoice";
import {
  CheckIcon,
  ChevronDownIcon,
  MicIcon,
  MicOffIcon,
  PhoneEndIcon,
  SparkIcon,
  TranscriptIcon,
  XIcon,
} from "./icons";

interface TranscriptEntry {
  id: number;
  role: "user" | "ai";
  text: string;
}

interface VoiceModeProps {
  open: boolean;
  /** Conversation Voice Mode was started from (provides model context). */
  chat: Chat | null;
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  /** A finished voice exchange to persist into chat history. */
  onTurn: (turn: VoiceTurn) => void;
  onClose: () => void;
}

const STATE_LABEL: Record<VoiceState, string> = {
  idle: "Ready",
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  muted: "Muted",
  reconnecting: "Reconnecting",
  error: "Error",
};

function haptic(): void {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* unsupported */
  }
}

let entryId = 0;

export default function VoiceMode({
  open,
  chat,
  settings,
  onUpdateSettings,
  onTurn,
  onClose,
}: VoiceModeProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [liveUser, setLiveUser] = useState("");
  const [liveAssistant, setLiveAssistant] = useState("");

  const sessionRef = useRef<VoiceSession | null>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const inputLevelRef = useRef(0);
  const chatRef = useRef<Chat | null>(chat);
  const onTurnRef = useRef(onTurn);
  const activeVoiceRef = useRef(settings.voiceName);
  chatRef.current = chat;
  onTurnRef.current = onTurn;

  const endSession = useCallback(() => {
    sessionRef.current?.end();
    sessionRef.current = null;
  }, []);

  const startSession = useCallback(() => {
    endSession();
    setErrorMessage("");
    setMuted(false);
    activeVoiceRef.current = settings.voiceName;
    const session = new VoiceSession({
      voiceName: settings.voiceName,
      thinkingLevel: settings.thinkingLevel,
      systemPrompt: settings.personality,
      contextChat: chatRef.current,
      onStateChange: setState,
      onUserTranscript: setLiveUser,
      onAssistantTranscript: setLiveAssistant,
      onTurnComplete: (turn) => {
        setEntries((prev) => {
          const next = [...prev];
          if (turn.userText) next.push({ id: (entryId += 1), role: "user", text: turn.userText });
          if (turn.assistantText)
            next.push({ id: (entryId += 1), role: "ai", text: turn.assistantText });
          return next;
        });
        setLiveUser("");
        setLiveAssistant("");
        onTurnRef.current(turn);
      },
      onError: setErrorMessage,
      onInputLevel: (level) => {
        inputLevelRef.current = level;
      },
    });
    sessionRef.current = session;
    void session.start();
  }, [endSession, settings.voiceName, settings.thinkingLevel, settings.personality]);

  /* ---- session lifecycle ---- */
  useEffect(() => {
    if (!open) return;
    setEntries([]);
    setLiveUser("");
    setLiveAssistant("");
    startSession();
    return endSession;
    // startSession changes whenever voice settings change; restarts for those
    // are handled by the dedicated effect below so we only key off `open` here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ---- live voice switch: reconnect with the newly selected voice ---- */
  useEffect(() => {
    if (!open || !sessionRef.current) return;
    if (activeVoiceRef.current !== settings.voiceName) startSession();
  }, [open, settings.voiceName, startSession]);

  /* ---- orb level animation ---- */
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const output = sessionRef.current?.outputLevel ?? 0;
      const level = Math.max(inputLevelRef.current, output);
      orbRef.current?.style.setProperty("--voice-level", level.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  /* ---- keyboard + transcript autoscroll ---- */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        endSession();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, endSession, onClose]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, liveUser, liveAssistant, transcriptVisible]);

  if (!open) return null;

  const label = state === "error" ? "Something went wrong" : STATE_LABEL[state];
  const hasLiveText = Boolean(liveUser || liveAssistant || entries.length);

  const toggleMute = () => {
    haptic();
    const next = !muted;
    setMuted(next);
    sessionRef.current?.setMuted(next);
  };

  const handleEnd = () => {
    haptic();
    endSession();
    onClose();
  };

  return (
    <div className="voice-overlay" role="dialog" aria-modal="true" aria-label="Voice Mode">
      <div className={"voice-screen state-" + state}>
        <header className="voice-top">
          <span className="voice-title">
            <SparkIcon />
            Silvia AI Voice
          </span>
          <button
            type="button"
            className="voice-icon-btn voice-close"
            aria-label="Close Voice Mode"
            onClick={handleEnd}
          >
            <XIcon />
          </button>
        </header>

        <div className="voice-stage">
          <div ref={orbRef} className={"voice-orb state-" + state} aria-hidden="true">
            <span className="voice-orb-halo" />
            <span className="voice-orb-ring r1" />
            <span className="voice-orb-ring r2" />
            <span className="voice-orb-core">
              <SparkIcon />
            </span>
          </div>

          <div className="voice-state" aria-live="polite">
            <span className={"voice-state-dot state-" + state} aria-hidden="true" />
            {label}
          </div>

          {state === "error" && (
            <div className="voice-error" role="alert">
              <p>{errorMessage || "The voice connection was lost."}</p>
              <button type="button" onClick={startSession}>
                Try again
              </button>
            </div>
          )}
        </div>

        {transcriptVisible && (
          <div className="voice-transcript" ref={transcriptRef} aria-label="Live transcript">
            {!hasLiveText ? (
              <p className="voice-transcript-empty">
                Start talking - your conversation transcript appears here and is saved to your
                chat history.
              </p>
            ) : (
              <>
                {entries.map((entry) => (
                  <p key={entry.id} className={"vt-line " + entry.role}>
                    <strong>{entry.role === "user" ? "You" : "Silvia AI"}</strong>
                    {entry.text}
                  </p>
                ))}
                {liveUser && (
                  <p className="vt-line user live">
                    <strong>You</strong>
                    {liveUser}
                  </p>
                )}
                {liveAssistant && (
                  <p className="vt-line ai live">
                    <strong>Silvia AI</strong>
                    {liveAssistant}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <footer className="voice-controls">
          <button
            type="button"
            className={"voice-ctl" + (transcriptVisible ? " active" : "")}
            aria-pressed={transcriptVisible}
            aria-label={transcriptVisible ? "Hide transcript" : "Show transcript"}
            onClick={() => {
              haptic();
              setTranscriptVisible((v) => !v);
            }}
          >
            <TranscriptIcon />
            <span>Transcript</span>
          </button>

          <button
            type="button"
            className={"voice-ctl voice-mute" + (muted ? " engaged" : "")}
            aria-pressed={muted}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            onClick={toggleMute}
          >
            {muted ? <MicOffIcon /> : <MicIcon />}
            <span>{muted ? "Unmute" : "Mute"}</span>
          </button>

          <button
            type="button"
            className="voice-ctl voice-end"
            aria-label="End conversation"
            onClick={handleEnd}
          >
            <PhoneEndIcon />
            <span>End</span>
          </button>

          <button
            type="button"
            className={"voice-ctl" + (voicePickerOpen ? " active" : "")}
            aria-expanded={voicePickerOpen}
            aria-label="Choose voice"
            onClick={() => {
              haptic();
              setVoicePickerOpen((v) => !v);
            }}
          >
            <ChevronDownIcon />
            <span>{settings.voiceName}</span>
          </button>
        </footer>

        {voicePickerOpen && (
          <div className="voice-picker" role="listbox" aria-label="Voice">
            <div className="voice-picker-head">
              <strong>Voice</strong>
              <button
                type="button"
                aria-label="Close voice list"
                onClick={() => setVoicePickerOpen(false)}
              >
                <XIcon />
              </button>
            </div>
            <div className="voice-picker-list">
              {VOICES.map((voice) => (
                <button
                  key={voice.name}
                  type="button"
                  role="option"
                  aria-selected={voice.name === settings.voiceName}
                  className={"voice-option" + (voice.name === settings.voiceName ? " selected" : "")}
                  onClick={() => {
                    haptic();
                    onUpdateSettings({ voiceName: voice.name });
                    setVoicePickerOpen(false);
                  }}
                >
                  <span className="vo-copy">
                    <strong>{voice.name}</strong>
                    <span>{voice.trait}</span>
                  </span>
                  {voice.name === settings.voiceName && <CheckIcon />}
                </button>
              ))}
            </div>
            <p className="voice-picker-note">Switching voices reconnects the conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
