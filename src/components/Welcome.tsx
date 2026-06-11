import type { ReactNode } from "react";

import type { ModelId } from "../types";
import { MODELS } from "../config/models";
import { ArrowUpRightIcon, CodeIcon, DocIcon, ImageIcon, PenIcon, SparkIcon } from "./icons";

interface Suggestion {
  ico: ReactNode;
  grad: string;
  title: string;
  desc: string;
  text: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    ico: <PenIcon />,
    grad: "linear-gradient(135deg,#F472B6,#7C5CFF)",
    title: "Draft a launch plan",
    desc: "Strategy, timeline, and next steps for Silvia AI",
    text: "Draft a launch plan for Silvia AI",
  },
  {
    ico: <CodeIcon />,
    grad: "linear-gradient(135deg,#2DD4BF,#5B8DEF)",
    title: "Explain Swift code",
    desc: "Clear teaching with examples, beginner friendly",
    text: "Explain this Swift code like I'm new to iOS",
  },
  {
    ico: <DocIcon />,
    grad: "linear-gradient(135deg,#5B8DEF,#7C5CFF)",
    title: "Write premium copy",
    desc: "A polished product description that sells",
    text: "Write a premium product description",
  },
  {
    ico: <ImageIcon />,
    grad: "linear-gradient(135deg,#FBBF24,#FF6B6B)",
    title: "Create an image",
    desc: "Generate visuals with Nano Banana 2",
    text: "Create an image of a futuristic city at golden hour",
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface WelcomeProps {
  selectedModel: ModelId;
  onPick: (text: string) => void;
}

/** Eyebrow status for the currently selected model. */
function modelStatus(selectedModel: ModelId): string {
  if (selectedModel === "auto") return "Smart model routing";
  if (selectedModel === "flash-lite") return "⚡ Fastest model selected";
  return `${MODELS[selectedModel].name} selected`;
}

export default function Welcome({ selectedModel, onPick }: WelcomeProps) {
  const model = MODELS[selectedModel];
  return (
    <div className="welcome">
      <div className="welcome-orb" aria-hidden="true">
        <span className="welcome-halo" />
        <span className="welcome-ring" />
        <div className="welcome-mark">
          <SparkIcon />
        </div>
      </div>

      <span
        className={"welcome-eyebrow" + (selectedModel === "flash-lite" ? " fastest" : "")}
        title={model.desc}
      >
        <span className="we-dot" aria-hidden="true" />
        Silvia AI &middot; {modelStatus(selectedModel)}
      </span>

      <h1>
        {greeting()}.
        <br />
        <span className="grad">How can I help you today?</span>
      </h1>
      <p>
        {selectedModel === "auto" ? (
          <>
            Ask anything &mdash; every message is routed to the best Gemini model for chat,
            vision, code, or image creation.
          </>
        ) : (
          <>
            Chatting with {model.name} &mdash; {model.desc}
          </>
        )}
      </p>

      <div className="suggest-grid">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            className="suggest-card"
            onClick={() => onPick(s.text)}
          >
            <span className="sc-ico" style={{ background: s.grad }}>
              {s.ico}
            </span>
            <span className="sc-copy">
              <span className="sc-title">{s.title}</span>
              <span className="sc-desc">{s.desc}</span>
            </span>
            <span className="sc-arrow" aria-hidden="true">
              <ArrowUpRightIcon />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
