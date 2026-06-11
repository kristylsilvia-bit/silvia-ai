/**
 * Vercel serverless function: mints short-lived ephemeral tokens for the
 * Gemini Live API so the real GEMINI_API_KEY never reaches the browser.
 *
 * Environment variables (set in Vercel project settings):
 *   GEMINI_API_KEY - server-side Gemini API key (required)
 */
import { GoogleGenAI } from "@google/genai";

const LIVE_MODEL = "gemini-3.1-flash-live-preview";

interface TokenRequest {
  method?: string;
}

interface TokenResponse {
  status: (code: number) => TokenResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

export default async function handler(req: TokenRequest, res: TokenResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "GEMINI_API_KEY is not configured. Add it to your Vercel environment variables (Settings > Environment Variables).",
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        // The token may start one session within 2 minutes; the session
        // itself can then run for up to 30 minutes.
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LIVE_MODEL,
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    res.status(200).json({ token: token.name });
  } catch (err) {
    console.error("live-token: failed to mint ephemeral token", err);
    res.status(502).json({ error: "Could not create a voice session token. Try again." });
  }
}
