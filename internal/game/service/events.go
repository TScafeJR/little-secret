package gameservice

import (
	"fmt"

	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

func (s *GameService) handlePlayerConnected(conn *websocket.Conn) {
	u := uuid.CreateUUID().String()
	m := NewMessage(Message{
		PlayerID: id.PlayerID(u),
		Type:     game.PlayerConnectedEvent,
	})
	s.sendMessageToConnection(conn, m)
}

func (s *GameService) handleRoomCreatedEvent(conn *websocket.Conn, msg Message) {
	roomID := s.generateNewRoomCode()
	hash, err := common.UUIDToShort(roomID)
	if err != nil {
		s.logger.Error("common.UUIDToShort()", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to create room",
		})
		return
	}
	conns := make(map[*websocket.Conn]bool)
	conns[conn] = true

	g := game.NewGame(hash, msg.PlayerID, conn)
	room := Room{
		Connections: conns,
		Game:        g,
	}

	s.Rooms[hash] = &room

	m := NewMessage(Message{
		RoomID: id.RoomHash(hash),
		Type:   game.RoomCreatedEvent,
	})
	s.sendMessageToConnection(conn, m)

	m2 := NewMessage(Message{
		Type:      game.PlayerJoinedEvent,
		Player:    g.Players[0],
		GameState: g.GetGameState(),
	})
	s.sendMessageToConnection(conn, m2)
}

func (s *GameService) handlePlayerUpdatedName(conn *websocket.Conn, message Message) {
	g, err := s.getGameFromRoomID(message.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to update player name",
		})
		return
	}

	players := g.Players

	for i := range players {
		if message.PlayerID == players[i].ID {
			players[i].Name = message.Text
			s.broadcastToRoom(message.RoomID, Message{
				Type:     game.UpdatePlayerNameEvent,
				Text:     message.Text,
				PlayerID: message.PlayerID,
			})
		}
	}
}

func (s *GameService) handleRoomCodeSubmittedEvent(conn *websocket.Conn, message Message) {
	roomID := id.RoomHash(message.Text)
	room, ok := s.Rooms[roomID]
	if !ok {
		s.logger.Error("Room not found", zap.String("roomID", string(roomID)))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Room not found",
		})
		return
	}

	room.Connections[conn] = true
	p := room.Game.AddPlayer(message.PlayerID, conn)

	s.sendMessageToConnection(conn, Message{
		Type:   game.RoomJoinedEvent,
		RoomID: roomID,
	})

	s.broadcastToRoom(roomID, Message{
		Type:     game.PlayerJoinedEvent,
		Player:   p,
		PlayerID: message.PlayerID,
	})
}

func (s *GameService) handleStartGame(conn *websocket.Conn, m Message) {
	g, err := s.getGameFromRoomID(m.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to start game",
		})
		return
	}

	if err = g.StartGame(); err != nil {
		s.logger.Error("g.StartGame()", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to start game",
		})
		return
	}

	phase := game.InfoPhase

	g.UpdatePhase(phase)

	s.broadcastToRoom(m.RoomID, Message{
		Type:  game.PhaseUpdatedEvent,
		Phase: phase,
	})

	for i := range g.Players {
		p := g.Players[i]
		s.sendMessageToConnection(p.Conn, Message{
			Type: game.RoleRevealEvent,
			Text: p.SecretWord,
		})
	}
}

func (s *GameService) handleRemovePlayer(conn *websocket.Conn, m Message) {
	g, err := s.getGameFromRoomID(m.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to remove player",
		})
		return
	}

	p, err := g.FindPlayer(m.PlayerID)
	if err != nil {
		s.logger.Error("g.FindPlayer()", zap.Error(err))
		return
	}

	for _, room := range s.Rooms {
		if _, ok := room.Connections[conn]; ok {
			delete(room.Connections, conn)
		}
	}

	if p.Host {
		s.broadcastToRoom(m.RoomID, Message{
			Type: game.HostLeftGameEvent,
		})
	} else {
		if err = g.RemovePlayer(m.PlayerID); err != nil {
			s.logger.Error("g.RemovePlayer()", zap.Error(err))
			return
		}

		s.broadcastToRoom(m.RoomID, Message{
			Type:      game.RemovePlayerEvent,
			PlayerID:  m.PlayerID,
			GameState: g.GetGameState(),
		})
	}

}

