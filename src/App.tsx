import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Attachment, Chat, Message, ModelId } from "./types";
import { MODELS } from "./config/models";
import {
  buildContents,
  generateImage,
  hasApiKey,
  isModelUnavailableError,
  streamGenerate,
} from "./lib/gemini";
import { readFiles } from "./lib/files";
import { isImageEditFollowUp, routeModel } from "./lib/routing";
import { getFreeChatsUsed, incrementFreeChats, loadAvatar, saveAvatar, saveDisplayName, saveTheme } from "./lib/storage";
import { isMobile, uid } from "./lib/utils";
import { updateProfile } from "./lib/firebase";
import { isSyncAvailable, pushProfile, subscribeToProfile } from "./lib/chatSync";
import { useAuth } from "./contexts/AuthContext";
import { useSyncedChats, useSyncedSettings } from "./hooks/useChatSync";
import type { VoiceTurn } from "./lib/liveVoice";

import Aurora from "./components/Aurora";
import AuthScreen from "./components/AuthScreen";
import ChatView from "./components/ChatView";
import Composer from "./components/Composer";
import SettingsSheet from "./components/SettingsSheet";
import Sidebar from "./components/Sidebar";
import Toast, { type ToastState } from "./components/Toast";
import TopBar from "./components/TopBar";

/** Voice Mode pulls in the Gemini Live SDK; load it only when opened. */
const VoiceMode = lazy(() => import("./components/VoiceMode"));

const FREE_CHAT_LIMIT = 5;

const blankChat = (): Chat => ({
  id: uid(),
  title: "New chat",
  messages: [],
  createdAt: Date.now(),
});

type MessagePatch = Partial<Message> | ((m: Message) => Partial<Message>);

interface ImageGenerationContext {
  originalPrompt: string;
  description: string;
  imageDataUrl: string;
}

function recentGeneratedImageContext(messages: Message[]): ImageGenerationContext | null {
  const recent = messages.slice(-12);
  const imageMessage = [...recent].reverse().find((m) => m.role === "ai" && m.image && !m.error);
  if (!imageMessage?.image) return null;

  const imageIndex = messages.findIndex((m) => m.id === imageMessage.id);
  const previousPrompt =
    imageIndex > -1
      ? [...messages.slice(0, imageIndex)].reverse().find((m) => m.role === "user")?.content
      : "";

  return {
    originalPrompt: previousPrompt ?? "",
    description: imageMessage.content,
    imageDataUrl: imageMessage.image,
  };
}

function dataUrlToAttachment(dataUrl: string): Attachment | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const [, mime, base64] = match;
  const ext = mime.split("/")[1]?.split("+")[0] || "png";
  return {
    id: uid(),
    name: `Previous generated image.${ext}`,
    size: Math.round((base64.length * 3) / 4),
    mime,
    isImage: true,
    dataUrl,
    base64,
  };
}

function buildImageFollowUpPrompt(userRequest: string, context: ImageGenerationContext): string {
  const originalPrompt = context.originalPrompt.trim() || "Not available.";
  const description = context.description.trim() || "A previously generated image in this chat.";
  const change = userRequest.trim();

  return [
    "Create a new image by applying the user's requested visual change to the most recent generated image.",
    "Use the attached previous image as the visual base/reference when possible. If direct image editing is not available, regenerate a new image that preserves the original subject/composition while applying the requested change.",
    "Return an actual image, not instructions or a prompt for another tool.",
    "",
    `Original image prompt: ${originalPrompt}`,
    `Latest generated image context: ${description}`,
    `User requested change: ${change}`,
  ].join("\n");
}

function speechTextFromMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " code block omitted ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_>#~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function App() {
  const { user, loading: authLoading, refreshUser } = useAuth();

  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const { chats, setChats, syncStatus, retrySync } = useSyncedChats(user, authLoading, streaming);
  const { settings, updateSettings } = useSyncedSettings(user, authLoading);

  const [activeId, setActiveId] = useState<string | null>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Theme lives in settings so it syncs across devices automatically
  const theme = settings.theme ?? "dark";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: theme === "dark" ? "light" : "dark" });
  }, [theme, updateSettings]);

  // Color scheme and layout sync via settings
  useEffect(() => {
    document.documentElement.setAttribute("data-scheme", settings.colorScheme ?? "violet");
  }, [settings.colorScheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-layout", settings.layoutId ?? "default");
  }, [settings.layoutId]);

  // Profile avatar — Firestore when signed in, localStorage when guest
  const [profileAvatar, setProfileAvatar] = useState<string | null>(() => loadAvatar());

  useEffect(() => {
    if (!user?.uid) {
      setProfileAvatar(loadAvatar());
      return;
    }
    setProfileAvatar(loadAvatar()); // show cached value immediately
    if (!isSyncAvailable()) return;
    return subscribeToProfile(
      user.uid,
      (data) => {
        const av = data.avatarBase64 ?? null;
        setProfileAvatar(av);
        saveAvatar(av);
      },
      (err) => console.error("Silvia AI: profile sync failed", err),
    );
  }, [user?.uid]);

  const handleSaveName = useCallback(async (name: string) => {
    saveDisplayName(name);
    if (user) {
      try {
        await updateProfile(user, { displayName: name || null });
        refreshUser();
      } catch (err) {
        console.error("Silvia AI: failed to update display name", err);
      }
    }
  }, [user, refreshUser]);

  const handleSaveAvatar = useCallback(async (avatar: string | null) => {
    saveAvatar(avatar);
    setProfileAvatar(avatar);
    if (user?.uid && isSyncAvailable()) {
      try {
        await pushProfile(user.uid, avatar);
      } catch (err) {
        console.error("Silvia AI: failed to push avatar", err);
      }
    }
  }, [user]);

  const [voiceChatId, setVoiceChatId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [toast, setToast] = useState<ToastState>({ message: "", error: false, show: false });

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const defaultModel = settings.defaultModel;

  /** Chats shown in the UI; tombstoned (deleted) chats are sync metadata only. */
  const visibleChats = useMemo(() => chats.filter((c) => !c.deleted), [chats]);

  /* ---- keep an active, visible chat selected at all times ---- */
  useEffect(() => {
    if (authLoading) return;
    if (visibleChats.length === 0) {
      const c = blankChat();
      setChats((prev) => [c, ...prev]);
      setActiveId(c.id);
      return;
    }
    if (!activeId || !visibleChats.some((c) => c.id === activeId)) {
      setActiveId(visibleChats[0].id);
    }
  }, [visibleChats, activeId, authLoading, setChats]);

  useEffect(() => {
    if (!settings.spokenRepliesEnabled) window.speechSynthesis?.cancel();
  }, [settings.spokenRepliesEnabled]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let stableMobileHeight = window.innerHeight;

    const updateViewportVars = () => {
      const visualHeight = viewport?.height ?? window.innerHeight;
      const visualWidth = viewport?.width ?? window.innerWidth;
      const visualOffsetTop = viewport?.offsetTop ?? 0;
      const visualOffsetLeft = viewport?.offsetLeft ?? 0;
      const layoutHeight = window.innerHeight;
      const navigatorStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      const standaloneDisplay =
        navigatorStandalone ||
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches;
      const mobileViewport = window.matchMedia("(max-width: 860px)").matches;
      const screenHeight = window.screen.height || layoutHeight;
      const closedMobileHeight =
        mobileViewport && standaloneDisplay
          ? Math.max(layoutHeight, visualHeight, screenHeight)
          : Math.max(layoutHeight, visualHeight);
      const keyboardOverlap = Math.max(0, closedMobileHeight - visualHeight - visualOffsetTop);
      const activeElement = document.activeElement;
      const isTextFieldFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);
      const keyboardVisible =
        mobileViewport &&
        isTextFieldFocused &&
        (keyboardOverlap > 80 || visualHeight < closedMobileHeight - 80 || visualHeight < screenHeight * 0.72);
      if (mobileViewport && !keyboardVisible) {
        stableMobileHeight = Math.max(stableMobileHeight, closedMobileHeight);
      }
      const appHeight = mobileViewport ? Math.max(stableMobileHeight, closedMobileHeight) : layoutHeight;
      const keyboardOffset = keyboardVisible
        ? Math.max(0, appHeight - visualHeight - visualOffsetTop)
        : 0;

      root.style.setProperty("--app-layout-height", `${Math.round(layoutHeight)}px`);
      root.style.setProperty("--app-visual-height", `${Math.round(appHeight)}px`);
      root.style.setProperty("--app-visible-height", `${Math.round(visualHeight)}px`);
      root.style.setProperty("--app-visual-width", `${Math.round(mobileViewport ? window.innerWidth : visualWidth)}px`);
      root.style.setProperty("--app-visual-top", `${Math.round(mobileViewport ? 0 : visualOffsetTop)}px`);
      root.style.setProperty("--app-visual-left", `${Math.round(mobileViewport ? 0 : visualOffsetLeft)}px`);
      root.style.setProperty("--keyboard-offset", `${Math.round(keyboardOffset)}px`);
      root.classList.toggle("keyboard-open", keyboardVisible);
    };
    const updateAfterFocusChange = () => {
      window.setTimeout(updateViewportVars, 90);
      window.setTimeout(updateViewportVars, 320);
    };

    updateViewportVars();
    viewport?.addEventListener("resize", updateViewportVars);
    viewport?.addEventListener("scroll", updateViewportVars);
    window.addEventListener("resize", updateViewportVars);
    window.addEventListener("orientationchange", updateViewportVars);
    window.addEventListener("focusin", updateAfterFocusChange);
    window.addEventListener("focusout", updateAfterFocusChange);
    return () => {
      viewport?.removeEventListener("resize", updateViewportVars);
      viewport?.removeEventListener("scroll", updateViewportVars);
      window.removeEventListener("resize", updateViewportVars);
      window.removeEventListener("orientationchange", updateViewportVars);
      window.removeEventListener("focusin", updateAfterFocusChange);
      window.removeEventListener("focusout", updateAfterFocusChange);
      root.style.removeProperty("--app-layout-height");
      root.style.removeProperty("--app-visual-height");
      root.style.removeProperty("--app-visible-height");
      root.style.removeProperty("--app-visual-width");
      root.style.removeProperty("--app-visual-top");
      root.style.removeProperty("--app-visual-left");
      root.style.removeProperty("--keyboard-offset");
      root.classList.remove("keyboard-open");
    };
  }, []);

  /* ---- keep the mobile drawer state sane across resizes ---- */
  useEffect(() => {
    const onResize = () => {
      if (!isMobile()) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const activeChat = visibleChats.find((c) => c.id === activeId) ?? null;

  /**
   * Model shown in the picker: the active chat's pinned model, otherwise the
   * default model. New chats follow the default until the user picks a model
   * or sends a message, which pins it to the conversation.
   */
  const selectedModel: ModelId = activeChat?.modelId ?? defaultModel;

  /** Pin a model to the active conversation (instant, per-chat). */
  const selectModel = useCallback(
    (id: ModelId) => {
      if (!activeId) return;
      setChats((prev) => prev.map((c) => (c.id === activeId ? { ...c, modelId: id } : c)));
    },
    [activeId, setChats],
  );

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

  const speakSilviaReply = useCallback(
    (content: string) => {
      if (!settings.spokenRepliesEnabled || !("speechSynthesis" in window)) return;
      const text = speechTextFromMarkdown(content);
      if (!text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 1200));
      utterance.lang = navigator.language || "en-US";
      utterance.rate = 1;
      utterance.pitch = 1.03;
      window.speechSynthesis.speak(utterance);
    },
    [settings.spokenRepliesEnabled],
  );

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".composer-editor")?.focus();
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
  }, [focusInput, setChats]);

  const selectChat = useCallback((id: string) => setActiveId(id), []);

  /** Soft delete: tombstones propagate the removal to other devices. */
  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, deleted: true, pinned: false, messages: [], title: "Deleted chat" }
            : c,
        ),
      );
    },
    [setChats],
  );

  const togglePinChat = useCallback(
    (id: string) => {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
    },
    [setChats],
  );

  const clearAllChats = useCallback(() => {
    if (visibleChats.every((c) => c.messages.length === 0)) return;
    setChats((prev) =>
      prev.map((c) =>
        c.deleted || c.messages.length === 0
          ? c
          : { ...c, deleted: true, pinned: false, messages: [], title: "Deleted chat" },
      ),
    );
    showToast("All chats cleared");
  }, [visibleChats, setChats, showToast]);

  const clearActiveChat = useCallback(() => {
    if (!activeId) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeId ? { ...chat, title: "New chat", messages: [] } : chat,
      ),
    );
    setAttachments([]);
    setInput("");
    showToast("Chat cleared");
  }, [activeId, setChats, showToast]);

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
    [setChats],
  );

  /**
   * Stream a text reply, retrying once with the model's configured fallback
   * (e.g. Flash Lite -> Flash) when the API reports the model as unavailable.
   */
  const streamReplyWithFallback = useCallback(
    async (
      modelId: Exclude<ModelId, "auto">,
      contents: ReturnType<typeof buildContents>,
      targetId: string,
      aiMsgId: string,
      signal: AbortSignal,
    ): Promise<string> => {
      const onChunk = (acc: string) => {
        updateMessage(targetId, aiMsgId, { content: acc, pending: false });
        autoScrollIfNear();
      };
      const model = MODELS[modelId];
      try {
        return await streamGenerate(model.api as string, contents, onChunk, signal);
      } catch (err) {
        const fallback = model.fallback ? MODELS[model.fallback] : null;
        if (!fallback?.api || !isModelUnavailableError(err)) throw err;
        showToast(`${model.name} is unavailable - answering with ${fallback.name}`, true);
        updateMessage(targetId, aiMsgId, { modelId: fallback.id });
        return streamGenerate(fallback.api, contents, onChunk, signal);
      }
    },
    [updateMessage, autoScrollIfNear, showToast],
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

    // Free trial gate: anonymous users get FREE_CHAT_LIMIT chats.
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
    let baseChats = visibleChats;
    if (!chatId || !visibleChats.some((c) => c.id === chatId)) {
      const c = blankChat();
      baseChats = [c, ...visibleChats];
      chatId = c.id;
      setChats((prev) => [c, ...prev]);
      setActiveId(chatId);
    }
    const chat = baseChats.find((c) => c.id === chatId);
    if (!chat || !chatId) return;
    const targetId = chatId;

    const now = Date.now();
    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: now,
      attachments: atts,
    };
    const imageContext = recentGeneratedImageContext(chat.messages);
    const chatSelection: ModelId = chat.modelId ?? defaultModel;
    const modelId = routeModel(chatSelection, text, atts.length > 0, {
      hasRecentGeneratedImage: Boolean(imageContext),
    });
    const apiModel = MODELS[modelId].api as string;
    const aiMsg: Message = {
      id: uid(),
      role: "ai",
      content: "",
      createdAt: now,
      modelId,
      pending: true,
    };

    // capture history BEFORE appending the new turn
    const contents = buildContents(chat, text, atts, settings.personality);

    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== targetId) return c;
        const isFirstUser = c.messages.filter((m) => m.role === "user").length === 0;
        return {
          ...c,
          title: isFirstUser ? (text || atts[0]?.name || "New chat").slice(0, 48) : c.title,
          // Pin the model so the conversation keeps it even if the default changes.
          modelId: c.modelId ?? chatSelection,
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
        const isFollowUp = isImageEditFollowUp(text, Boolean(imageContext));
        const referenceAttachment =
          isFollowUp && imageContext ? dataUrlToAttachment(imageContext.imageDataUrl) : null;
        const imagePrompt =
          isFollowUp && imageContext ? buildImageFollowUpPrompt(text, imageContext) : text;
        const imageAttachments = referenceAttachment ? [referenceAttachment, ...atts] : atts;
        const { image, caption } = await generateImage(
          apiModel,
          imagePrompt,
          imageAttachments,
          ctrl.signal,
        );
        updateMessage(targetId, aiMsg.id, { pending: false, image, content: caption || "" });
        if (caption) speakSilviaReply(caption);
      } else {
        const full = await streamReplyWithFallback(
          modelId,
          contents,
          targetId,
          aiMsg.id,
          ctrl.signal,
        );
        if (!full) {
          updateMessage(targetId, aiMsg.id, {
            content: "_(No response generated.)_",
            pending: false,
          });
        } else {
          speakSilviaReply(full);
        }
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") {
        updateMessage(targetId, aiMsg.id, (m) => ({
          pending: false,
          content: `${m.content || ""}\n\n_Stopped._`,
        }));
      } else {
        updateMessage(targetId, aiMsg.id, {
          pending: false,
          error: true,
          content: `**Warning:** ${e.message || "Something went wrong."}`,
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
    visibleChats,
    activeId,
    defaultModel,
    settings.personality,
    user,
    setChats,
    showToast,
    scrollToBottom,
    updateMessage,
    streamReplyWithFallback,
    speakSilviaReply,
  ]);

  const regenerateLastResponse = useCallback(async () => {
    if (streaming || !activeChat) return;

    const userIndex = [...activeChat.messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(({ message }) => message.role === "user")?.index;
    if (userIndex === undefined) {
      showToast("Send a message before regenerating", true);
      return;
    }

    const userTurn = activeChat.messages[userIndex];
    const text = userTurn.content.trim();
    const atts = userTurn.attachments ?? [];
    if (!text && !atts.length) return;
    if (!hasApiKey()) {
      showToast("Add your Gemini API key in .env (VITE_GEMINI_API_KEY)", true);
    }

    const targetId = activeChat.id;
    const historyMessages = activeChat.messages.slice(0, userIndex);
    const imageContext = recentGeneratedImageContext(historyMessages);
    const chatSelection: ModelId = activeChat.modelId ?? defaultModel;
    const modelId = routeModel(chatSelection, text, atts.length > 0, {
      hasRecentGeneratedImage: Boolean(imageContext),
    });
    const apiModel = MODELS[modelId].api as string;
    const aiMsg: Message = {
      id: uid(),
      role: "ai",
      content: "",
      createdAt: Date.now(),
      modelId,
      pending: true,
    };
    const contents = buildContents(
      { ...activeChat, messages: historyMessages },
      text,
      atts,
      settings.personality,
    );

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === targetId
          ? {
              ...chat,
              modelId: chat.modelId ?? chatSelection,
              messages: [...historyMessages, userTurn, aiMsg],
            }
          : chat,
      ),
    );
    setStreaming(true);
    setStreamingId(aiMsg.id);
    scrollToBottom(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      if (modelId === "image") {
        const isFollowUp = isImageEditFollowUp(text, Boolean(imageContext));
        const referenceAttachment =
          isFollowUp && imageContext ? dataUrlToAttachment(imageContext.imageDataUrl) : null;
        const imagePrompt =
          isFollowUp && imageContext ? buildImageFollowUpPrompt(text, imageContext) : text;
        const imageAttachments = referenceAttachment ? [referenceAttachment, ...atts] : atts;
        const { image, caption } = await generateImage(
          apiModel,
          imagePrompt,
          imageAttachments,
          ctrl.signal,
        );
        updateMessage(targetId, aiMsg.id, { pending: false, image, content: caption || "" });
        if (caption) speakSilviaReply(caption);
      } else {
        const full = await streamReplyWithFallback(
          modelId,
          contents,
          targetId,
          aiMsg.id,
          ctrl.signal,
        );
        if (!full) {
          updateMessage(targetId, aiMsg.id, {
            content: "_(No response generated.)_",
            pending: false,
          });
        } else {
          speakSilviaReply(full);
        }
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") {
        updateMessage(targetId, aiMsg.id, (m) => ({
          pending: false,
          content: `${m.content || ""}\n\n_Stopped._`,
        }));
      } else {
        updateMessage(targetId, aiMsg.id, {
          pending: false,
          error: true,
          content: `**Warning:** ${e.message || "Something went wrong."}`,
        });
      }
    } finally {
      setStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }, [
    streaming,
    activeChat,
    defaultModel,
    settings.personality,
    setChats,
    showToast,
    scrollToBottom,
    updateMessage,
    streamReplyWithFallback,
    speakSilviaReply,
  ]);

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

  /* ---- Voice Mode ---- */
  const openVoiceMode = useCallback(() => {
    let targetId = activeId;
    if (!targetId || !visibleChats.some((c) => c.id === targetId)) {
      const c = blankChat();
      setChats((prev) => [c, ...prev]);
      setActiveId(c.id);
      targetId = c.id;
    }
    window.speechSynthesis?.cancel();
    setVoiceChatId(targetId);
    setVoiceOpen(true);
  }, [activeId, visibleChats, setChats]);

  /** Persist a finished voice exchange into the normal chat history. */
  const handleVoiceTurn = useCallback(
    (turn: VoiceTurn) => {
      if (!voiceChatId) return;
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== voiceChatId) return c;
          const messages = [...c.messages];
          if (turn.userText) {
            messages.push({ id: uid(), role: "user", content: turn.userText, createdAt: turn.at });
          }
          if (turn.assistantText) {
            messages.push({ id: uid(), role: "ai", content: turn.assistantText, createdAt: turn.at });
          }
          const isFirstUser = c.messages.filter((m) => m.role === "user").length === 0;
          return {
            ...c,
            voice: true,
            title:
              isFirstUser && turn.userText ? turn.userText.slice(0, 48) : c.title,
            messages,
          };
        }),
      );
    },
    [voiceChatId, setChats],
  );

  const voiceChat = useMemo(
    () => (voiceChatId ? chats.find((c) => c.id === voiceChatId) ?? null : null),
    [voiceChatId, chats],
  );

  /* ---- sidebar ---- */
  const toggleSidebar = useCallback(() => {
    if (isMobile()) setSidebarOpen((o) => !o);
    else setSidebarCollapsed((c) => !c);
  }, []);
  const openSidebarMobile = useCallback(() => setSidebarOpen(true), []);
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
  const canRegenerate = Boolean(
    activeChat?.messages.some((message) => message.role === "user") && !streaming,
  );
  const canClearChat = Boolean(activeChat?.messages.length && !streaming);

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

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
        syncStatus={syncStatus}
        onRetrySync={retrySync}
        onClearChats={clearAllChats}
        onSignIn={() => {
          setTrialExpired(false);
          setShowAuth(true);
        }}
        onClose={() => setSettingsOpen(false)}
        avatarBase64={profileAvatar}
        onSaveName={handleSaveName}
        onSaveAvatar={handleSaveAvatar}
      />

      {voiceOpen && (
        <Suspense fallback={null}>
          <VoiceMode
            open={voiceOpen}
            chat={voiceChat}
            settings={settings}
            onUpdateSettings={updateSettings}
            onTurn={handleVoiceTurn}
            onClose={() => setVoiceOpen(false)}
          />
        </Suspense>
      )}

      <div className={appClass}>
        <Sidebar
          chats={visibleChats}
          activeId={activeId}
          syncStatus={syncStatus}
          onRetrySync={retrySync}
          onNewChat={() => {
            newChat();
            closeSidebarMobile();
          }}
          onSelectChat={(id) => {
            selectChat(id);
            closeSidebarMobile();
          }}
          onDeleteChat={deleteChat}
          onTogglePin={togglePinChat}
          onToggleTheme={toggleTheme}
          onSettings={() => {
            setSettingsOpen(true);
            closeSidebarMobile();
          }}
          onClearAll={clearAllChats}
          onSignIn={() => { setTrialExpired(false); setShowAuth(true); }}
          onClose={closeSidebarMobile}
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
            syncStatus={syncStatus}
            onSelectModel={selectModel}
            onOpenMenu={openSidebarMobile}
            onSettings={() => setSettingsOpen(true)}
            onCollapse={toggleSidebar}
            onRegenerate={regenerateLastResponse}
            onClearChat={clearActiveChat}
            canRegenerate={canRegenerate}
            canClearChat={canClearChat}
          />

          <ChatView
            ref={scrollRef}
            chat={activeChat}
            selectedModel={selectedModel}
            streamingId={streamingId}
            onPickSuggestion={pickSuggestion}
            onRegenerate={regenerateLastResponse}
          />

          <Composer
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            onStop={stopStreaming}
            streaming={streaming}
            canSend={canSend}
            attachments={attachments}
            voiceInputEnabled={settings.voiceInputEnabled}
            onVoiceInputEnabledChange={(enabled) => updateSettings({ voiceInputEnabled: enabled })}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
            onOpenVoiceMode={openVoiceMode}
          />
        </main>
      </div>

      <Toast {...toast} />
    </>
  );
}
