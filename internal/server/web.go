package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/TScafeJR/little-secret/internal/server/routes"
	"github.com/TScafeJR/little-secret/internal/server/srvcfg"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"go.uber.org/zap"
)

func ServeWeb(c srvcfg.Cfg) error {
	_, services, closeFn, err := NewServer(c)
	if err != nil {
		return fmt.Errorf("NewServer(): %w", err)
	}
	defer closeFn()
	router := chi.NewRouter()
	router.Use(
		requestLogger(c.Logger.Named("http_router")),
		middleware.Compress(5),
		middleware.Recoverer,
	)

	if err = routes.AddRoutes(router, routes.Services{
		GameService: &services.GameService,
	}); err != nil {
		return fmt.Errorf("routes.AddRoutes(): %w", err)
	}

	s := http.Server{
		Addr:        fmt.Sprintf(":%d", c.PublicPort),
		Handler:     router,
		ReadTimeout: 5 * time.Minute,
	}

	// Listen for os signals in a separate routine in order to gracefully shutdown servers.
	finished := make(chan struct{})
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
		caughtSig := <-sigint

		c.Logger.Info("initiating shutdown", zap.String("signal", caughtSig.String()))

		// Received signal, give 10 seconds to shut down and close connections.
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var wg sync.WaitGroup
		wg.Add(1)

		// shutdown public server
		go func() {
			defer wg.Done()
			services.CloseAllConnections()
			if err := s.Shutdown(ctx); err != nil {
				c.Logger.Error("publicServer.Shutdown()", zap.Error(err))
			}
		}()

		wg.Wait()
		close(finished)
	}()

	// Start servers. These immediately return an error when Shutdown
	// is called above.
	go func() {
		c.Logger.Info("public http server started", zap.Int("Port", c.PublicPort))
		if err := s.ListenAndServe(); err != http.ErrServerClosed {
			c.Logger.Error("publicServer.ListenAndServe()", zap.Error(err))
		}
	}()

	// Wait for shutdown
	<-finished
	c.Logger.Info("shutdown complete")

	return nil
}
