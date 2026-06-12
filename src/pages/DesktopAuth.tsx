import { useEffect, useState } from "react";
import { signInWithPopup, getIdToken } from "firebase/auth";

import { auth, googleProvider } from "../lib/firebase";
import Aurora from "../components/Aurora";
import { SparkIcon } from "../components/icons";

type Phase = "working" | "done" | "error";

export default function DesktopAuth() {
  const [phase, setPhase] = useState<Phase>("working");
  const [err, setErr] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        if (!auth) throw new Error("Firebase is not configured for this deployment.");

        const cred = await signInWithPopup(auth, googleProvider);
        const idToken = await getIdToken(cred.user);

        const res = await fetch("/api/desktop-auth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(body || `Server error ${res.status}`);
        }

        const { customToken } = (await res.json()) as { customToken: string };
        setPhase("done");

        // Hand the custom token back to the desktop app via deep link
        window.location.href = `silviaai://auth?token=${encodeURIComponent(customToken)}`;
      } catch (e) {
        setErr((e as Error).message ?? "Something went wrong.");
        setPhase("error");
      }
    })();
  }, []);

  return (
    <div className="dauth-page">
      <Aurora />
      <div className="dauth-card">
        <div className="dauth-logo">
          <span className="dauth-mark">
            <SparkIcon />
          </span>
          <span>
            <strong>Silvia AI</strong>
            <small>Desktop sign-in</small>
          </span>
        </div>

        {phase === "working" && (
          <div className="dauth-body">
            <div className="dauth-spinner" />
            <p className="dauth-msg">Completing Google sign-in…</p>
            <small className="dauth-hint">
              A sign-in popup should appear. If it was blocked, allow pop-ups for this site and reload.
            </small>
          </div>
        )}

        {phase === "done" && (
          <div className="dauth-body">
            <p className="dauth-msg dauth-success">✓ Signed in successfully.</p>
            <small className="dauth-hint">You can close this tab and return to Silvia AI.</small>
          </div>
        )}

        {phase === "error" && (
          <div className="dauth-body">
            <p className="dauth-msg dauth-err">{err}</p>
            <button className="dauth-retry" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
