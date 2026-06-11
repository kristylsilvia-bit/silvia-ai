import { useLayoutEffect, useMemo, useRef } from "react";

import { enhanceContent, renderMarkdown } from "../lib/markdown";

interface MarkdownContentProps {
  content: string;
  /** While streaming we append a caret and skip code-block enhancement. */
  streaming?: boolean;
}

/**
 * Renders sanitized markdown. When not streaming, it enhances code blocks,
 * tables, and links so assistant answers feel polished and readable.
 */
export default function MarkdownContent({ content, streaming }: MarkdownContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderMarkdown(content), [content]);

  useLayoutEffect(() => {
    if (streaming || !ref.current) return;
    enhanceContent(ref.current);
  }, [html, streaming]);

  return (
    <div
      className="md"
      ref={ref}
      dangerouslySetInnerHTML={{
        __html: streaming ? `${html}<span class="cursor-blink"></span>` : html,
      }}
    />
  );
}
