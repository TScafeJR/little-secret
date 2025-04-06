package gameservice

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type Message struct {
	Type          game.Event     `json:"type,omitzero"`
	RoomID        id.RoomHash    `json:"roomID,omitzero"`
	Phase         game.Phase     `json:"phase,omitzero"`
	PlayerID      id.PlayerID    `json:"playerID,omitzero"`
	Text          string         `json:"text,omitzero"`
	MessageID     id.MessageID   `json:"messageID,omitzero"`
	Player        *game.Player   `json:"player,omitzero"`
	GameState     game.GameState `json:"gameState,omitzero"`
	MessageSender id.PlayerID    `json:"messageSender,omitzero"`
	Timestemp     *time.Time     `json:"timestamp,omitzero"`
}

func NewMessage(m Message) Message {
	i := uuid.CreateUUID().String()

	rm := m
	rm.MessageID = id.MessageID(i)
	return rm
}

func (m *Message) PopulateMessage() {
	if m.MessageID == "" {
		m.MessageID = id.MessageID(uuid.CreateUUID().String())
	}

	if m.Timestemp == nil {
		t := time.Now()
		m.Timestemp = &t
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
		if room.Game != nil {
			return room.Game, nil
		}
	}
	return nil, fmt.Errorf("game not found for roomID: %s", roomID)
}

func (s *GameService) HandleIncomingMessage(conn *websocket.Conn, messageType int, message []byte) error {
	s.logger.Info("Received message", zap.String("message", string(message)))

	if err := s.RespondToMessage(conn, messageType, message); err != nil {
		return fmt.Errorf("s.RespondToMessage(): %w", err)
	}
	return nil
}
