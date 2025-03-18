package gameservice

import (
	"encoding/json"
	"fmt"

	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type Message struct {
	Type     game.Event  `json:"type,omitzero"`
	RoomID   id.RoomHash `json:"roomID,omitzero"`
	Phase    game.Phase  `json:"phase,omitzero"`
	PlayerID id.PlayerID `json:"playerID,omitzero"`
	Text     string      `json:"text,omitzero"`
}

func (s *GameService) broadcastToRoom(roomID id.RoomHash, msg Message) {
	r, ok := s.Rooms[roomID]
	if !ok {
		s.logger.Error("Room not found", zap.String("roomID", string(roomID)))
		return
	}

	for conn := range r.Connections {
		if err := conn.WriteJSON(msg); err != nil {
			s.logWriteError(err)
		}
	}
}

func (s *GameService) sendMessageToConnection(conn *websocket.Conn, msg Message) {
	if err := conn.WriteJSON(msg); err != nil {
		s.logWriteError(err)
	}

}

func parseMessage(message []byte) (Message, error) {
	var m Message
	if err := json.Unmarshal(message, &m); err != nil {
		return Message{}, fmt.Errorf("json.Unmarshal(): %w", err)
	}
	return m, nil
}

func (s *GameService) getGameFromRoomID(roomID id.RoomHash) (*game.Game, error) {
	if room, exists := s.Rooms[roomID]; exists {
		return room.Game, nil
	}
	return nil, fmt.Errorf("game not found for roomID: %s", roomID)
}

func (s *GameService) handlePlayerConnected(conn *websocket.Conn) {
	u := uuid.CreateUUID().String()
	m := Message{
		PlayerID: id.PlayerID(u),
		Type:     game.PlayerConnectedEvent,
	}
	s.sendMessageToConnection(conn, m)
}

func (s *GameService) handleRoomCreatedEvent(conn *websocket.Conn) {
	roomID := s.generateNewRoomCode()
	hash, err := common.UUIDToShort(roomID)
	if err != nil {
		return
	}
	conns := make(map[*websocket.Conn]bool)
	conns[conn] = true

	g := game.NewGame(hash, id.PlayerID("1"), conn)
	room := Room{
		Connections: conns,
		Game:        g,
	}

	s.Rooms[hash] = &room

	m := Message{
		RoomID: id.RoomHash(hash),
		Type:   game.RoomCreatedEvent,
	}
	s.sendMessageToConnection(conn, m)
}

func (s *GameService) RespondToMessage(conn *websocket.Conn, messageType int, message []byte) error {
	m, err := parseMessage(message)
	if err != nil {
		return fmt.Errorf("ParseMessage(): %w", err)
	}

	switch g := m.Type; g {
	case game.StartGameEvent:
		_, err := s.getGameFromRoomID(m.RoomID)
		if err != nil {
			return fmt.Errorf("getGameFromRoomID(): %w", err)
		}
	case game.PlayerConnectedEvent:
		s.handlePlayerConnected(conn)
	case game.RoomCreatedEvent:
		s.handleRoomCreatedEvent(conn)
	default:
		return fmt.Errorf("unknown message type: %s", m.Type)
	}

	return nil
}

func (s *GameService) HandleIncomingMessage(conn *websocket.Conn, messageType int, message []byte) error {
	s.logger.Info("Received message", zap.String("message", string(message)))
	s.logger.Debug("Game Service State", zap.Any("service", s))

	if err := s.RespondToMessage(conn, messageType, message); err != nil {
		return fmt.Errorf("s.RespondToMessage(): %w", err)
	}
	return nil
}
