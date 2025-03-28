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
	Type          game.Event     `json:"type,omitzero"`
	RoomID        id.RoomHash    `json:"roomID,omitzero"`
	Phase         game.Phase     `json:"phase,omitzero"`
	PlayerID      id.PlayerID    `json:"playerID,omitzero"`
	Text          string         `json:"text,omitzero"`
	MessageID     id.MessageID   `json:"messageID,omitzero"`
	Player        *game.Player   `json:"player,omitzero"`
	GameState     game.GameState `json:"gameState,omitzero"`
	MessageSender id.PlayerID    `json:"messageSender,omitzero"`
}

func NewMessage(m Message) Message {
	i := uuid.CreateUUID().String()

	rm := m
	rm.MessageID = id.MessageID(i)
	return rm
}

func (s *GameService) broadcastToRoom(roomID id.RoomHash, msg Message) {
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

func (s *GameService) handlePlayerUpdatedName(_ *websocket.Conn, message Message) {
	g, err := s.getGameFromRoomID(message.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
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

func (s *GameService) handleStartGame(_ *websocket.Conn, m Message) {
	g, err := s.getGameFromRoomID(m.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		return
	}

	if err = g.StartGame(); err != nil {
		s.logger.Error("g.StartGame()", zap.Error(err))
		return
	}

	s.broadcastToRoom(m.RoomID, Message{
		Type:  game.PhaseUpdatedEvent,
		Phase: game.InfoPhase,
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

func (s *GameService) handleVote(_ *websocket.Conn, m Message) {
	g, err := s.getGameFromRoomID(m.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
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
			vr.Votes = append(vr.Votes, v)
		}
		for i := range g.Players {
			if g.Players[i].ID == m.PlayerID {
				g.Players[i].ConfirmedVote = true
			}
		}
	}

	s.broadcastToRoom(m.RoomID, Message{
		Type:      game.ProcessedVoteEvent,
		PlayerID:  m.PlayerID,
		GameState: g.GetGameState(),
	})
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
