import type { Chat } from "../types";
import { ChatIcon, PlusIcon, SparkIcon, SunIcon, TrashIcon, XIcon } from "./icons";

interface SidebarProps {
  chats: Chat[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onToggleTheme: () => void;
  onClearAll: () => void;
}

export default function Sidebar({
  chats,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onToggleTheme,
  onClearAll,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="brand">
          <div className="brand-logo">
            <SparkIcon opacity={0.95} />
          </div>
          <div className="brand-name">
            Silvia<span className="tag">AI Studio</span>
          </div>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <PlusIcon />
          New chat
        </button>

        <div className="history-scroll">
          <div className="history-label">Recent</div>
          <div>
            {chats.length === 0 ? (
              <div className="history-empty">
                No chats yet.
                <br />
                Start a conversation.
              </div>
            ) : (
              chats.map((c) => (
                <div
                  key={c.id}
                  className={"chat-item" + (c.id === activeId ? " active" : "")}
                  onClick={() => onSelectChat(c.id)}
                >
                  <span className="ci-icon">
                    <ChatIcon />
                  </span>
                  <span className="ci-title">{c.title}</span>
                  <button
                    className="ci-del"
                    title="Delete chat"
                    aria-label="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(c.id);
                    }}
                  >
                    <XIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sb-row" onClick={onToggleTheme}>
            <SunIcon />
            <span>Appearance</span>
            <span className="spacer" />
            <span className="theme-switch">
              <span className="knob" />
            </span>
          </button>
          <button className="sb-row" onClick={onClearAll}>
            <TrashIcon />
            <span>Clear all chats</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
