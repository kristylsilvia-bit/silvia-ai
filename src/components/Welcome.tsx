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
    title: "Generate an image",
    desc: "“A neon koi pond at dusk, cinematic”",
    text: "Generate an image of a neon koi pond at dusk, cinematic lighting",
  },
  {
    ico: <DocIcon />,
    grad: "linear-gradient(135deg,#5B8DEF,#7C5CFF)",
    title: "Analyse a document",
    desc: "Attach a PDF and ask for a summary",
    text: "Summarise the key points of the attached document.",
  },
  {
    ico: <CodeIcon />,
    grad: "linear-gradient(135deg,#2DD4BF,#5B8DEF)",
    title: "Write some code",
    desc: "“A debounce hook in TypeScript”",
    text: "Write a reusable debounce hook in TypeScript with an example.",
  },
  {
    ico: <PenIcon />,
    grad: "linear-gradient(135deg,#F472B6,#7C5CFF)",
    title: "Draft & rewrite",
    desc: "Emails, posts, anything",
    text: "Draft a warm, concise launch announcement for a new AI product.",
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
        How can I help, <span className="grad">today</span>?
      </h1>
      <p>
        Chat, analyse documents and images, write code, or generate visuals — Silvia routes every
        message to the right Gemini model automatically.
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
