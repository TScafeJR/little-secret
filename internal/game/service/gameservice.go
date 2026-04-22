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
	store  EventStore
	// replaying is true while GameService.New is replaying events on startup.
	// Handlers check it to suppress broadcasts and event-log appends (we are
	// reconstructing state from the log, not generating new events).
	replaying bool
	mu        sync.Mutex
	// connWrite: gorilla/websocket permits only one concurrent writer per *Conn.
	// Each tab runs HandleWebSocket in its own goroutine; broadcasts and direct sends
	// must not call WriteJSON on the same connection at the same time.
	connWrite sync.Map
}

type ServiceCfg struct {
	Logger *zap.Logger
	// Store is the event log backing crash recovery. Required.
	Store EventStore
}

func (cfg *ServiceCfg) Validate() error {
	if cfg == nil {
		return fmt.Errorf("cfg cannot be nil")
	}
	if cfg.Logger == nil {
		return fmt.Errorf("logger missing")
	}
	if cfg.Store == nil {
		return fmt.Errorf("store missing")
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
		store:  cfg.Store,
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
