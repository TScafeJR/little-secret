package routes

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
)

// AddStaticRoutes serves the Vite build output at `staticPath` with SPA-style
// fallback: any request whose path doesn't map to an existing file is served
// `index.html` so client-side routing works. `/ws` is already mounted before
// this, so WebSocket upgrades bypass the fallback.
//
// Pass an empty staticPath in local dev to skip static serving (the Vite dev
// server handles the frontend in that mode).
func AddStaticRoutes(router *chi.Mux, staticPath string) {
	if staticPath == "" {
		return
	}
	absRoot, err := filepath.Abs(staticPath)
	if err != nil {
		absRoot = staticPath
	}
	fs := http.FileServer(http.Dir(absRoot))

	router.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		// Map the URL path to a disk path under the static root. If the file
		// exists, serve it; otherwise fall through to index.html.
		clean := strings.TrimPrefix(r.URL.Path, "/")
		candidate := filepath.Join(absRoot, clean)
		if clean == "" {
			serveIndex(w, r, absRoot)
			return
		}
		// Prevent escaping the static root via `..` — filepath.Join already
		// cleans, but reject anything that doesn't share the prefix.
		if !strings.HasPrefix(candidate, absRoot) {
			http.NotFound(w, r)
			return
		}
		info, err := os.Stat(candidate)
		if err != nil || info.IsDir() {
			serveIndex(w, r, absRoot)
			return
		}
		fs.ServeHTTP(w, r)
	})
}

func serveIndex(w http.ResponseWriter, r *http.Request, root string) {
	index := filepath.Join(root, "index.html")
	// index.html is small and usually cached — set no-store so the browser
	// picks up the latest bundle after a deploy. Hashed JS/CSS in /assets is
	// still cacheable via the default headers on http.FileServer.
	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, index)
}
