import { useEffect, useId, useRef, useState } from "react";

import type { Attachment } from "../types";
import {
  CameraIcon,
  FileIcon,
  ImageIcon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  StopIcon,
  UploadIcon,
  WaveformIcon,
  XIcon,
} from "./icons";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string } }>;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  canSend: boolean;
  attachments: Attachment[];
  voiceInputEnabled: boolean;
  onVoiceInputEnabledChange: (enabled: boolean) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
  /** Opens the full-screen Voice Mode experience. */
  onOpenVoiceMode: () => void;
}

export default function Composer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  canSend,
  attachments,
  voiceInputEnabled,
  onVoiceInputEnabledChange,
  onAddFiles,
  onRemoveAttachment,
  onOpenVoiceMode,
}: ComposerProps) {
  const [focused, setFocused] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const attachmentMenuId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEditorValueRef = useRef(value);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const current = editor.textContent ?? "";
    if (current !== value) editor.textContent = value;
    lastEditorValueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (voiceInputEnabled || !listening) return;
    recognitionRef.current?.stop();
    setListening(false);
  }, [voiceInputEnabled, listening]);

  useEffect(() => {
    if (!attachmentMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAttachmentMenuOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setAttachmentMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    if (!voiceNotice) return;
    const timer = window.setTimeout(() => setVoiceNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [voiceNotice]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttachmentMenuOpen(false);
    if (streaming) onStop();
    else onSend();
  };

  const syncEditorValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = editor.textContent ?? "";
    if (!next) editor.textContent = "";
    lastEditorValueRef.current = next;
    onChange(next);
  };

  const insertPlainText = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      editor.textContent = `${editor.textContent ?? ""}${text}`;
      syncEditorValue();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      editor.textContent = `${editor.textContent ?? ""}${text}`;
      syncEditorValue();
      return;
    }

    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    syncEditorValue();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!streaming) onSend();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      insertPlainText("\n");
    }
  };

  const onDragEnterOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragover(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) onAddFiles(e.dataTransfer.files);
    setAttachmentMenuOpen(false);
    setDragover(false);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter((f): f is File => Boolean(f));
    if (files.length) {
      e.preventDefault();
      onAddFiles(files);
      setAttachmentMenuOpen(false);
      return;
    }

    const text = e.clipboardData.getData("text/plain");
    if (text) {
      e.preventDefault();
      insertPlainText(text);
    }
  };

  const attachFromInput = (files: FileList | null) => {
    if (files?.length) onAddFiles(files);
    setAttachmentMenuOpen(false);
  };

  const openAttachmentInput = (input: HTMLInputElement | null) => {
    input?.click();
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    if (!voiceInputEnabled) {
      onVoiceInputEnabledChange(true);
    }

    const SpeechRecognition =
      (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceNotice("Voice input is not available in this browser");
      editorRef.current?.focus();
      return;
    }

    const recognition = new SpeechRecognition();
    const base = value.trim();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      onChange([base, transcript.trim()].filter(Boolean).join(" "));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceNotice("Voice input could not start");
    }
  };

  const composerClass =
    "composer" +
    (focused ? " focused" : "") +
    (dragover ? " dragover" : "") +
    (attachmentMenuOpen ? " menu-open" : "") +
    (attachments.length ? " has-attachments" : "") +
    (listening ? " is-listening" : "");
  const composerStatus = listening
    ? "Listening"
    : voiceNotice || (attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} ready` : "");

  return (
    <div className="composer-wrap">
      <form
        ref={formRef}
        className={composerClass}
        onSubmit={submit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onDragEnter={onDragEnterOver}
        onDragOver={onDragEnterOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="drop-hint">
          <UploadIcon width={18} height={18} />
          Drop files to attach
        </div>

        <div
          id={attachmentMenuId}
          className={"attachment-panel" + (attachmentMenuOpen ? " show" : "")}
          role="menu"
          aria-label="Attachments"
        >
          <div className="attachment-panel-title">Add attachment</div>
          <button
            type="button"
            className="attachment-action"
            role="menuitem"
            onClick={() => openAttachmentInput(cameraInputRef.current)}
          >
            <span>
              <CameraIcon />
            </span>
            Take photo
          </button>
          <button
            type="button"
            className="attachment-action"
            role="menuitem"
            onClick={() => openAttachmentInput(photoInputRef.current)}
          >
            <span>
              <ImageIcon />
            </span>
            Upload photo
          </button>
          <button
            type="button"
            className="attachment-action"
            role="menuitem"
            onClick={() => openAttachmentInput(fileInputRef.current)}
          >
            <span>
              <FileIcon />
            </span>
            Upload file
          </button>
        </div>

        <div className={"attach-tray" + (attachments.length ? " show" : "")}>
          {attachments.map((a) => (
            <div className="tray-chip" key={a.id}>
              {a.isImage && a.dataUrl ? (
                <img className="tc-thumb" src={a.dataUrl} alt={a.name} />
              ) : (
                <span className="tc-ico">
                  <FileIcon />
                </span>
              )}
              <span className="tc-name">{a.name}</span>
              <button
                type="button"
                className="tc-x"
                aria-label={`Remove ${a.name}`}
                onClick={() => onRemoveAttachment(a.id)}
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>

        {composerStatus && (
          <div className={"composer-status" + (listening ? " listening" : voiceNotice ? " warning" : "")} aria-live="polite">
            <span aria-hidden="true" />
            {composerStatus}
          </div>
        )}

        <div className="composer-main">
          <button
            type="button"
            className={"composer-btn attach-btn" + (attachmentMenuOpen ? " active" : "")}
            aria-label={attachmentMenuOpen ? "Close attachment menu" : "Add attachment"}
            aria-expanded={attachmentMenuOpen}
            aria-controls={attachmentMenuId}
            onClick={() => setAttachmentMenuOpen((open) => !open)}
          >
            <PaperclipIcon className="attach-paperclip" />
            <PlusIcon className="attach-plus" />
          </button>
          <div
            ref={editorRef}
            className={"composer-editor" + (value ? "" : " empty")}
            role="textbox"
            aria-label="Ask Silvia AI anything"
            aria-multiline="true"
            contentEditable
            data-placeholder="Ask Silvia AI anything..."
            inputMode="text"
            enterKeyHint="send"
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck
            suppressContentEditableWarning
            onInput={syncEditorValue}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
          <button
            type="button"
            className={"composer-btn mic-btn" + (listening ? " listening" : "")}
            aria-label={
              listening
                ? "Voice input active"
                : voiceInputEnabled
                  ? "Voice input"
                  : "Enable voice input"
            }
            onClick={toggleVoice}
          >
            <MicIcon />
          </button>
          <button
            type="button"
            className="composer-btn voice-mode-btn"
            aria-label="Start Voice Mode"
            title="Voice Mode - talk with Silvia AI"
            disabled={streaming}
            onClick={() => {
              recognitionRef.current?.stop();
              setListening(false);
              onOpenVoiceMode();
            }}
          >
            <WaveformIcon />
          </button>
          <button
            type="submit"
            className={"composer-btn send-btn" + (streaming ? " stop" : "")}
            aria-label={streaming ? "Stop" : "Send"}
            disabled={!streaming && !canSend}
          >
            {streaming ? <StopIcon /> : <SendIcon />}
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            attachFromInput(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            attachFromInput(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            attachFromInput(e.target.files);
            e.target.value = "";
          }}
        />
      </form>
      <div className="composer-hint">
        Silvia AI routes to the best model automatically - <kbd>Enter</kbd> to send -{" "}
        <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
      </div>
    </div>
  );
}
