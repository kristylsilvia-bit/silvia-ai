import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import DOMPurify from "dompurify";

// Curated language set — keeps the bundle small vs. the full highlight.js build.
// Each module also registers its common aliases (js, ts, html, sh, yml, …).
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const LANGUAGES = {
  bash,
  c,
  cpp,
  csharp,
  css,
  go,
  java,
  javascript,
  json,
  markdown,
  php,
  plaintext,
  python,
  ruby,
  rust,
  sql,
  typescript,
  xml,
  yaml,
};
for (const [name, lang] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, lang);
}

marked.setOptions({ breaks: true, gfm: true });

/** Parse markdown → sanitized HTML string. */
export function renderMarkdown(text: string): string {
  const dirty = marked.parse(text ?? "", { async: false }) as string;
  return DOMPurify.sanitize(dirty, { ADD_ATTR: ["target"] });
}

// Raw SVG strings used by the DOM-built copy button (inside enhanced markdown).
const SVG_COPY =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
const SVG_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

/**
 * Post-process rendered markdown inside `container`:
 *  - wrap each <pre><code> in a code card with a language label + copy button
 *  - syntax-highlight the code
 *  - force links to open safely in a new tab
 * Idempotent: re-running on already-enhanced nodes is a no-op.
 */
export function enhanceContent(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
    const pre = code.parentElement as HTMLElement | null;
    if (!pre || pre.dataset.enhanced) return;
    pre.dataset.enhanced = "1";

    let lang = "code";
    const langClass = [...code.classList].find((c) => c.startsWith("language-"));
    if (langClass) lang = langClass.replace("language-", "");
    try {
      hljs.highlightElement(code);
    } catch {
      /* unknown language — leave un-highlighted */
    }

    const wrap = document.createElement("div");
    wrap.className = "code-wrap";

    const head = document.createElement("div");
    head.className = "code-head";

    const label = document.createElement("span");
    label.className = "code-lang";
    label.textContent = lang === "code" ? "text" : lang;
    head.appendChild(label);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.innerHTML = `${SVG_COPY}<span>Copy</span>`;
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(code.textContent ?? "").then(() => {
        btn.classList.add("copied");
        btn.innerHTML = `${SVG_CHECK}<span>Copied</span>`;
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = `${SVG_COPY}<span>Copy</span>`;
        }, 1600);
      });
    });
    head.appendChild(btn);

    pre.replaceWith(wrap);
    wrap.appendChild(head);
    wrap.appendChild(pre);
  });

  container.querySelectorAll("a").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });
}
