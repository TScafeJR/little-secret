package server

import (
	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/gorilla/websocket"
)

type Manager struct {
	rooms map[string]map[*websocket.Conn]bool
}

func (m *Manager) broadcastToRoom(game *game.Game, msg map[string]string) {
	for conn := range m.rooms[game.RoomID] {
		conn.WriteJSON(msg)
	}
}
