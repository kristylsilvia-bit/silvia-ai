import type { Attachment, Chat } from "../types";

/* >>> Provide your key via .env (VITE_GEMINI_API_KEY) — see .env.example <<< */
export const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ?? "YOUR_GEMINI_API_KEY_HERE";

export const KEY_PLACEHOLDER = "YOUR_GEMINI_API_KEY_HERE";
export const hasApiKey = (): boolean =>
  Boolean(GEMINI_API_KEY) && GEMINI_API_KEY !== KEY_PLACEHOLDER;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface Part {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}
interface Content {
  role: "user" | "model";
  parts: Part[];
}

function buildParts(text: string, attachments?: Attachment[]): Part[] {
  const parts: Part[] = [];
  if (text) parts.push({ text });
  (attachments ?? []).forEach((a) => {
    parts.push({ inline_data: { mime_type: a.mime, data: a.base64 } });
  });
  return parts;
}

/** Build the conversation history (excluding pending/image rows) + the new turn. */
export function buildContents(
  chat: Chat,
  userText: string,
  attachments: Attachment[],
): Content[] {
  const contents: Content[] = [];
  chat.messages
    .filter((m) => !m.pending && !m.image && m.content)
    .forEach((m) => {
      if (m.role === "user") {
        contents.push({ role: "user", parts: buildParts(m.content, m.attachments) });
      } else if (m.role === "ai") {
        contents.push({ role: "model", parts: [{ text: m.content }] });
      }
    });
  contents.push({ role: "user", parts: buildParts(userText, attachments) });
  return contents;
}

/** Normalise Gemini error responses into friendly Error messages. */
async function apiError(res: Response): Promise<Error> {
  let detail = "";
  try {
    const j = await res.json();
    detail = j?.error?.message ?? "";
  } catch {
    /* non-JSON body */
  }
  if (res.status === 400 && /API key not valid/i.test(detail)) {
    return new Error("Invalid API key. Set a valid Gemini key in your .env (VITE_GEMINI_API_KEY).");
  }
  if (res.status === 403) {
    return new Error("Access denied (403). Check your API key and that the model is enabled.");
  }
  if (res.status === 429) {
    return new Error("Rate limit reached. Please wait a moment and try again.");
  }
  return new Error(detail || `Request failed (${res.status}).`);
}

/**
 * Stream a text generation (Flash / Pro). Calls `onChunk` with the cumulative
 * text on every server-sent delta; resolves with the full text.
 */
export async function streamGenerate(
  apiModel: string,
  contents: Content[],
  onChunk: (full: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const url = `${API_BASE}/${apiModel}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) throw await apiError(res);
  if (!res.body) throw new Error("Streaming is not supported in this browser.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const json = t.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const data = JSON.parse(json);
        const parts = data?.candidates?.[0]?.content?.parts ?? [];
        const chunk = parts.map((p: Part) => p.text ?? "").join("");
        if (chunk) {
          full += chunk;
          onChunk(full);
        }
      } catch {
        /* partial JSON across chunk boundary — ignore and wait for more */
      }
    }
  }
  return full;
}

export interface GeneratedImage {
  image: string;
  caption: string;
}

/** Generate an image via Imagen 3. Returns a data URL + empty caption. */
export async function generateImage(
  _apiModel: string,
  prompt: string,
  _attachments: Attachment[],
  signal: AbortSignal,
): Promise<GeneratedImage> {
  // Imagen 3 uses a separate v1beta endpoint with its own request/response shape.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  });
  if (!res.ok) throw await apiError(res);

  const data = await res.json();
  // Response: { predictions: [{ bytesBase64Encoded, mimeType }] }
  const pred = data?.predictions?.[0];
  if (!pred?.bytesBase64Encoded) {
    throw new Error("The model returned no image. Try rephrasing your prompt.");
  }
  const mime = pred.mimeType ?? "image/png";
  return { image: `data:${mime};base64,${pred.bytesBase64Encoded}`, caption: "" };
}
