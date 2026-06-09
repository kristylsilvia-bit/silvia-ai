/** Short, collision-unlikely id for chats/messages/attachments. */
export const uid = (): string => Math.random().toString(36).slice(2, 10);

/** Human-readable byte size, e.g. "1.4 KB". */
export function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Matches the 860px breakpoint used throughout the stylesheet. */
export const isMobile = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
