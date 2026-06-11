import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";

import type { Attachment, Chat, Message, UserSettings } from "../types";
import { isModelId } from "../config/models";
import { db } from "./firebase";

/** Tombstoned chats older than this are purged locally and in Firestore. */
const TOMBSTONE_TTL_MS = 30 * 86_400_000;
/** Firestore documents max out at 1 MiB; stay well under it. */
const MAX_DOC_BYTES = 900_000;
/** Inline image payloads above this size are dropped from the cloud copy. */
const MAX_IMAGE_BYTES = 300_000;

export function isSyncAvailable(): boolean {
  return db !== null;
}

function requireDb(): Firestore {
  if (!db) throw new Error("Firestore is not configured.");
  return db;
}

function chatDocRef(uid: string, chatId: string) {
  return doc(requireDb(), "users", uid, "chats", chatId);
}

function chatsCollectionRef(uid: string) {
  return collection(requireDb(), "users", uid, "chats");
}

function settingsDocRef(uid: string) {
  return doc(requireDb(), "users", uid, "meta", "settings");
}

/* ------------------------------------------------------------------ */
/* Serialization                                                       */
/* ------------------------------------------------------------------ */

/**
 * Cloud copy of an attachment: metadata only. Raw base64 payloads are kept
 * out of Firestore (doc size limits + cost); small image thumbnails survive.
 */
function sanitizeAttachment(a: Attachment): Attachment {
  const keepThumb = a.isImage && a.dataUrl && a.dataUrl.length <= 80_000;
  return {
    id: a.id,
    name: a.name,
    size: a.size,
    mime: a.mime,
    isImage: a.isImage,
    dataUrl: keepThumb ? a.dataUrl : null,
    base64: "",
  };
}

function sanitizeMessage(m: Message): Message {
  const out: Message = {
    id: m.id,
    role: m.role,
    content: m.content,
  };
  if (m.createdAt) out.createdAt = m.createdAt;
  if (m.modelId && isModelId(m.modelId)) out.modelId = m.modelId;
  if (m.error) out.error = true;
  if (m.attachments?.length) out.attachments = m.attachments.map(sanitizeAttachment);
  if (m.image && m.image.length <= MAX_IMAGE_BYTES) out.image = m.image;
  return out;
}

/**
 * Build the Firestore representation of a chat. Pending placeholders are
 * dropped, payloads sanitized, and if the doc would still exceed Firestore's
 * size limit the oldest messages are trimmed from the cloud copy (the full
 * conversation stays in this device's local cache).
 */
export function toCloudChat(chat: Chat): Record<string, unknown> {
  let messages = chat.messages.filter((m) => !m.pending).map(sanitizeMessage);
  let approxSize = JSON.stringify(messages).length;
  while (messages.length > 2 && approxSize > MAX_DOC_BYTES) {
    messages = messages.slice(2);
    approxSize = JSON.stringify(messages).length;
  }
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt ?? chat.createdAt,
    modelId: chat.modelId && isModelId(chat.modelId) ? chat.modelId : null,
    pinned: Boolean(chat.pinned),
    deleted: Boolean(chat.deleted),
    voice: Boolean(chat.voice),
    messages: chat.deleted ? [] : messages,
  };
}

