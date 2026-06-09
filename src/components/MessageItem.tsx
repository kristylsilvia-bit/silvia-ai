import type { Message } from "../types";
import { MODELS } from "../config/models";
import { fmtSize } from "../lib/utils";
import MarkdownContent from "./MarkdownContent";
import { DownloadIcon, FileIcon, SparkIcon } from "./icons";

interface MessageItemProps {
  message: Message;
  /** True while this AI message is actively streaming. */
  streaming?: boolean;
}

export default function MessageItem({ message: m, streaming }: MessageItemProps) {
  const isAi = m.role === "ai";
  const model = m.modelId ? (MODELS[m.modelId] ?? MODELS.flash) : null;

  return (
    <div className={"msg " + m.role}>
      <div className="avatar">{isAi ? <SparkIcon /> : "Y"}</div>

      <div className="msg-body">
        <div className="msg-name">
          {isAi ? "Silvia" : "You"}
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
                <div className="att-thumb" key={a.id}>
                  <img src={a.dataUrl} alt={a.name} />
                </div>
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

        <div className="bubble">
          {isAi && m.pending ? (
            <div className="typing">
              <span />
              <span />
              <span />
            </div>
          ) : m.image ? (
            <>
              <div className="gen-image">
                <img src={m.image} alt="generated" />
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
            <MarkdownContent content={m.content} streaming={streaming} />
          )}
        </div>
      </div>
    </div>
  );
}
