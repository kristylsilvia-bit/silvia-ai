import { useCallback, useEffect, useRef, useState } from "react";

import type { Attachment, Chat, Message, ModelId } from "./types";
import { MODELS } from "./config/models";
import { buildContents, generateImage, hasApiKey, streamGenerate } from "./lib/gemini";
import { readFiles } from "./lib/files";
import { routeModel } from "./lib/routing";
import {
  loadChats,
  loadModel,
  saveChats,
  saveModel,
  getFreeChatsUsed,
  incrementFreeChats,
} from "./lib/storage";
import { isMobile, uid } from "./lib/utils";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./contexts/AuthContext";

import Aurora from "./components/Aurora";
import AuthScreen from "./components/AuthScreen";
import ChatView from "./components/ChatView";
import Composer from "./components/Composer";
import Sidebar from "./components/Sidebar";
import Toast, { type ToastState } from "./components/Toast";
import TopBar from "./components/TopBar";

const FREE_CHAT_LIMIT = 5;

const blankChat = (): Chat => ({
  id: uid(),
  title: "New chat",
  messages: [],
  createdAt: Date.now(),
});

type MessagePatch = Partial<Message> | ((m: Message) => Partial<Message>);

export default function App() {
  const [, toggleTheme] = useTheme();
  const { user, loading: authLoading } = useAuth();

  const [chats, setChats] = useState<Chat[]>(() => loadChats(null));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => loadModel("auto"));

  const [showAuth, setShowAuth] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [toast, setToast] = useState<ToastState>({ message: "", error: false, show: false });

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const didInit = useRef(false);
  const prevUidRef = useRef<string | null | undefined>(undefined);

  /* ---- reload chats when auth state changes (uid switches) ---- */
  useEffect(() => {
    if (authLoading) return;
    const uid = user?.uid ?? null;
    if (prevUidRef.current === uid) return;
    prevUidRef.current = uid;
    const loaded = loadChats(uid);
    if (loaded.length) {
      setChats(loaded);
      setActiveId(loaded[0].id);
    } else {
      const c = blankChat();
      setChats([c]);
      setActiveId(c.id);
    }
    didInit.current = true;
  }, [user, authLoading]);

  /* ---- one-time init: open the first chat or create one ---- */
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (chats.length) {
      setActiveId(chats[0].id);
    } else {
      const c = blankChat();
      setChats([c]);
      setActiveId(c.id);
    }
  }, [chats]);

  /* ---- persistence (skipped mid-stream to avoid thrashing localStorage) ---- */
  useEffect(() => {
    if (!streaming) saveChats(chats, user?.uid ?? null);
  }, [chats, streaming, user]);

  useEffect(() => {
    saveModel(selectedModel);
  }, [selectedModel]);

  /* ---- keep the mobile drawer state sane across resizes ---- */
  useEffect(() => {
    const onResize = () => {
      if (!isMobile()) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const activeChat = chats.find((c) => c.id === activeId) ?? null;

  /* ---- scrolling helpers ---- */
  const scrollToBottom = useCallback((smooth = true) => {
    const s = scrollRef.current;
    if (!s) return;
    requestAnimationFrame(() =>
      s.scrollTo({ top: s.scrollHeight, behavior: smooth ? "smooth" : "auto" }),
    );
  }, []);

  const autoScrollIfNear = useCallback(() => {
    const s = scrollRef.current;
    if (!s) return;
    if (s.scrollHeight - s.scrollTop - s.clientHeight < 160) s.scrollTop = s.scrollHeight;
  }, []);

  /* scroll to bottom when switching chats */
  useEffect(() => {
    scrollToBottom(false);
  }, [activeId, scrollToBottom]);

  /* ---- toast ---- */
  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error, show: true });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => setToast((t) => ({ ...t, show: false })),
      2600,
    );
  }, []);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>(".composer textarea")?.focus();
    });
  }, []);

  /* ---- chat management ---- */
  const newChat = useCallback(() => {
    const c = blankChat();
    setChats((prev) => [c, ...prev]);
    setActiveId(c.id);
    setAttachments([]);
    setInput("");
    focusInput();
  }, [focusInput]);

  const selectChat = useCallback((id: string) => setActiveId(id), []);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const c = blankChat();
        setActiveId(c.id);
        return [c];
      }
      setActiveId((cur) => (cur === id ? next[0].id : cur));
      return next;
    });
  }, []);

  const clearAllChats = useCallback(() => {
    if (chats.length === 0) return;
    const c = blankChat();
    setChats([c]);
    setActiveId(c.id);
    showToast("All chats cleared");
  }, [chats.length, showToast]);

  /* ---- attachments ---- */
  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      try {
        const next = await readFiles(files);
        setAttachments((prev) => [...prev, ...next]);
      } catch (e) {
        showToast((e as Error).message || "Could not read file", true);
      }
    },
    [showToast],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /* ---- message updates ---- */
  const updateMessage = useCallback(
    (chatId: string, msgId: string, patch: MessagePatch) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id !== msgId
                    ? m
                    : { ...m, ...(typeof patch === "function" ? patch(m) : patch) },
                ),
              },
        ),
      );
    },
    [],
  );

  /* ---- send flow ---- */
  const sendMessage = useCallback(async () => {
    if (streaming) return;
    const text = input.trim();
    const atts = attachments.slice();
    if (!text && !atts.length) return;
    if (!hasApiKey()) {
      showToast("Add your Gemini API key in .env (VITE_GEMINI_API_KEY)", true);
    }

    // free trial gate — anonymous users get FREE_CHAT_LIMIT chats
    if (!user) {
      const used = getFreeChatsUsed();
      if (used >= FREE_CHAT_LIMIT) {
        setTrialExpired(true);
        setShowAuth(true);
        return;
      }
      incrementFreeChats();
    }

    // resolve the target chat (create one if none is active)
    let chatId = activeId;
    let baseChats = chats;
    if (!chatId || !chats.some((c) => c.id === chatId)) {
      const c = blankChat();
      baseChats = [c, ...chats];
      chatId = c.id;
      setChats(baseChats);
      setActiveId(chatId);
    }
    const chat = baseChats.find((c) => c.id === chatId);
    if (!chat || !chatId) return;
    const targetId = chatId;

    const userMsg: Message = { id: uid(), role: "user", content: text, attachments: atts };
    const modelId = routeModel(selectedModel, text, atts.length > 0);
    const apiModel = MODELS[modelId].api as string;
    const aiMsg: Message = { id: uid(), role: "ai", content: "", modelId, pending: true };

    // capture history BEFORE appending the new turn
    const contents = buildContents(chat, text, atts);

    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== targetId) return c;
        const isFirstUser = c.messages.filter((m) => m.role === "user").length === 0;
        return {
          ...c,
          title: isFirstUser ? (text || atts[0]?.name || "New chat").slice(0, 48) : c.title,
          messages: [...c.messages, userMsg, aiMsg],
        };
      }),
    );

    setInput("");
    setAttachments([]);
    setStreaming(true);
    setStreamingId(aiMsg.id);
    scrollToBottom(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      if (modelId === "image") {
        const { image, caption } = await generateImage(apiModel, text, atts, ctrl.signal);
        updateMessage(targetId, aiMsg.id, { pending: false, image, content: caption || "" });
      } else {
        const full = await streamGenerate(
          apiModel,
          contents,
          (acc) => {
            updateMessage(targetId, aiMsg.id, { content: acc, pending: false });
            autoScrollIfNear();
          },
          ctrl.signal,
        );
        if (!full) {
          updateMessage(targetId, aiMsg.id, {
            content: "_(No response generated.)_",
            pending: false,
          });
        }
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") {
        updateMessage(targetId, aiMsg.id, (m) => ({
          pending: false,
          content: `${m.content || ""}\n\n_⏹ Stopped._`,
        }));
      } else {
        updateMessage(targetId, aiMsg.id, {
          pending: false,
          error: true,
          content: `⚠️ **${e.message || "Something went wrong."}**`,
        });
      }
    } finally {
      setStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }, [
    streaming,
    input,
    attachments,
    chats,
    activeId,
    selectedModel,
    showToast,
    scrollToBottom,
    autoScrollIfNear,
    updateMessage,
  ]);

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

  /* ---- sidebar ---- */
  const toggleSidebar = useCallback(() => {
    if (isMobile()) setSidebarOpen((o) => !o);
    else setSidebarCollapsed((c) => !c);
  }, []);
  const closeSidebarMobile = useCallback(() => {
    if (isMobile()) setSidebarOpen(false);
  }, []);

  const pickSuggestion = useCallback(
    (text: string) => {
      setInput(text);
      focusInput();
    },
    [focusInput],
  );

  const topbarTitle = activeChat && activeChat.messages.length ? activeChat.title : "New chat";
  const canSend = input.trim().length > 0 || attachments.length > 0;

  const appClass =
    "app" +
    (sidebarCollapsed ? " sidebar-collapsed" : "") +
    (sidebarOpen ? " sidebar-open" : "");

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  return (
    <>
      <Aurora />

      {showAuth && (
        <AuthScreen
          trialExpired={trialExpired}
          onClose={() => {
            setShowAuth(false);
            setTrialExpired(false);
          }}
        />
      )}

      <div className={appClass}>
        <Sidebar
          chats={chats}
          activeId={activeId}
          onNewChat={() => {
            newChat();
            closeSidebarMobile();
          }}
          onSelectChat={(id) => {
            selectChat(id);
            closeSidebarMobile();
          }}
          onDeleteChat={deleteChat}
          onToggleTheme={toggleTheme}
          onClearAll={clearAllChats}
          onSignIn={() => { setTrialExpired(false); setShowAuth(true); }}
        />

        <div className="backdrop" onClick={closeSidebarMobile} />

        <main
          className="main"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
        >
          <TopBar
            title={topbarTitle}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onMenu={toggleSidebar}
            onCollapse={toggleSidebar}
          />

          <ChatView
            ref={scrollRef}
            chat={activeChat}
            streamingId={streamingId}
            onPickSuggestion={pickSuggestion}
          />

          <Composer
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            onStop={stopStreaming}
            streaming={streaming}
            canSend={canSend}
            attachments={attachments}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
          />
        </main>
      </div>

      <Toast {...toast} />
    </>
  );
}
