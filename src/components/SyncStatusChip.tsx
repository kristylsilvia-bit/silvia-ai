import type { SyncStatus } from "../types";
import { CloudCheckIcon, CloudOffIcon, CloudSyncIcon, ErrorIcon } from "./icons";

// eslint-disable-next-line react-refresh/only-export-components
export const SYNC_LABEL: Record<SyncStatus, string> = {
  local: "On this device",
  syncing: "Syncing",
  synced: "Synced",
  offline: "Offline",
  error: "Sync error",
};

const SYNC_DETAIL: Record<SyncStatus, string> = {
  local: "Chats are stored locally. Sign in to sync across devices.",
  syncing: "Saving your chats to the cloud…",
  synced: "Your chats are up to date on all devices.",
  offline: "You're offline. Changes will sync when you reconnect.",
  error: "Cloud sync failed. Tap to retry.",
};

interface SyncStatusChipProps {
  status: SyncStatus;
  onRetry?: () => void;
}

/** Small cloud-sync indicator: Synced / Syncing / Offline / Sync error. */
export default function SyncStatusChip({ status, onRetry }: SyncStatusChipProps) {
  const icon =
    status === "synced" ? (
      <CloudCheckIcon />
    ) : status === "syncing" ? (
      <CloudSyncIcon className="sync-spin" />
    ) : status === "error" ? (
      <ErrorIcon />
    ) : (
      <CloudOffIcon />
    );

  return (
    <button
      type="button"
      className={"sync-chip status-" + status}
      title={SYNC_DETAIL[status]}
      aria-label={`Sync status: ${SYNC_LABEL[status]}. ${SYNC_DETAIL[status]}`}
      onClick={status === "error" ? onRetry : undefined}
      disabled={status !== "error"}
    >
      {icon}
      <span>{SYNC_LABEL[status]}</span>
    </button>
  );
}
