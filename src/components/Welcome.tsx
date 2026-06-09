import type { ReactNode } from "react";

import { CodeIcon, DocIcon, ImageIcon, PenIcon, SparkIcon } from "./icons";

interface Suggestion {
  ico: ReactNode;
  grad: string;
  title: string;
  desc: string;
  text: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    ico: <ImageIcon />,
    grad: "linear-gradient(135deg,#FBBF24,#FF6B6B)",
    title: "Draft a launch plan for Silvia AI",
    desc: "Strategy, timeline, and next steps",
    text: "Draft a launch plan for Silvia AI",
  },
  {
    ico: <DocIcon />,
    grad: "linear-gradient(135deg,#5B8DEF,#7C5CFF)",
    title: "Explain this Swift code like I'm new to iOS",
    desc: "Clear teaching with examples",
    text: "Explain this Swift code like I'm new to iOS",
  },
  {
    ico: <CodeIcon />,
    grad: "linear-gradient(135deg,#2DD4BF,#5B8DEF)",
    title: "Write a premium product description",
    desc: "Polished copy for a refined product",
    text: "Write a premium product description",
  },
  {
    ico: <PenIcon />,
    grad: "linear-gradient(135deg,#F472B6,#7C5CFF)",
    title: "Help me debug a Gemini API error",
    desc: "Diagnose the issue step by step",
    text: "Help me debug a Gemini API error",
  },
];

interface WelcomeProps {
  onPick: (text: string) => void;
}

export default function Welcome({ onPick }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="welcome-mark">
        <SparkIcon />
      </div>
      <h1>
        Welcome to <span className="grad">Silvia AI</span>
      </h1>
      <p>A fast, polished Gemini chat studio for ideas, code, writing, and deep reasoning.</p>
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
            <span>
              <span className="sc-title">{s.title}</span>
              <span className="sc-desc">{s.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
