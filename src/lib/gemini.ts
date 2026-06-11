import type { Attachment, Chat } from "../types";

/* >>> Provide your key via .env (VITE_GEMINI_API_KEY); see .env.example <<< */
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
  systemPrompt = "",
): Content[] {
  const contents: Content[] = [];
  const prompt = systemPrompt.trim();
  if (prompt) {
    contents.push({ role: "user", parts: [{ text: prompt }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will respond as Silvia AI." }] });
  }
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

/**
 * True when an error means the requested model id is not served by the API
 * (unknown/retired model, or not enabled for this key) - i.e. retrying with a
 * fallback model can succeed.
 */
export function isModelUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /\bis not found\b|\bnot found for api\b|\bunknown (?:model|name)\b|\bmodel is (?:unavailable|not supported)\b|\bunsupported model\b/i.test(
    err.message,
  );
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
        /* Partial JSON across chunk boundary: ignore and wait for more. */
      }
    }
  }
  return full;
}

export interface GeneratedImage {
  image: string;
  caption: string;
}

/** Generate an image (gemini-3.1-flash-image). Returns a data URL + optional caption. */
export async function generateImage(
  apiModel: string,
  prompt: string,
  attachments: Attachment[],
  signal: AbortSignal,
): Promise<GeneratedImage> {
  const url = `${API_BASE}/${apiModel}:generateContent?key=${GEMINI_API_KEY}`;
  const imagePrompt = [
    "Create the image requested by the user. Return the generated image plus, only if helpful, a short caption.",
    "Do not respond with instructions for another image generator.",
    "",
    `User request: ${prompt.trim()}`,
  ].join("\n");
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: buildParts(imagePrompt, attachments) }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!res.ok) throw await apiError(res);

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  let image: string | null = null;
  let caption = "";
  for (const p of parts) {
    const inl = p.inlineData ?? p.inline_data;
    if (inl?.data) {
      const mime = inl.mimeType ?? inl.mime_type ?? "image/png";
      image = `data:${mime};base64,${inl.data}`;
    }
    if (p.text) caption += p.text;
  }
  if (!image) throw new Error("The model returned no image. Try rephrasing your prompt.");
  return { image, caption };
}
