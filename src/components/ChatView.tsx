import { forwardRef } from "react";

import type { Chat } from "../types";
import MessageItem from "./MessageItem";
import Welcome from "./Welcome";

interface ChatViewProps {
  chat: Chat | null;
  streamingId: string | null;
  onPickSuggestion: (text: string) => void;
}

/** Scrollable message area. The forwarded ref points at the scroll container. */
const ChatView = forwardRef<HTMLDivElement, ChatViewProps>(function ChatView(
  { chat, streamingId, onPickSuggestion },
  ref,
) {
  const messages = chat?.messages ?? [];

  return (
    <div className="chat-scroll" ref={ref}>
      <div className="chat-inner">
        {messages.length === 0 ? (
          <Welcome onPick={onPickSuggestion} />
        ) : (
          messages.map((m) => (
            <MessageItem key={m.id} message={m} streaming={m.id === streamingId} />
          ))
        )}
      </div>
    </div>
  );
});

export default ChatView;
