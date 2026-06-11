import { useEffect, useState } from "react";

import type { Message } from "../types";
import { MODELS } from "../config/models";
import { fmtSize } from "../lib/utils";
import MarkdownContent from "./MarkdownContent";
import { CheckIcon, CopyIcon, DownloadIcon, FileIcon, RefreshIcon, SparkIcon, XIcon } from "./icons";

interface MessageItemProps {
  message: Message;
  /** True while this AI message is actively streaming. */
  streaming?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
}

function ThinkingState({ modelName }: { modelName: string }) {
  return (
    <div className="thinking-card" aria-label="Silvia AI is thinking">
      <div className="thinking-head">
        <span className="thinking-orb">
          <SparkIcon />
        </span>
        <span className="thinking-copy">
          <strong>Thinking</strong>
          <small>{modelName}</small>
        </span>
        <span className="typing" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="thinking-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function formatMessageTime(timestamp?: number): string {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

interface ImagePreviewState {
  src: string;
  title: string;
  downloadName: string;
}

export default function MessageItem({
  message: m,
  streaming,
  canRegenerate,
  onRegenerate,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<ImagePreviewState | null>(null);
  const isAi = m.role === "ai";
  const model = m.modelId ? (MODELS[m.modelId] ?? MODELS.flash) : null;
  const messageTime = formatMessageTime(m.createdAt);
  const copyText = m.content.trim();
  const messageClass = [
    "msg",
    m.role,
    streaming ? "streaming" : "",
    m.pending ? "pending" : "",
    m.error ? "error" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const showActions = !m.pending && !streaming && (messageTime || copyText || canRegenerate);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    document.body.classList.add("preview-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("preview-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [preview]);

  const copyMessage = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className={messageClass}>
        <div className="avatar">{isAi ? <SparkIcon /> : "Y"}</div>

        <div className="msg-body">
          <div className="msg-name">
            {isAi ? "Silvia AI" : "You"}
            {isAi && model && (
              <span className="route-badge">
                <span className="rb-dot" style={{ background: model.color }} />
                {model.name}
              </span>
            )}
          </div>

          {m.attachments && m.attachments.length > 0 && (
            <div className="msg-attachments">
              {m.attachments.map((a) =>
                a.isImage && a.dataUrl ? (
                  <button
                    type="button"
                    className="att-thumb"
                    key={a.id}
                    onClick={() =>
                      setPreview({
                        src: a.dataUrl ?? "",
                        title: a.name,
                        downloadName: a.name || "silvia-attachment.png",
                      })
                    }
                  >
                    <img src={a.dataUrl} alt={a.name} />
                  </button>
                ) : (
                  <div className="att-file" key={a.id}>
                    <span className="af-ico">
                      <FileIcon />
                    </span>
                    <span>
                      <span>{a.name}</span>
                      <span className="af-meta"> {fmtSize(a.size)}</span>
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          <div className="bubble" aria-live={isAi && (streaming || m.pending) ? "polite" : undefined}>
            {isAi && m.pending ? (
              <ThinkingState modelName={model?.name ?? "Smart routing"} />
            ) : m.image ? (
              <>
                <div className="gen-image">
                  <button
                    type="button"
                    className="gen-image-open"
                    onClick={() =>
                      setPreview({
                        src: m.image ?? "",
                        title: "Generated image",
                        downloadName: "silvia-image.png",
                      })
                    }
                    aria-label="Open generated image"
                  >
                    <img src={m.image} alt="generated" />
                  </button>
                  <div className="gi-bar">
                    <span className="gi-label">
                      <SparkIcon /> Nano Banana 2
                    </span>
                    <a className="gi-download" href={m.image} download="silvia-image.png">
                      <DownloadIcon />
                      Save
                    </a>
                  </div>
                </div>
                {m.content && <MarkdownContent content={m.content} />}
              </>
            ) : (
              <>
                <MarkdownContent content={m.content} streaming={streaming} />
                {streaming && (
                  <div className="streaming-status">
                    <span className="streaming-pulse" aria-hidden="true" />
                    <span>Silvia AI is writing</span>
                  </div>
                )}
              </>
            )}
          </div>

          {showActions && (
            <div className="msg-meta">
              {messageTime && <span>{messageTime}</span>}
              {copyText && (
                <button
                  type="button"
                  onClick={copyMessage}
                  aria-label={copied ? "Copied" : "Copy message"}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              )}
              {canRegenerate && onRegenerate && (
                <button type="button" onClick={onRegenerate} aria-label="Regenerate response">
                  <RefreshIcon />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="image-preview-overlay" role="dialog" aria-modal="true" aria-label={preview.title}>
          <div className="image-preview-topbar">
            <strong>{preview.title}</strong>
            <button type="button" onClick={() => setPreview(null)} aria-label="Close image">
              <XIcon />
            </button>
          </div>
          <button className="image-preview-backdrop" type="button" onClick={() => setPreview(null)} aria-label="Close image" />
          <div className="image-preview-stage">
            <img src={preview.src} alt={preview.title} />
          </div>
          <div className="image-preview-actions">
            <a href={preview.src} download={preview.downloadName}>
              <DownloadIcon />
              Save image
            </a>
          </div>
        </div>
      )}
    </>
  );
}
