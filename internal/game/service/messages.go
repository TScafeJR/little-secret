package gameservice

import (
	"encoding/json"
	"fmt"

	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type Message struct {
	Type   game.Event `json:"type,omitzero"`
	RoomID string     `json:"roomID,omitzero"`
	Phase  game.Phase `json:"phase,omitzero"`
}

func (s *GameService) broadcastToRoom(game *game.Game, msg map[string]string) {
	for conn := range s.Rooms[game.RoomID] {
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

func ParseMessage(message []byte) (Message, error) {
	var m Message
	if err := json.Unmarshal(message, &m); err != nil {
		return Message{}, fmt.Errorf("json.Unmarshal(): %w", err)
	}
	return m, nil
}

func getGameFromRoomID(_ string) *game.Game {
	return nil
}

func (s *GameService) handlePlayerConnected(conn *websocket.Conn) {
	u := uuid.CreateUUID().String()
	hash, err := common.UUIDToShort(u)
	if err != nil {
		return
	}
	m := Message{
		RoomID: hash,
		Type:   game.PlayerConnectedEvent,
	}
	s.sendMessageToConnection(conn, m)
}

func (s *GameService) RespondToMessage(conn *websocket.Conn, messageType int, message []byte) error {
	m, err := ParseMessage(message)
	if err != nil {
		return fmt.Errorf("ParseMessage(): %w", err)
	}

	switch g := m.Type; g {
	case game.StartGameEvent:
		gID := m.RoomID
		if gID == "" {
			return fmt.Errorf("roomID is required to start a game")
		}
		foundGame := getGameFromRoomID(gID)
		s.startGame(foundGame)
	case game.PlayerConnectedEvent:
		s.handlePlayerConnected(conn)
	default:
		return fmt.Errorf("unknown message type: %s", m.Type)
	}

	return nil
}

func (s *GameService) HandleIncomingMessage(conn *websocket.Conn, messageType int, message []byte) error {
	s.logger.Info("Received message", zap.String("message", string(message)))

	if err := s.RespondToMessage(conn, messageType, message); err != nil {
		return fmt.Errorf("s.RespondToMessage(): %w", err)
	}
	return nil
}

func (s *GameService) startGame(g *game.Game) {
	common.Shuffle(g.Players)
	g.Players[0].Role = game.GoodKittenRole
	g.Players[0].SecretWord = "" // Spy has no word
	g.Players[1].Role = game.SpyKittenRole
	g.Players[1].SecretWord = g.DecoyWord
	for i := 2; i < len(g.Players); i++ {
		g.Players[i].Role = game.ConfusedKittenRole
		g.Players[i].SecretWord = g.SecretWord
	}
	g.Phase = "discussion"
	// Notify each player of their role and secret word
	for _, p := range g.Players {
		privateMsg := map[string]string{
			"type": "roleAssignment",
			"role": string(p.Role),
			"word": p.SecretWord,
		}
		p.Conn.WriteJSON(privateMsg)
	}
	// Broadcast to room that the discussion phase has started
	s.broadcastToRoom(g, map[string]string{"type": "phase", "phase": "discussion"})
}

func (s *GameService) tallyVotes(game *game.Game) {
	counts := map[string]int{}
	for _, targetID := range game.Votes {
		counts[targetID]++
	}

	var eliminatedID string
	maxVotes := -1
	for target, count := range counts {
		if count > maxVotes {
			maxVotes = count
			eliminatedID = target
		}
	}

	eliminatedPlayer, err := game.FindPlayer(eliminatedID)
	if err != nil {
		s.logger.Error("Player not found for elimination", zap.String("playerID", eliminatedID))
		return
	}
	eliminatedPlayer.Alive = false
	// Inform everyone who was eliminated and their role
	revealMsg := map[string]string{
		"type":   "elimination",
		"player": eliminatedPlayer.Name,
		"role":   string(eliminatedPlayer.Role),
	}
	s.broadcastToRoom(game, revealMsg)
	// handleEliminationOutcome(game, eliminatedPlayer)
}
