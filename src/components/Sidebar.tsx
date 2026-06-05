import type { Chat } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { logOut } from "../lib/firebase";
import { ChatIcon, PlusIcon, SparkIcon, SunIcon, TrashIcon, XIcon } from "./icons";

interface SidebarProps {
  chats: Chat[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onToggleTheme: () => void;
  onClearAll: () => void;
  onSignIn: () => void;
}

export default function Sidebar({
  chats,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onToggleTheme,
  onClearAll,
  onSignIn,
}: SidebarProps) {
  const { user } = useAuth();
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
          <a className="sb-row" href="/privacy-policy.html">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Privacy policy</span>
          </a>
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
          {user ? (
            <div className="sb-account">
              <div className="sb-account-info">
                <span className="sb-avatar">
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                    : user.email?.[0]?.toUpperCase() ?? "?"}
                </span>
                <span className="sb-account-email">{user.displayName || user.email}</span>
              </div>
              <button className="sb-signout" onClick={() => logOut()} title="Sign out">
                Sign out
              </button>
            </div>
          ) : (
            <button className="sb-row sb-signin" onClick={onSignIn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
