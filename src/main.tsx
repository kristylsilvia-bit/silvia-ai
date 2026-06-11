import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import DownloadPage from "./components/DownloadPage";
import { AuthProvider } from "./contexts/AuthContext";

// Syntax-highlighting theme (replaces the prototype's CDN <link>).
import "highlight.js/styles/github-dark.css";
// Global design tokens + component styles (ported verbatim from the prototype).
import "./styles/global.css";

const container = document.getElementById("root");
if (!container) throw new Error('Root element "#root" not found');

const isDownload = window.location.pathname === "/download";

createRoot(container).render(
  <StrictMode>
    {isDownload ? (
      <DownloadPage />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </StrictMode>,
);
