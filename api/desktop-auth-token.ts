/**
 * Vercel serverless function: exchanges a Firebase ID token (from the web
 * Google sign-in) for a Firebase custom token that the Tauri desktop app
 * can use with signInWithCustomToken.
 *
 * Environment variables (set in Vercel project settings):
 *   FIREBASE_SERVICE_ACCOUNT_JSON — full service account JSON as a single-line string
 *     (Firebase Console → Project Settings → Service accounts → Generate new private key)
 */
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function adminApp() {
  if (getApps().length) return getApps()[0]!;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is not set.");
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const { idToken } = (req.body ?? {}) as { idToken?: unknown };
  if (!idToken || typeof idToken !== "string") {
    res.status(400).json({ error: "Missing or invalid idToken." });
    return;
  }

  try {
    const auth = getAuth(adminApp());
    const decoded = await auth.verifyIdToken(idToken);
    const customToken = await auth.createCustomToken(decoded.uid);
    res.status(200).json({ customToken });
  } catch (err) {
    console.error("desktop-auth-token:", err);
    res.status(401).json({ error: "Token verification failed." });
  }
}
