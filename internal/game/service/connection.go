package gameservice

import (
	"sync"

	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// writeJSONConn serializes all writes to a given WebSocket (gorilla/websocket contract).
func (s *GameService) writeJSONConn(conn *websocket.Conn, v any) error {
	muIface, _ := s.connWrite.LoadOrStore(conn, new(sync.Mutex))
	mu := muIface.(*sync.Mutex)
	mu.Lock()
	defer mu.Unlock()
	return conn.WriteJSON(v)
}

// ForgetConnWrite removes the per-connection write lock; call when the socket closes.
func (s *GameService) forgetConnWrite(conn *websocket.Conn) {
	if conn == nil {
		return
	}
	s.connWrite.Delete(conn)
}

func (s *GameService) broadcastToRoom(roomID id.RoomHash, msg Message) {
	msg.PopulateMessage()

	r, ok := s.Rooms[roomID]
	if !ok {
		s.logger.Error("Room not found", zap.String("roomID", string(roomID)))
		return
	}

	g, err := s.getGameFromRoomID(roomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
	}

	gs := g.GetGameState()
	msg.GameState = gs

	for conn := range r.Connections {
		if err := s.writeJSONConn(conn, msg); err != nil {
			s.logWriteError(err)
		}
	}

	s.logger.Info("Broadcasted message", zap.Any("message", msg), zap.String("room", string(roomID)))
}

func (s *GameService) sendMessageToConnection(conn *websocket.Conn, msg Message) {
	msg.PopulateMessage()

	if msg.RoomID != "" {
		g, err := s.getGameFromRoomID(msg.RoomID)
		if err != nil {
			s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		}

		gs := g.GetGameState()
		msg.GameState = gs
	}

	if err := s.writeJSONConn(conn, msg); err != nil {
		s.logWriteError(err)
		return
	}

	s.logger.Info("Sent message", zap.Any("message", msg))
}
