import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pin 5173 and fail if busy — otherwise Vite picks the next port and the UI looks "blank"
  // at the URL the project/docs/tests use. host: true binds 0.0.0.0 so Playwright's
  // http://127.0.0.1:5173 health check always hits the same dev server.
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
});
