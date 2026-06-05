import { useEffect, useRef, useState } from "react";

import type { Attachment } from "../types";
import { FileIcon, PaperclipIcon, SendIcon, StopIcon, UploadIcon, XIcon } from "./icons";

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  canSend: boolean;
  attachments: Attachment[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
}

export default function Composer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  canSend,
  attachments,
  onAddFiles,
  onRemoveAttachment,
}: ComposerProps) {
  const [focused, setFocused] = useState(false);
  const [dragover, setDragover] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow the textarea to fit its content (capped by CSS max-height).
  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
  }, [value]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (streaming) onStop();
    else onSend();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!streaming) onSend();
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
    setDragover(false);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter((f): f is File => Boolean(f));
    if (files.length) {
      e.preventDefault();
      onAddFiles(files);
    }
  };

  const composerClass =
    "composer" + (focused ? " focused" : "") + (dragover ? " dragover" : "");

  return (
    <div className="composer-wrap">
      <form
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

        <div className="composer-main">
          <button
            type="button"
            className="composer-btn"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Message Silvia…  ask anything, attach files, or describe an image to create"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
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
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </form>
      <div className="composer-hint">
        Silvia routes to the best model automatically · <kbd>Enter</kbd> to send ·{" "}
        <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
      </div>
    </div>
  );
}
