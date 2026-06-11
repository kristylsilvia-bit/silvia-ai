import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { ModelId } from "../types";
import { MODELS, MODEL_ORDER } from "../config/models";
import { CheckIcon, ChevronDownIcon, CpuIcon, RefreshIcon, TrashIcon } from "./icons";

interface ModelSelectorProps {
  selected: ModelId;
  onSelect: (id: ModelId) => void;
  onRegenerate: () => void;
  onClearChat: () => void;
  canRegenerate: boolean;
  canClearChat: boolean;
}

export default function ModelSelector({
  selected,
  onSelect,
  onRegenerate,
  onClearChat,
  canRegenerate,
  canClearChat,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Partial<Record<ModelId, HTMLButtonElement | null>>>({});
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = MODELS[selected];
  const selectedIndex = MODEL_ORDER.indexOf(selected);

  const focusOption = (id: ModelId) => {
    window.requestAnimationFrame(() => optionRefs.current[id]?.focus());
  };

  const openMenu = () => {
    setOpen(true);
    focusOption(selected);
  };

  const selectModel = (id: ModelId) => {
    onSelect(id);
    setOpen(false);
  };

  const runMenuAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  const focusByOffset = (offset: number) => {
    const activeId = MODEL_ORDER.find((id) => optionRefs.current[id] === document.activeElement);
    const startIndex = activeId ? MODEL_ORDER.indexOf(activeId) : selectedIndex;
    const nextIndex = (startIndex + offset + MODEL_ORDER.length) % MODEL_ORDER.length;
    focusOption(MODEL_ORDER[nextIndex]);
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      focusOption(MODEL_ORDER[(selectedIndex - 1 + MODEL_ORDER.length) % MODEL_ORDER.length]);
    }
  };

  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, id: ModelId) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusByOffset(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusByOffset(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(MODEL_ORDER[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(MODEL_ORDER[MODEL_ORDER.length - 1]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectModel(id);
    }
  };

  return (
    <div className={"model-select" + (open ? " open" : "")} ref={ref}>
      <button
        type="button"
        className="model-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onKeyDown={handleTriggerKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
        }}
      >
        <CpuIcon className="cpu-icon" />
        <span className="dot" style={{ background: current.color }} />
        <span className="model-label-full">{current.label}</span>
        <span className="model-label-short">{current.short}</span>
        {selected === "auto" && <span className="auto-pill">Smart</span>}
        {selected === "flash-lite" && <span className="auto-pill fastest">Fastest</span>}
        <ChevronDownIcon className="chev" />
      </button>

      <div
        id={menuId}
        className="model-menu"
        role="dialog"
        aria-label="Model routing and chat actions"
        aria-hidden={!open}
      >
        <div className="model-menu-hero">
          <span className="model-menu-orb" style={{ color: current.color }}>
            <CpuIcon />
          </span>
          <span className="model-menu-copy">
            <strong>{selected === "auto" ? "Smart routing" : current.name}</strong>
            <small>{current.desc}</small>
          </span>
        </div>
        <div className="model-menu-head">
          <span>Choose model</span>
          <span>{selected === "auto" ? "Recommended" : current.badge}</span>
        </div>
        <div className="model-options" role="listbox" aria-label="Choose model">
          {MODEL_ORDER.map((id) => {
            const m = MODELS[id];
            const isSelected = m.id === selected;
            return (
              <button
                key={m.id}
                id={`${menuId}-${m.id}`}
                ref={(button) => {
                  optionRefs.current[m.id] = button;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={`${m.name}. ${m.speed}. ${m.desc}`}
                title={`${m.name} — ${m.desc}`}
                tabIndex={open ? 0 : -1}
                className={"model-opt" + (isSelected ? " selected" : "")}
                onKeyDown={(event) => handleOptionKeyDown(event, m.id)}
                onClick={() => {
                  selectModel(m.id);
                }}
              >
                <span className="mo-dot" style={{ background: m.color, color: m.color }} />
                <span className="mo-body">
                  <span className="mo-name">
                    {m.name}
                    <span className={"mo-badge" + (m.badge === "Fastest" ? " fastest" : "")}>
                      {m.badge}
                    </span>
                    {m.speed !== m.badge && (
                      <span className={"speed-pill" + (m.speed === "Fastest" ? " fastest" : "")}>
                        {m.speed}
                      </span>
                    )}
                  </span>
                  <span className="mo-desc">{m.desc}</span>
                </span>
                <span className="mo-check-wrap" aria-hidden="true">
                  {isSelected && <CheckIcon className="mo-check" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="model-actions" aria-label="Chat actions">
          <button
            type="button"
            className="model-action"
            disabled={!canRegenerate}
            onClick={() => runMenuAction(onRegenerate)}
          >
            <RefreshIcon />
            <span>
              <strong>Regenerate response</strong>
              <small>Ask Silvia AI to try the last answer again</small>
            </span>
          </button>
          <button
            type="button"
            className="model-action danger"
            disabled={!canClearChat}
            onClick={() => runMenuAction(onClearChat)}
          >
            <TrashIcon />
            <span>
              <strong>Clear chat</strong>
              <small>Remove messages from this conversation</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
