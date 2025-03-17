package gameservice

import (
	"fmt"

	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type GameService struct {
	Rooms  map[string]map[*websocket.Conn]bool
	logger *zap.Logger
}

type ServiceCfg struct {
	Logger *zap.Logger
}

func (cfg *ServiceCfg) Validate() error {
	if cfg == nil {
		return fmt.Errorf("cfg cannot be nil")
	}
	if cfg.Logger == nil {
		return fmt.Errorf("logger missing")
	}

	return nil
}

func New(cfg *ServiceCfg) (*GameService, error) {
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("cfg.Validate(): %w", err)
	}

	return &GameService{
		logger: cfg.Logger,
	}, nil
}

func (g *GameService) generateNewRoomCode() string {
	return uuid.CreateUUID().String()
}
