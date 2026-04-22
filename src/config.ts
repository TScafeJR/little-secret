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

export const config: AppOptions = {
  env: Environments.LOCAL,
  backendUrl: import.meta.env.VITE_BACKEND_URL?.trim() || defaultBackend,
};

export default config;
