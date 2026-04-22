package gameservice

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// Recover rebuilds in-memory Room state from the event store. For each known
// room it loads the latest `_snapshot` row and decodes it into a *game.Game.
// Rooms without a snapshot (e.g. only a CreateRoom row was recorded before a
// crash) are skipped.
//
// Reconnected clients' *websocket.Conn values are not restored — they come
// back in via the REJOIN event, which rewires each Player.Conn to the new
// socket. Until someone reconnects, Room.Connections is empty.
func (s *GameService) Recover(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	rooms, err := s.store.ListRoomIDs(ctx)
	if err != nil {
		return fmt.Errorf("store.ListRoomIDs: %w", err)
	}

	restored := 0
	for _, roomID := range rooms {
		events, err := s.store.LoadForRoom(ctx, roomID)
		if err != nil {
			s.logger.Error("store.LoadForRoom", zap.String("room", string(roomID)), zap.Error(err))
			continue
		}

		// Walk backwards to the most recent snapshot.
		var snap []byte
		for i := len(events) - 1; i >= 0; i-- {
			if events[i].EventType == snapshotEventType {
				snap = events[i].Payload
				break
			}
		}
		if snap == nil {
			continue
		}

		var g game.Game
		if err := json.Unmarshal(snap, &g); err != nil {
			s.logger.Error("unmarshal snapshot", zap.String("room", string(roomID)), zap.Error(err))
			continue
		}

		s.Rooms[roomID] = &Room{
			Connections: make(map[*websocket.Conn]bool),
			Game:        &g,
		}
		restored++
	}

	s.logger.Info("recovered rooms", zap.Int("count", restored), zap.Int("seen", len(rooms)))
	return nil
}
