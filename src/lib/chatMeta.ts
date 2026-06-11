import type { Chat, Message } from "../types";

const DAY_MS = 86_400_000;
const HISTORY_GROUP_ORDER = ["Pinned", "Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"] as const;

export interface ChatHistoryGroup {
  label: string;
  chats: Chat[];
}

function localDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

function daysAgoFrom(timestamp: number): number {
  const today = new Date();
  const date = new Date(timestamp);
  return localDayNumber(today) - localDayNumber(date);
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function latestPreviewMessage(chat: Chat): Message | undefined {
  for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
    const message = chat.messages[index];
    if (message.pending) continue;
    if (compactText(message.content) || message.image || message.attachments?.length) return message;
  }
  return undefined;
}

export function lastChatActivity(chat: Chat): number {
  const lastMessage = chat.messages[chat.messages.length - 1];
  return lastMessage?.createdAt ?? chat.createdAt;
}

export function chatTurnCount(chat: Chat): number {
  return chat.messages.filter((message) => message.role === "user").length;
}

export function chatPreview(chat: Chat, maxLength = 96): string {
  const message = latestPreviewMessage(chat);
  if (!message) return "New conversation";

  const content = compactText(message.content);
  if (content) return content.slice(0, maxLength);
  if (message.image) return "Generated image";
  if (message.attachments?.length) {
    return message.attachments.length === 1 ? message.attachments[0].name : `${message.attachments.length} attachments`;
  }
  return "New conversation";
}

export function filterChats(chats: Chat[], query: string): Chat[] {
  const q = query.trim().toLowerCase();
  if (!q) return chats;
  return chats.filter((chat) => {
    const recentMessages = chat.messages.slice(-6).map((message) => message.content);
    const haystack = [chat.title, ...recentMessages, chatPreview(chat, 160)].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function formatChatDate(chat: Chat): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(lastChatActivity(chat)));
}

export function formatChatMeta(chat: Chat): string {
  const turns = chatTurnCount(chat);
  return `${turns} ${turns === 1 ? "message" : "messages"} - ${formatChatDate(chat)}`;
}

export function chatHistoryGroupLabel(chat: Chat): string {
  if (chat.pinned) return "Pinned";
  const daysAgo = daysAgoFrom(lastChatActivity(chat));
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo <= 7) return "Previous 7 days";
  if (daysAgo <= 30) return "Previous 30 days";
  return "Older";
}

export function groupChatHistory(chats: Chat[]): ChatHistoryGroup[] {
  const buckets = new Map<string, Chat[]>();
  chats
    .slice()
    .sort((a, b) => lastChatActivity(b) - lastChatActivity(a))
    .forEach((chat) => {
      const label = chatHistoryGroupLabel(chat);
      buckets.set(label, [...(buckets.get(label) ?? []), chat]);
    });

  return HISTORY_GROUP_ORDER.map((label) => ({ label, chats: buckets.get(label) ?? [] })).filter(
    (group) => group.chats.length > 0,
  );
}

export function messageDayKey(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatMessageDay(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const daysAgo = daysAgoFrom(timestamp);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: new Date().getFullYear() === date.getFullYear() ? undefined : "numeric",
  }).format(date);
}
