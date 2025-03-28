package gameservice

import (
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

func (s *GameService) broadcastToRoom(roomID id.RoomHash, msg Message) {
	msg.PopulateMessageID()

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
		if err := conn.WriteJSON(msg); err != nil {
			s.logWriteError(err)
		}
	}

	s.logger.Info("Broadcasted message", zap.Any("message", msg), zap.String("room", string(roomID)))
}

func (s *GameService) sendMessageToConnection(conn *websocket.Conn, msg Message) {
	msg.PopulateMessageID()

	if msg.RoomID != "" {
		g, err := s.getGameFromRoomID(msg.RoomID)
		if err != nil {
			s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		}

		gs := g.GetGameState()
		msg.GameState = gs
	}

	if err := conn.WriteJSON(msg); err != nil {
		s.logWriteError(err)
	}

	s.logger.Info("Sent message", zap.Any("message", msg))
}
