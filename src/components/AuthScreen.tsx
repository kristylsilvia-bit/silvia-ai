import { useState } from "react";
import { signInWithGoogle, signInEmail, signUpEmail, resetPassword } from "../lib/firebase";

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

  const handle = async () => {
    setError("");
    setInfo("");
    if (!email) { setError("Enter your email."); return; }
    if (mode !== "reset" && !password) { setError("Enter your password."); return; }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInEmail(email, password);
      } else if (mode === "signup") {
        await signUpEmail(email, password);
      } else {
        await resetPassword(email);
        setInfo("Password reset email sent — check your inbox.");
        setBusy(false);
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

  const handleGoogle = async () => {
    setError("");
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

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="36" height="36" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7C5CFF"/>
                <stop offset="0.5" stopColor="#5B8DEF"/>
                <stop offset="1" stopColor="#2DD4BF"/>
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill="url(#ag)"/>
            <path d="M256 100l52 118 128 12-96 86 28 126L256 376l-112 66 28-126-96-86 128-12z" fill="#fff"/>
          </svg>
          <span>Silvia AI</span>
        </div>

        {trialExpired && (
          <div className="auth-trial-banner">
            Your 5 free chats are up — sign in to keep going
          </div>
        )}

        <h2 className="auth-title">
          {mode === "signin" && "Welcome back"}
          {mode === "signup" && "Create account"}
          {mode === "reset" && "Reset password"}
        </h2>

        {mode !== "reset" && (
          <button className="auth-google-btn" onClick={handleGoogle} disabled={busy}>
            <GoogleIcon />
            Continue with Google
          </button>
        )}

        {mode !== "reset" && <div className="auth-divider"><span>or</span></div>}

        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
          autoComplete="email"
        />

        {mode !== "reset" && (
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handle()}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        )}

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <button className="auth-submit" onClick={handle} disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
        </button>

        <div className="auth-links">
          {mode === "signin" && (
            <>
              <button onClick={() => { setMode("signup"); setError(""); setInfo(""); }}>Create account</button>
              <button onClick={() => { setMode("reset"); setError(""); setInfo(""); }}>Forgot password?</button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => { setMode("signin"); setError(""); setInfo(""); }}>Already have an account? Sign in</button>
          )}
          {mode === "reset" && (
            <button onClick={() => { setMode("signin"); setError(""); setInfo(""); }}>Back to sign in</button>
          )}
        </div>

        {trialExpired && onClose && (
          <button className="auth-skip" onClick={onClose}>
            No thanks, start over
          </button>
        )}
      </div>
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
  if (/too-many-requests/i.test(msg)) return "Too many attempts — try again later.";
  if (/popup-closed/i.test(msg)) return "Sign-in popup was closed.";
  return msg.replace(/Firebase: /i, "").replace(/\s*\(auth\/.*?\)\.?/g, "");
}