/** Parse a Firestore doc back into a Chat, tolerating malformed data. */
export function fromCloudChat(data: Record<string, unknown>, fallbackId: string): Chat | null {
  try {
    const id = typeof data.id === "string" && data.id ? data.id : fallbackId;
    const createdAt = typeof data.createdAt === "number" ? data.createdAt : Date.now();
    const chat: Chat = {
      id,
      title: typeof data.title === "string" ? data.title : "New chat",
      createdAt,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : createdAt,
      messages: Array.isArray(data.messages) ? (data.messages as Message[]) : [],
    };
    if (data.pinned === true) chat.pinned = true;
    if (data.deleted === true) chat.deleted = true;
    if (data.voice === true) chat.voice = true;
    if (isModelId(data.modelId)) chat.modelId = data.modelId;
    return chat;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Merging                                                             */
/* ------------------------------------------------------------------ */

export function chatUpdatedAt(chat: Chat): number {
  return chat.updatedAt ?? chat.createdAt;
}

/**
 * Merge remote chats into the local list with per-chat last-write-wins.
 * Local copies win ties so richer local data (full attachments, untrimmed
 * history) is never replaced by its own sanitized cloud echo.
 */
export function mergeChats(local: Chat[], remote: Chat[]): Chat[] {
  const byId = new Map<string, Chat>(local.map((c) => [c.id, c]));
  for (const rc of remote) {
    const lc = byId.get(rc.id);
    if (!lc || chatUpdatedAt(rc) > chatUpdatedAt(lc)) byId.set(rc.id, rc);
  }
  return [...byId.values()];
}

/** Drop tombstones that are old enough that every device has seen them. */
export function purgeExpiredTombstones(chats: Chat[]): Chat[] {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  return chats.filter((c) => !(c.deleted && chatUpdatedAt(c) < cutoff));
}

/* ------------------------------------------------------------------ */
/* Firestore I/O                                                       */
/* ------------------------------------------------------------------ */

/** True for chats worth a cloud round-trip (content, or a deletion to propagate). */
export function isSyncableChat(chat: Chat): boolean {
  return chat.deleted === true || chat.messages.length > 0 || chat.pinned === true;
}

export async function pushChat(uid: string, chat: Chat): Promise<void> {
  await setDoc(chatDocRef(uid, chat.id), toCloudChat(chat));
}

export async function deleteCloudChat(uid: string, chatId: string): Promise<void> {
  await deleteDoc(chatDocRef(uid, chatId));
}

export interface RemoteSnapshot {
  chats: Chat[];
  /** True when served from the local persistence layer (i.e. possibly stale). */
  fromCache: boolean;
  /** True while local writes are still waiting to reach the server. */
  hasPendingWrites: boolean;
}

export function subscribeToChats(
  uid: string,
  onChats: (snapshot: RemoteSnapshot) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    chatsCollectionRef(uid),
    { includeMetadataChanges: true },
    (snap) => {
      const chats: Chat[] = [];
      snap.forEach((docSnap) => {
        const chat = fromCloudChat(docSnap.data(), docSnap.id);
        if (chat) chats.push(chat);
      });
      onChats({
        chats,
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites,
      });
    },
    (err) => onError(err instanceof Error ? err : new Error(String(err))),
  );
}

/* ------------------------------------------------------------------ */
/* Profile sync (avatar stored as base64 Firestore doc)               */
/* ------------------------------------------------------------------ */

function profileDocRef(uid: string) {
  return doc(requireDb(), "users", uid, "meta", "profile");
}

export async function pushProfile(uid: string, avatarBase64: string | null): Promise<void> {
  await setDoc(profileDocRef(uid), { avatarBase64: avatarBase64 ?? null }, { merge: true });
}

export function subscribeToProfile(
  uid: string,
  onProfile: (data: { avatarBase64: string | null }) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    profileDocRef(uid),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { avatarBase64?: string | null };
        onProfile({ avatarBase64: data.avatarBase64 ?? null });
      } else {
        onProfile({ avatarBase64: null });
      }
    },
    (err) => onError(err instanceof Error ? err : new Error(String(err))),
  );
}

/* ------------------------------------------------------------------ */
/* Settings sync                                                       */
/* ------------------------------------------------------------------ */

export async function pushSettings(uid: string, settings: UserSettings): Promise<void> {
  await setDoc(settingsDocRef(uid), settings as unknown as Record<string, unknown>, { merge: true });
}

export function subscribeToSettings(
  uid: string,
  onSettings: (settings: Partial<UserSettings>) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    settingsDocRef(uid),
    (snap) => {
      if (snap.exists()) onSettings(snap.data() as Partial<UserSettings>);
    },
    (err) => onError(err instanceof Error ? err : new Error(String(err))),
  );
}
