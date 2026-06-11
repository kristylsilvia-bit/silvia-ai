import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { Chat, SyncStatus, UserSettings } from "../types";
import type { User } from "../lib/firebase";
import {
  chatUpdatedAt,
  deleteCloudChat,
  isSyncAvailable,
  isSyncableChat,
  mergeChats,
  purgeExpiredTombstones,
  pushChat,
  pushSettings,
  subscribeToChats,
  subscribeToSettings,
} from "../lib/chatSync";
import {
  loadChats,
  loadSettings,
  normalizeSettings,
  saveChats,
  saveSettings,
} from "../lib/storage";

const PUSH_DEBOUNCE_MS = 900;
const TOMBSTONE_TTL_MS = 30 * 86_400_000;

interface SyncedChats {
  chats: Chat[];
  /**
   * Drop-in replacement for React's setState. Any chat whose object identity
   * changes is stamped with a fresh `updatedAt`, which is what drives both
   * cloud pushes and cross-device conflict resolution.
   */
  setChats: Dispatch<SetStateAction<Chat[]>>;
  syncStatus: SyncStatus;
  /** Forces a re-push of everything dirty (e.g. from a "retry" button). */
  retrySync: () => void;
}

/**
 * Owns the chat list. Signed out: localStorage only. Signed in: localStorage
 * stays a local cache while Firestore (users/{uid}/chats) is the source of
 * truth, with realtime listeners and per-chat last-write-wins merging.
 */
