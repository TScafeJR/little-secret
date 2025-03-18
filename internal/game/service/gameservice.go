package gameservice

import (
	"fmt"
	"sync"

	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type Room struct {
	Connections map[*websocket.Conn]bool
	Game        *game.Game
}

type GameService struct {
	Rooms  map[id.RoomHash]*Room
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

	rooms := make(map[id.RoomHash]*Room)

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
	for _, room := range s.Rooms {
		for conn := range room.Connections {
			_ = conn.Close()
		}
	}
}
