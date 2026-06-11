import type { ModelId, SyncStatus } from "../types";
import { MODELS } from "../config/models";
import { SYNC_LABEL } from "./SyncStatusChip";
import ModelSelector from "./ModelSelector";
import { CollapseIcon, GearIcon, MenuIcon, SparkIcon } from "./icons";

interface TopBarProps {
  title: string;
  selectedModel: ModelId;
  syncStatus: SyncStatus;
  onSelectModel: (id: ModelId) => void;
  /** Opens the mobile navigation drawer (chat history sidebar). */
  onOpenMenu: () => void;
  onSettings: () => void;
  onCollapse: () => void;
  onRegenerate: () => void;
  onClearChat: () => void;
  canRegenerate: boolean;
  canClearChat: boolean;
}

export default function TopBar({
  title,
  selectedModel,
  syncStatus,
  onSelectModel,
  onOpenMenu,
  onSettings,
  onCollapse,
  onRegenerate,
  onClearChat,
  canRegenerate,
  canClearChat,
}: TopBarProps) {
  const sub =
    selectedModel === "auto" ? "Smart routing active" : `${MODELS[selectedModel].name} selected`;
  const mobileStatus = syncStatus === "local" ? "Online" : SYNC_LABEL[syncStatus];

  return (
    <header className="topbar">
      <button
        className="icon-btn mobile-menu-btn"
        type="button"
        aria-label="Open menu and chat history"
        onClick={onOpenMenu}
      >
        <MenuIcon />
      </button>

      <div className="mobile-brand" aria-hidden="false">
        <span className="mobile-brand-mark">
          <SparkIcon />
        </span>
        <span className="mobile-brand-copy">
          <span>Silvia AI</span>
          <span className={"mobile-brand-status sync-" + syncStatus}>
            <span className="status-dot" />
            {mobileStatus}
          </span>
        </span>
      </div>

      <button
        className="icon-btn desktop-collapse"
        aria-label="Toggle sidebar"
        onClick={onCollapse}
      >
        <CollapseIcon />
      </button>
      <div className="topbar-title">
        {title}
        <span className="sub">{sub}</span>
      </div>

      <ModelSelector
        selected={selectedModel}
        onSelect={onSelectModel}
        onRegenerate={onRegenerate}
        onClearChat={onClearChat}
        canRegenerate={canRegenerate}
        canClearChat={canClearChat}
      />

      <button className="icon-btn menu-btn" aria-label="Settings" onClick={onSettings}>
        <MenuIcon className="desktop-menu-icon" />
        <GearIcon className="mobile-gear-icon" />
      </button>
    </header>
  );
}
