import { useEffect, useRef, useState } from "react";

import type { ModelId } from "../types";
import { MODELS, MODEL_ORDER } from "../config/models";
import { CheckIcon, ChevronDownIcon } from "./icons";

interface ModelSelectorProps {
  selected: ModelId;
  onSelect: (id: ModelId) => void;
}

export default function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  const current = MODELS[selected];

  return (
    <div className={"model-select" + (open ? " open" : "")} ref={ref}>
      <button
        className="model-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="dot" style={{ background: current.color }} />
        <span>{current.label}</span>
        {selected === "auto" && <span className="auto-pill">Smart</span>}
        <ChevronDownIcon className="chev" />
      </button>

      <div className="model-menu">
        <div className="model-menu-head">Model routing</div>
        <div>
          {MODEL_ORDER.map((id) => {
            const m = MODELS[id];
            return (
              <div
                key={m.id}
                className={"model-opt" + (m.id === selected ? " selected" : "")}
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
              >
                <span className="mo-dot" style={{ background: m.color }} />
                <span className="mo-body">
                  <span className="mo-name">
                    {m.name}
                    <span className="badge">{m.badge}</span>
                  </span>
                  <span className="mo-desc">{m.desc}</span>
                </span>
                <CheckIcon className="mo-check" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
