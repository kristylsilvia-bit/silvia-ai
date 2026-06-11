import { useEffect, useState } from "react";

import { signInEmail, signInWithGoogle, signUpEmail, resetPassword } from "../lib/firebase";
import { CheckIcon, SparkIcon, XIcon } from "./icons";

type Mode = "signin" | "signup" | "reset";

interface Props {
  /** If set, show the "free chats used up" banner instead of the plain sign-in screen. */
  trialExpired?: boolean;
  onClose?: () => void;
}

export default function AuthScreen({ trialExpired, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!onClose || trialExpired) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, trialExpired]);

  const handle = async () => {
    setError("");
    setInfo("");
    if (!email) {
      setError("Enter your email.");
      return;
    }
    if (mode !== "reset" && !password) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        await signInEmail(email, password);
      } else if (mode === "signup") {
        await signUpEmail(email, password);
      } else {
        await resetPassword(email);
        setInfo("Password reset email sent - check your inbox.");
        return;
      }
      onClose?.();
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Something went wrong.";
      setError(friendlyError(msg));
    } finally {
      setBusy(false);
    }
  };

  const setAuthMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setInfo("");
  };

  const handleGoogle = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose?.();
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Something went wrong.";
      setError(friendlyError(msg));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password";
  const subtitle =
    mode === "reset"
      ? "Enter your email and Silvia AI will send a reset link."
      : trialExpired
        ? "Sign in to keep your chats, settings, and generated images moving with you."
        : "Keep your Silvia AI workspace synced across devices.";
  const submitLabel =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email";

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <section className="auth-card">
        {onClose && !trialExpired && (
          <button className="auth-close" type="button" aria-label="Close sign in" onClick={onClose}>
            <XIcon />
          </button>
        )}

        <div className="auth-logo">
          <span className="auth-mark">
            <SparkIcon />
          </span>
          <span>
            <strong>Silvia AI</strong>
            <small>Premium Gemini chat studio</small>
          </span>
        </div>

        {trialExpired && (
          <div className="auth-trial-banner">
            Your 5 free chats are up - sign in to keep going
          </div>
        )}

        <div className="auth-copy">
          <h2 className="auth-title" id="auth-title">{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="auth-benefits" aria-label="Account benefits">
          <span><CheckIcon /> Synced chats</span>
          <span><CheckIcon /> Smart routing</span>
          <span><CheckIcon /> Image tools</span>
        </div>

        {mode !== "reset" && (
          <div className="auth-mode-tabs" role="tablist" aria-label="Account mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={mode === "signin" ? "active" : ""}
              onClick={() => setAuthMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "active" : ""}
              onClick={() => setAuthMode("signup")}
            >
              Create
            </button>
          </div>
        )}

        <form
          className="auth-form"
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            void handle();
          }}
        >
          {mode !== "reset" && (
            <button className="auth-google-btn" type="button" onClick={handleGoogle} disabled={busy}>
              <GoogleIcon />
              Continue with Google
            </button>
          )}

          {mode !== "reset" && <div className="auth-divider"><span>or</span></div>}

          <label className="auth-field">
            <span>Email</span>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          {mode !== "reset" && (
            <label className="auth-field">
              <span>Password</span>
              <input
                className="auth-input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
              />
              {mode === "signup" && <em className="auth-field-note">Use at least 6 characters.</em>}
            </label>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}
          {info && <p className="auth-info" role="status">{info}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy && <span className="auth-submit-spinner" aria-hidden="true" />}
            {busy ? "Please wait" : submitLabel}
          </button>
        </form>

        <p className="auth-security-note">
          Your chats and settings stay with your Silvia AI account across devices.
        </p>

        <div className="auth-links">
          {mode === "signin" && (
            <button type="button" onClick={() => setAuthMode("reset")}>Forgot password?</button>
          )}
          {mode === "signup" && (
            <button type="button" onClick={() => setAuthMode("signin")}>
              Use existing account
            </button>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => setAuthMode("signin")}>Back to sign in</button>
          )}
        </div>

        {trialExpired && onClose && (
          <button className="auth-skip" type="button" onClick={onClose}>
            No thanks, start over
          </button>
        )}
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M45.5 24.5c0-1.5-.1-3-.4-4.5H24v8.5h12.1c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.9 6.7-9.6 6.7-16.2z"/>
      <path fill="#34A853" d="M24 46c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2.1 1.4-4.8 2.2-8.8 2.2-6.7 0-12.4-4.5-14.4-10.6H2.2v5.7C6.2 41.5 14.5 46 24 46z"/>
      <path fill="#FBBC05" d="M9.6 26.3c-.5-1.4-.8-2.8-.8-4.3s.3-2.9.8-4.3v-5.7H2.2C.8 15.3 0 19.5 0 24s.8 8.7 2.2 12l7.4-5.7z"/>
      <path fill="#EA4335" d="M24 9.5c3.8 0 7.1 1.3 9.8 3.8l7.3-7.3C37.8 2.1 31.4 0 24 0 14.5 0 6.2 4.5 2.2 12l7.4 5.7C11.6 14 17.3 9.5 24 9.5z"/>
    </svg>
  );
}

function friendlyError(msg: string): string {
  if (/invalid-credential|wrong-password|user-not-found/i.test(msg)) return "Incorrect email or password.";
  if (/email-already-in-use/i.test(msg)) return "An account with this email already exists.";
  if (/weak-password/i.test(msg)) return "Password must be at least 6 characters.";
  if (/invalid-email/i.test(msg)) return "Enter a valid email address.";
  if (/too-many-requests/i.test(msg)) return "Too many attempts - try again later.";
  if (/popup-closed/i.test(msg)) return "Sign-in popup was closed.";
  return msg.replace(/Firebase: /i, "").replace(/\s*\(auth\/.*?\)\.?/g, "");
}
