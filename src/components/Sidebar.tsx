import { useMemo, useRef, useState } from "react";

import type { Chat, SyncStatus } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  chatPreview,
  filterChats,
  formatChatMeta,
  groupChatHistory,
} from "../lib/chatMeta";
import { logOut } from "../lib/firebase";
import SyncStatusChip from "./SyncStatusChip";
import {
  ChatIcon,
  DownloadIcon,
  GearIcon,
  PinFilledIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SparkIcon,
  SunIcon,
  TrashIcon,
  VoiceBadgeIcon,
  XIcon,
} from "./icons";

interface SidebarProps {
  chats: Chat[];
  activeId: string | null;
  syncStatus: SyncStatus;
  onRetrySync: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleTheme: () => void;
  onSettings: () => void;
  onClearAll: () => void;
  onSignIn: () => void;
  /** Closes the drawer on mobile. */
  onClose: () => void;
}

export default function Sidebar({
  chats,
  activeId,
  syncStatus,
  onRetrySync,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onTogglePin,
  onToggleTheme,
  onSettings,
  onClearAll,
  onSignIn,
  onClose,
}: SidebarProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const touchStartX = useRef<number | null>(null);
  const filteredChats = useMemo(() => filterChats(chats, query), [chats, query]);
  const groupedChats = useMemo(() => groupChatHistory(filteredChats), [filteredChats]);

  return (
    <aside
      className="sidebar"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        // Swipe left anywhere on the drawer to close it (mobile gesture).
        if (touchStartX.current === null) return;
        const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (delta < -60) onClose();
      }}
    >
      <div className="sidebar-inner">
        <div className="brand">
          <div className="brand-logo">
            <SparkIcon opacity={0.95} />
          </div>
          <div className="brand-name">Silvia AI</div>
          <SyncStatusChip status={syncStatus} onRetry={onRetrySync} />
          <button
            className="sidebar-close"
            type="button"
            aria-label="Close menu"
            onClick={onClose}
          >
            <XIcon />
          </button>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <PlusIcon />
          New chat
        </button>

        <label className="history-search">
          <span>Search chats</span>
          <SearchIcon className="hs-icon" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
          />
        </label>

        <div className="history-scroll">
          <div className="history-label">
            <span>{query.trim() ? "Search results" : "Chats"}</span>
            <small>{filteredChats.length}</small>
          </div>
          <div>
            {chats.length === 0 ? (
              <div className="history-empty">
                No chats yet.
                <br />
                Start a conversation with Silvia AI.
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="history-empty">
                No matching chats.
                <br />
                Try another search.
              </div>
            ) : (
              groupedChats.map((group) => (
                <section className="sidebar-history-group" key={group.label}>
                  <div className="sidebar-history-group-head">
                    <span>{group.label}</span>
                    <small>{group.chats.length}</small>
                  </div>
                  {group.chats.map((c) => (
                    <article
                      key={c.id}
                      className={"chat-item" + (c.id === activeId ? " active" : "") + (c.pinned ? " pinned" : "")}
                    >
                      <button className="ci-main" type="button" onClick={() => onSelectChat(c.id)}>
                        <span className="ci-icon">
                          {c.voice ? <VoiceBadgeIcon /> : <ChatIcon />}
                        </span>
                        <span className="ci-copy">
                          <span className="ci-title-row">
                            <span className="ci-title">{c.title}</span>
                            {c.voice && <span className="ci-voice-badge">Voice</span>}
                          </span>
                          <span className="ci-preview">{chatPreview(c, 72)}</span>
                          <span className="ci-meta">{formatChatMeta(c)}</span>
                        </span>
                      </button>
                      <span className="ci-actions">
                        <button
                          className={"ci-pin" + (c.pinned ? " pinned" : "")}
                          type="button"
                          title={c.pinned ? "Unpin chat" : "Pin chat"}
                          aria-label={c.pinned ? "Unpin chat" : "Pin chat"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(c.id);
                          }}
                        >
                          {c.pinned ? <PinFilledIcon /> : <PinIcon />}
                        </button>
                        <button
                          className="ci-del"
                          type="button"
                          title="Delete chat"
                          aria-label="Delete chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(c.id);
                          }}
                        >
                          <XIcon />
                        </button>
                      </span>
                    </article>
                  ))}
                </section>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <a className="sb-row" href="/privacy-policy.html" style={{ textDecoration: "none" }}>
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
          <a className="sb-row sb-download" href="/download" style={{ textDecoration: "none" }}>
            <DownloadIcon />
            <span>Download desktop app</span>
          </a>
          <button className="sb-row sb-settings" onClick={onSettings}>
            <GearIcon />
            <span>Settings</span>
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
              <span>Sign in to sync chats</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
