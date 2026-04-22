/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Host:port for the WebSocket (no scheme), e.g. 127.0.0.1:8080 */
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
