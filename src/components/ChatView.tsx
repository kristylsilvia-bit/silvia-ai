import { Fragment, forwardRef } from "react";

import type { Chat, ModelId } from "../types";
import { formatMessageDay, messageDayKey } from "../lib/chatMeta";
import MessageItem from "./MessageItem";
import Welcome from "./Welcome";

interface ChatViewProps {
  chat: Chat | null;
  selectedModel: ModelId;
  streamingId: string | null;
  onPickSuggestion: (text: string) => void;
  onRegenerate: () => void;
}

/** Scrollable message area. The forwarded ref points at the scroll container. */
const ChatView = forwardRef<HTMLDivElement, ChatViewProps>(function ChatView(
  { chat, selectedModel, streamingId, onPickSuggestion, onRegenerate },
  ref,
) {
  const messages = chat?.messages ?? [];
  const lastAssistantIndex = [...messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find(({ message }) => message.role === "ai" && !message.pending)?.index;

  return (
    <div className="chat-scroll" ref={ref}>
      <div className="chat-inner">
        {messages.length === 0 ? (
          <Welcome selectedModel={selectedModel} onPick={onPickSuggestion} />
        ) : (
          messages.map((m, index) => {
            const currentDay = messageDayKey(m.createdAt);
            const previousDay = messageDayKey(messages[index - 1]?.createdAt);
            const showDay = Boolean(currentDay) && currentDay !== previousDay;
            return (
              <Fragment key={m.id}>
                {showDay && (
                  <div className="chat-day-separator" role="separator" aria-label={formatMessageDay(m.createdAt)}>
                    <span>{formatMessageDay(m.createdAt)}</span>
                  </div>
                )}
                <MessageItem
                  message={m}
                  streaming={m.id === streamingId}
                  canRegenerate={!streamingId && m.role === "ai" && index === lastAssistantIndex}
                  onRegenerate={onRegenerate}
                />
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
});

export default ChatView;
