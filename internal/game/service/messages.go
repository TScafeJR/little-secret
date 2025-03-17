package gameservice

import (
	"fmt"

	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

func ParseMessage(message []byte) (map[string]string, error) {
	parsedMessage := make(map[string]string)
	parsedMessage[string(message)] = string(message)
	return parsedMessage, nil
}

func getGameFromRoomID(roomID string) *game.Game {
	return nil
}

func (s *GameService) RespondToMessage(conn *websocket.Conn, messageType int, message []byte) error {
	m, err := ParseMessage(message)
	if err != nil {
		return fmt.Errorf("ParseMessage(): %w", err)
	}

	switch g := game.Event(m["type"]); g {
	case game.StartGameEvent:
		gID, ok := m["gameID"]
		if !ok {
			return fmt.Errorf("gameID not found in message")
		}
		g := getGameFromRoomID(gID)
		s.startGame(g)
	default:
		return fmt.Errorf("unknown message type: %s", m["type"])
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

func (s *GameService) startGame(game *game.Game) {
	common.Shuffle(game.Players)
	game.Players[0].Role = "Spy Pup"
	game.Players[0].SecretWord = "" // Spy has no word
	game.Players[1].Role = "Confused Kitten"
	game.Players[1].SecretWord = game.DecoyWord
	for i := 2; i < len(game.Players); i++ {
		game.Players[i].Role = "Good Kitten"
		game.Players[i].SecretWord = game.SecretWord
	}
	game.Phase = "discussion"
	// Notify each player of their role and secret word
	for _, p := range game.Players {
		privateMsg := map[string]string{
			"type": "roleAssignment",
			"role": p.Role,
			"word": p.SecretWord,
		}
		p.Conn.WriteJSON(privateMsg)
	}
	// Broadcast to room that the discussion phase has started
	s.broadcastToRoom(game, map[string]string{"type": "phase", "phase": "discussion"})
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
		"role":   eliminatedPlayer.Role,
	}
	s.broadcastToRoom(game, revealMsg)
	// handleEliminationOutcome(game, eliminatedPlayer)
}
