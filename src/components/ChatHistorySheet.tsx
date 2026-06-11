import { useEffect, useMemo, useRef, useState } from "react";

import type { Chat } from "../types";
import {
  chatPreview,
  chatTurnCount,
  filterChats,
  formatChatMeta,
  groupChatHistory,
} from "../lib/chatMeta";
import { ChatIcon, PlusIcon, SparkIcon, TrashIcon, XIcon } from "./icons";

interface ChatHistorySheetProps {
  open: boolean;
  chats: Chat[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClose: () => void;
}

export default function ChatHistorySheet({
  open,
  chats,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClose,
}: ChatHistorySheetProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const filteredChats = useMemo(() => filterChats(chats, query), [chats, query]);
  const groupedChats = useMemo(() => groupChatHistory(filteredChats), [filteredChats]);
  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeId) ?? null,
    [activeId, chats],
  );
  const totalPrompts = useMemo(
    () => chats.reduce((count, chat) => count + chatTurnCount(chat), 0),
    [chats],
  );

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      if (!window.matchMedia("(max-width: 860px)").matches) searchRef.current?.focus();
    }, 120);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="history-sheet-overlay" role="dialog" aria-modal="true" aria-label="Chats">
      <div className="history-sheet-backdrop" onClick={onClose} />
      <section className="history-sheet">
        <header className="history-sheet-nav">
          <button className="history-close" type="button" aria-label="Close chats" onClick={onClose}>
            <XIcon />
          </button>
          <div>
            <h2>Chats</h2>
            <p>
              {query.trim()
                ? `${filteredChats.length} ${filteredChats.length === 1 ? "result" : "results"}`
                : `${chats.length} ${chats.length === 1 ? "conversation" : "conversations"}`}
            </p>
          </div>
          <button
            className="history-new"
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
          >
            <PlusIcon />
            New
          </button>
        </header>

        <div className="history-sheet-scroll">
          <div className="history-overview">
            <span className="history-overview-mark">
              <SparkIcon />
            </span>
            <span className="history-overview-copy">
              <strong>{activeChat?.title || "Ready for a new thread"}</strong>
              <span>{activeChat ? "Current conversation" : "Your Silvia conversations live here."}</span>
            </span>
          </div>

          <div className="history-stats" aria-label="Chat history summary">
            <span>
              <strong>{chats.length}</strong>
              Chats
            </span>
            <span>
              <strong>{totalPrompts}</strong>
              Prompts
            </span>
          </div>

          <div className="history-search-row">
            <label className="history-sheet-search">
              <span>Search chats</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations"
              />
            </label>
            {query.trim() && (
              <button
                className="history-clear-query"
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <XIcon />
              </button>
            )}
          </div>

          {chats.length === 0 ? (
            <div className="history-empty-state">
              <span>
                <SparkIcon />
              </span>
              <strong>No chats yet</strong>
              <p>Start a new conversation and it will appear here.</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="history-empty-state">
              <span>
                <SparkIcon />
              </span>
              <strong>No matches</strong>
              <p>Try another search or start a new Silvia conversation.</p>
              <button type="button" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="history-groups">
              {groupedChats.map((group) => (
                <section className="history-group" key={group.label}>
                  <div className="history-group-head">
                    <span>{group.label}</span>
                    <small>{group.chats.length}</small>
                  </div>
                  {group.chats.map((chat) => (
                    <article className={"history-card" + (chat.id === activeId ? " active" : "")} key={chat.id}>
                      <button
                        className="history-card-main"
                        type="button"
                        onClick={() => {
                          onSelectChat(chat.id);
                          onClose();
                        }}
                      >
                        <span className="history-card-icon">
                          <ChatIcon />
                        </span>
                        <span className="history-card-copy">
                          <span className="history-card-title">
                            <strong>{chat.title}</strong>
                            {chat.id === activeId && <span>Active</span>}
                          </span>
                          <em>{chatPreview(chat)}</em>
                          <span className="history-card-meta">{formatChatMeta(chat)}</span>
                        </span>
                      </button>
                      <button
                        className="history-delete"
                        type="button"
                        aria-label={`Delete ${chat.title}`}
                        onClick={() => onDeleteChat(chat.id)}
                      >
                        <TrashIcon />
                      </button>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
