function stripTrailingSlashes(s) {
  return s.replace(/\/+$/, "");
}

/**
 * API origin for fetch(). In Vite dev, default is "" so URLs are same-origin `/api/...`
 * and vite.config.js proxies them to the backend (avoids CORS and localhost IPv6 issues).
 *
 * Override with VITE_API_BASE_URL (e.g. http://127.0.0.1:8000) if you do not use the proxy.
 */
export function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw != null && String(raw).trim() !== "") {
    return stripTrailingSlashes(String(raw).trim());
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return "http://localhost:8000";
}

export const API_BASE = getApiBase();
