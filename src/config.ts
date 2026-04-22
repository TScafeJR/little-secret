export enum Environments {
  LOCAL = "local",
  PROD = "prod",
}

export interface AppOptions {
  env?: Environments;
  backendUrl: string;
}

// Use 127.0.0.1 (not "localhost") so the browser and Playwright use the same
// route to the game server; some stacks resolve "localhost" to ::1 only or IPv4
// only and the WebSocket can fail or flap while the UI loads.
const defaultBackend = "127.0.0.1:8080";

function resolveBackendUrl(): string {
  const explicit = import.meta.env.VITE_BACKEND_URL?.trim();
  if (explicit) return explicit;
  // In a browser over HTTPS (prod), fall back to the page's own origin so
  // the WebSocket connects to the same Cloud Run service that served the HTML.
  // In dev / SSR / tests there is no `window`, so keep the loopback default.
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return window.location.host;
  }
  return defaultBackend;
}

export const config: AppOptions = {
  env: Environments.LOCAL,
  backendUrl: resolveBackendUrl(),
};

export function webSocketScheme(): "ws" | "wss" {
  // Mixed-content rules block ws:// on HTTPS pages. Mirror the page scheme.
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "wss";
  }
  return "ws";
}

export default config;
