import type { ModelId } from "../types";
import { MODELS } from "../config/models";
import ModelSelector from "./ModelSelector";
import { CollapseIcon, MenuIcon, SparkIcon } from "./icons";

interface TopBarProps {
  title: string;
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
  onMenu: () => void;
  onCollapse: () => void;
}

export default function TopBar({
  title,
  selectedModel,
  onSelectModel,
  onMenu,
  onCollapse,
}: TopBarProps) {
  const sub =
    selectedModel === "auto" ? "Smart routing active" : `${MODELS[selectedModel].name} selected`;

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" aria-label="Menu" onClick={onMenu}>
        <MenuIcon />
      </button>
      <div className="mobile-brand" aria-hidden="true">
        <span className="mobile-brand-mark">
          <SparkIcon />
        </span>
        <span className="mobile-brand-copy">
          <span>Silvia AI</span>
          <span className="mobile-brand-status">
            <span className="status-dot" />
            Online
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

      <ModelSelector selected={selectedModel} onSelect={onSelectModel} />
    </header>
  );
}