func (s *GameService) handleVote(conn *websocket.Conn, m Message) {
	g, err := s.getGameFromRoomID(m.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to handle vote",
		})
		return
	}

	if _, ok := g.Votes[g.Round]; !ok {
		g.Votes[g.Round] = game.NewVoteRound()
	}

	vr := g.Votes[g.Round]

	if vr.Submitted.Contains(m.PlayerID) {
		return
	} else {
		vr.Submitted.Add(m.PlayerID)
		if m.Text != "" {
			v := game.Vote{
				From: m.PlayerID,
				To:   id.PlayerID(m.Text),
			}
			vr.AddVote(v)
		}
		g.ToggleConfirmedVote(m.PlayerID)
	}

	for _, player := range g.Players {
		if !player.ConfirmedVote {
			s.broadcastToRoom(m.RoomID, Message{
				Type:      game.ProcessedVoteEvent,
				PlayerID:  m.PlayerID,
				GameState: g.GetGameState(),
			})
			return
		}
	}

	g.IncrementRound()

	s.broadcastToRoom(m.RoomID, Message{
		Type:      game.RoundUpdatedEvent,
		GameState: g.GetGameState(),
	})

	nextPhase := game.SubmitCluePhase

	g.UpdatePhase(nextPhase)

	s.broadcastToRoom(m.RoomID, Message{
		Type:      game.PhaseUpdatedEvent,
		GameState: g.GetGameState(),
		Phase:     nextPhase,
	})
}

func (s *GameService) handleClueSubmitted(conn *websocket.Conn, m Message) {
	g, err := s.getGameFromRoomID(m.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to handle clue submission",
		})
		return
	}

	if _, ok := g.Clues[g.Round]; !ok {
		g.Clues[g.Round] = game.NewClueRound()
	}
	cr := g.Clues[g.Round]
	if cr.HasSubmitted(m.PlayerID) {
		return
	} else {
		if m.Text != "" {
			clue := game.Clue{
				PlayerID: m.PlayerID,
				Word:     m.Text,
			}
			cr.AddClue(clue)
			cr.AddSubmittedPlayer(m.PlayerID)
		} else {
			s.logger.Error("Clue is empty")
			s.sendMessageToConnection(conn, Message{
				Type: game.ErrorEvent,
				Text: "Clue is empty",
			})
			return
		}
	}

	s.broadcastToRoom(m.RoomID, Message{
		Type:      game.ClueSubmittedEvent,
		GameState: g.GetGameState(),
	})

	if g.AllAlivePlayersSubmittedClue(g.Round) {
		g.UpdatePhase(game.VotePhase)
		s.broadcastToRoom(m.RoomID, Message{
			Type:      game.PhaseUpdatedEvent,
			GameState: g.GetGameState(),
			Phase:     game.VotePhase,
		})
	}
}

func (s *GameService) RespondToMessage(conn *websocket.Conn, messageType int, message []byte) error {
	m, err := parseMessage(message)
	if err != nil {
		return fmt.Errorf("ParseMessage(): %w", err)
	}

	switch g := m.Type; g {
	case game.PlayerConnectedEvent:
		s.handlePlayerConnected(conn)
	case game.CreateRoomEvent:
		s.handleRoomCreatedEvent(conn, m)
	case game.UpdatePlayerNameEvent:
		s.handlePlayerUpdatedName(conn, m)
	case game.RoomCodeSubmittedEvent:
		s.handleRoomCodeSubmittedEvent(conn, m)
	case game.StartGameEvent:
		s.handleStartGame(conn, m)
	case game.RemovePlayerEvent:
		s.handleRemovePlayer(conn, m)
	case game.VoteEvent:
		s.handleVote(conn, m)
	case game.SubmitClueEvent:
		s.handleClueSubmitted(conn, m)
	default:
		return fmt.Errorf("unknown message type: %s", m.Type)
	}

	return nil
}
