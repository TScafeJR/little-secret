package routes

import (
	"errors"
	"fmt"

	gameservice "github.com/TScafeJR/little-secret/internal/game/service"
	"github.com/go-chi/chi/v5"
)

type Services struct {
	GameService *gameservice.GameService
}

func (s Services) Validate() error {
	if s.GameService == nil {
		return errors.New("s.GameService cannot be nil")
	}
	return nil
}

func AddRoutes(router *chi.Mux, services Services) error {
	if err := services.Validate(); err != nil {
		return fmt.Errorf("services.Validate(): %w", err)
	}

	addWebSocketRoutes(router, services)
	return nil
}

func addWebSocketRoutes(router *chi.Mux, services Services) {
	router.Route("/ws", func(r chi.Router) {
		r.Get("/", services.GameService.HandleWebSocket)
	})
}
