package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// AddHealthRoutes wires `/healthz` — used by the Cloud Scheduler keepalive
// ping and any uptime checks. Intentionally trivial: if the HTTP server is
// accepting connections, we're alive enough.
func AddHealthRoutes(router *chi.Mux) {
	router.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
}