export function useSyncedChats(user: User | null, authLoading: boolean, streaming: boolean): SyncedChats {
  const [chats, setChatsState] = useState<Chat[]>(() => purgeExpiredTombstones(loadChats(null)));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");

  /** Guards remote-applied updates from being re-stamped as local edits. */
  const applyingRemote = useRef(false);
  /** updatedAt of the newest version of each chat known to be on the server. */
  const serverVersion = useRef(new Map<string, number>());
  /** Pushes wait until the first snapshot has seeded serverVersion. */
  const pushReady = useRef(false);
  const purgedTombstones = useRef(false);
  const uidRef = useRef<string | null>(null);
  const chatsRef = useRef(chats);
  const pushTimer = useRef<number | undefined>(undefined);
  chatsRef.current = chats;

  const setChats = useCallback<Dispatch<SetStateAction<Chat[]>>>((action) => {
    setChatsState((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      if (next === prev || applyingRemote.current) return next;
      const now = Date.now();
      const prevById = new Map(prev.map((c) => [c.id, c]));
      return next.map((c) => (prevById.get(c.id) === c ? c : { ...c, updatedAt: now }));
    });
  }, []);

  const flushDirtyChats = useCallback(() => {
    const uid = uidRef.current;
    if (!uid || !isSyncAvailable() || !pushReady.current) return;
    for (const chat of chatsRef.current) {
      if (!isSyncableChat(chat)) continue;
      const version = chatUpdatedAt(chat);
      if (version <= (serverVersion.current.get(chat.id) ?? 0)) continue;
      // Record optimistically: Firestore queues the write durably even when
      // offline, and the metadata listener reports real delivery status.
      serverVersion.current.set(chat.id, version);
      setSyncStatus((s) => (s === "offline" ? s : "syncing"));
      pushChat(uid, chat).catch((err) => {
        console.error("Silvia AI sync: failed to push chat", err);
        serverVersion.current.delete(chat.id);
        setSyncStatus(navigator.onLine ? "error" : "offline");
      });
    }
  }, []);

  /* ---- auth transitions: reload local cache, merge guest chats, subscribe ---- */
  useEffect(() => {
    if (authLoading) return;
    const uid = user?.uid ?? null;
    uidRef.current = uid;
    serverVersion.current = new Map();
    pushReady.current = false;
    purgedTombstones.current = false;

    if (!uid) {
      applyingRemote.current = true;
      setChatsState(purgeExpiredTombstones(loadChats(null)));
      applyingRemote.current = false;
      setSyncStatus("local");
      return;
    }

    // Instant paint from this device's cache for the account, then merge in
    // guest chats so nothing typed before signing in is ever lost.
    const cached = purgeExpiredTombstones(loadChats(uid));
    const guestChats = purgeExpiredTombstones(loadChats(null)).filter(
      (c) => c.messages.length > 0 || c.deleted,
    );
    applyingRemote.current = true;
    setChatsState(mergeChats(cached, guestChats));
    applyingRemote.current = false;

    if (!isSyncAvailable()) {
      setSyncStatus("local");
      return;
    }
    setSyncStatus(navigator.onLine ? "syncing" : "offline");

    const unsubscribe = subscribeToChats(
      uid,
      (snapshot) => {
        applyingRemote.current = true;
        setChatsState((prev) => purgeExpiredTombstones(mergeChats(prev, snapshot.chats)));
        applyingRemote.current = false;

        for (const remote of snapshot.chats) {
          const known = serverVersion.current.get(remote.id) ?? 0;
          if (chatUpdatedAt(remote) > known) serverVersion.current.set(remote.id, chatUpdatedAt(remote));
        }
        if (!pushReady.current) {
          pushReady.current = true;
          flushDirtyChats();
        }

        if (snapshot.hasPendingWrites) setSyncStatus("syncing");
        else if (!snapshot.fromCache) setSyncStatus("synced");
        else setSyncStatus(navigator.onLine ? "syncing" : "offline");

        // Garbage-collect tombstones every device has had a month to observe.
        if (!snapshot.fromCache && !purgedTombstones.current) {
          purgedTombstones.current = true;
          const cutoff = Date.now() - TOMBSTONE_TTL_MS;
          snapshot.chats
            .filter((c) => c.deleted && chatUpdatedAt(c) < cutoff)
            .forEach((c) => void deleteCloudChat(uid, c.id).catch(() => undefined));
        }
      },
      (err) => {
        console.error("Silvia AI sync: chat listener failed", err);
        setSyncStatus(navigator.onLine ? "error" : "offline");
      },
    );
    return unsubscribe;
  }, [user, authLoading, flushDirtyChats]);

  /* ---- persistence: local cache always, cloud push debounced ---- */
  useEffect(() => {
    if (streaming) return;
    saveChats(chats, uidRef.current);
    if (!uidRef.current || !isSyncAvailable()) return;
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(flushDirtyChats, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(pushTimer.current);
  }, [chats, streaming, flushDirtyChats]);

  /* ---- connectivity transitions ---- */
  useEffect(() => {
    const synced = () => Boolean(uidRef.current) && isSyncAvailable();
    const onOnline = () => {
      if (!synced()) return;
      setSyncStatus("syncing");
      flushDirtyChats();
    };
    const onOffline = () => {
      if (synced()) setSyncStatus("offline");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flushDirtyChats]);

  const retrySync = useCallback(() => {
    if (!uidRef.current || !isSyncAvailable()) return;
    setSyncStatus("syncing");
    serverVersion.current = new Map();
    pushReady.current = true;
    flushDirtyChats();
  }, [flushDirtyChats]);

  return { chats, setChats, syncStatus, retrySync };
}

interface SyncedSettings {
  settings: UserSettings;
  /** Merge a partial change in; stamps `updatedAt` and schedules a cloud push. */
  updateSettings: (patch: Partial<UserSettings>) => void;
}

/**
 * User preferences (default model, voice, personality, toggles). Stored
 * locally for everyone; mirrored to users/{uid}/meta/settings when signed in,
 * with updatedAt-based last-write-wins across devices.
 */
export function useSyncedSettings(user: User | null, authLoading: boolean): SyncedSettings {
  const [settings, setSettingsState] = useState<UserSettings>(loadSettings);
  const applyingRemote = useRef(false);
  const uidRef = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  const pushTimer = useRef<number | undefined>(undefined);
  settingsRef.current = settings;

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  /* persist locally + push to cloud (debounced) */
  useEffect(() => {
    saveSettings(settings);
    if (applyingRemote.current || !uidRef.current || !isSyncAvailable()) return;
    if (!settings.updatedAt) return;
    window.clearTimeout(pushTimer.current);
    const uid = uidRef.current;
    pushTimer.current = window.setTimeout(() => {
      pushSettings(uid, settingsRef.current).catch((err) =>
        console.error("Silvia AI sync: failed to push settings", err),
      );
    }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(pushTimer.current);
  }, [settings]);

  useEffect(() => {
    if (authLoading) return;
    const uid = user?.uid ?? null;
    uidRef.current = uid;
    if (!uid || !isSyncAvailable()) return;

    const unsubscribe = subscribeToSettings(
      uid,
      (remote) => {
        const local = settingsRef.current;
        const remoteUpdatedAt = typeof remote.updatedAt === "number" ? remote.updatedAt : 0;
        if (remoteUpdatedAt > local.updatedAt) {
          applyingRemote.current = true;
          setSettingsState(normalizeSettings(remote, local));
          // Release after React commits the update (and the persist effect ran).
          window.setTimeout(() => {
            applyingRemote.current = false;
          }, 0);
        } else if (local.updatedAt > remoteUpdatedAt) {
          pushSettings(uid, local).catch(() => undefined);
        }
      },
      (err) => console.error("Silvia AI sync: settings listener failed", err),
    );
    return unsubscribe;
  }, [user, authLoading]);

  return { settings, updateSettings };
}
