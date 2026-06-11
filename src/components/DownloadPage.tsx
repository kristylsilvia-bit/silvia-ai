import { useEffect, useState } from "react";
import Aurora from "./Aurora";
import { SparkIcon } from "./icons";

interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GithubRelease {
  tag_name: string;
  published_at: string;
  assets: GithubAsset[];
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.6L10.5 4.5V11.5H3V5.6ZM11.5 4.35L21 3V11.5H11.5V4.35ZM3 12.5H10.5V19.5L3 18.4V12.5ZM11.5 12.5H21V21L11.5 19.65V12.5Z" />
    </svg>
  );
}

export default function DownloadPage() {
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    // Apply stored theme so the page matches the user's preference
    try {
      const stored = localStorage.getItem("silvia.theme");
      const theme = stored === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", theme);
      const settingsRaw = localStorage.getItem("silvia.settings.v1");
      if (settingsRaw) {
        const s = JSON.parse(settingsRaw);
        if (s.colorScheme) document.documentElement.setAttribute("data-scheme", s.colorScheme);
      }
    } catch {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  useEffect(() => {
    fetch("https://api.github.com/repos/kristylsilvia-bit/silvia-ai/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error("not ok");
        return r.json() as Promise<GithubRelease>;
      })
      .then((data) => {
        setRelease(data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, []);

  // Prefer NSIS .exe over .msi for simplicity
  const exeAsset = release?.assets.find(
    (a) => a.name.endsWith(".exe") && !a.name.includes("msi"),
  ) ?? release?.assets.find((a) => a.name.endsWith(".exe"));
  const msiAsset = release?.assets.find((a) => a.name.endsWith(".msi"));

  const version = release?.tag_name ?? "";
  const releaseDate = release?.published_at
    ? new Date(release.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <>
      <Aurora />
      <div className="dl-page">
        <a href="/" className="dl-back" aria-label="Back to Silvia AI">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Silvia AI
        </a>

        <div className="dl-card">
          {/* Header */}
          <div className="dl-card-header">
            <div className="dl-logo">
              <SparkIcon />
            </div>
            <h1>Silvia AI</h1>
            <p>Premium desktop app for Windows</p>
          </div>

          {/* Body */}
          <div className="dl-card-body">
            {loading ? (
              <div className="dl-skeleton">
                <div className="dl-skel-line wide" />
                <div className="dl-skel-line narrow" />
                <div className="dl-skel-btn" />
              </div>
            ) : fetchError ? (
              <div className="dl-fallback">
                <p>Could not load release info.</p>
                <a
                  href="https://github.com/kristylsilvia-bit/silvia-ai/releases/latest"
                  className="dl-btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DownloadIcon />
                  View latest release on GitHub
                </a>
              </div>
            ) : release ? (
              <>
                <div className="dl-meta">
                  <span className="dl-version-badge">{version}</span>
                  {releaseDate && <span className="dl-date">Released {releaseDate}</span>}
                </div>

                {exeAsset ? (
                  <a
                    href={exeAsset.browser_download_url}
                    className="dl-btn-primary"
                    download
                  >
                    <WindowsIcon />
                    Download for Windows
                    <span className="dl-btn-size">
                      {formatBytes(exeAsset.size)} · .exe
                    </span>
                  </a>
                ) : (
                  <a
                    href={`https://github.com/kristylsilvia-bit/silvia-ai/releases/tag/${version}`}
                    className="dl-btn-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DownloadIcon />
                    View release on GitHub
                  </a>
                )}

                {msiAsset && (
                  <a
                    href={msiAsset.browser_download_url}
                    className="dl-btn-secondary"
                    download
                  >
                    Also available as .msi (enterprise/GPO)
                    <span className="dl-btn-size">{formatBytes(msiAsset.size)}</span>
                  </a>
                )}

                <p className="dl-note">
                  Requires Windows 10 or later. WebView2 is included.
                </p>
              </>
            ) : null}
          </div>

          {/* Features */}
          <div className="dl-features">
            {[
              { icon: "⚡", label: "All Gemini models" },
              { icon: "🔒", label: "Private & offline-capable" },
              { icon: "🎙️", label: "Voice Mode included" },
              { icon: "☁️", label: "Cross-device sync" },
            ].map((f) => (
              <div className="dl-feature" key={f.label}>
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="dl-footer-note">
          Open source ·{" "}
          <a
            href="https://github.com/kristylsilvia-bit/silvia-ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </div>
    </>
  );
}
