package gameservice

import (
	"fmt"
	"sync"

	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type GameService struct {
	Rooms  map[string]map[*websocket.Conn]bool
	logger *zap.Logger
	mu     sync.Mutex
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

	rooms := make(map[string]map[*websocket.Conn]bool)

	return &GameService{
		logger: cfg.Logger,
		Rooms:  rooms,
		mu:     sync.Mutex{},
	}, nil
}

func (g *GameService) generateNewRoomCode() string {
	return uuid.CreateUUID().String()
}

func (s *GameService) CloseAllConnections() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, clients := range s.Rooms {
		for conn := range clients {
			_ = conn.Close()
		}
	}
}
