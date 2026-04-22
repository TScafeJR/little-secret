package gameservice

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/TScafeJR/little-secret/internal/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// handleRejoin reconnects a client whose browser still holds a
// {roomCode, playerID} pair (typically after a page refresh or server
// restart). If the room and player both exist in memory, we rewire that
// player's Conn to the new socket and reply with the full GameState so the
// client rehydrates straight into its current phase. On any miss we send
// RejoinFailedEvent so the client can clear its localStorage and fall back
// to the lobby.
func (s *GameService) handleRejoin(conn *websocket.Conn, m Message) {
	room, ok := s.Rooms[m.RoomID]
	if !ok {
		s.sendMessageToConnection(conn, Message{
			Type: game.RejoinFailedEvent,
			Text: "Room not found",
		})
		return
	}

	g := room.Game
	player := g.GetPlayer(m.PlayerID)
	if player == nil {
		s.sendMessageToConnection(conn, Message{
			Type: game.RejoinFailedEvent,
			Text: "Player not found in room",
		})
		return
	}

	// Swap the stored player's Conn to the new socket, register the socket in
	// the room's connection set, and drop the old one (best-effort close).
	if player.Conn != nil && player.Conn != conn {
		for c := range room.Connections {
			if c == player.Conn {
				delete(room.Connections, c)
				_ = c.Close()
				break
			}
		}
	}
	player.Conn = conn
	room.Connections[conn] = true

	s.sendMessageToConnection(conn, Message{
		Type:      game.RejoinedEvent,
		RoomID:    m.RoomID,
		PlayerID:  m.PlayerID,
		Phase:     g.Phase,
		GameState: g.GetGameState(),
	})
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

	// The inbound CreateRoom message has no RoomID (the server picks it), so
	// the RespondToMessage prelude skipped it. Log it here under the generated
	// hash so replay can rebuild the room with the same id.
	if !s.replaying {
		created := Message{
			Type:     game.CreateRoomEvent,
			RoomID:   hash,
			PlayerID: msg.PlayerID,
		}
		if buf, err := json.Marshal(created); err == nil {
			if _, err := s.store.Append(context.Background(), hash, string(game.CreateRoomEvent), buf); err != nil {
				s.logger.Error("store.Append(CreateRoom)", zap.Error(err))
			}
		}
	}

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
		delete(room.Connections, conn)
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

	// The Info-phase "confirm word seen" piggybacks on this handler with an empty
	// Text, so we only block dead players during real vote phases — in Info, every
	// player (all still alive) taps through.
	if g.Phase == game.VotePhase {
		if p := g.GetPlayer(m.PlayerID); p == nil || !p.Alive {
			s.sendMessageToConnection(conn, Message{
				Type: game.ErrorEvent,
				Text: "Eliminated players can't vote",
			})
			return
		}
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
		if !player.ConfirmedVote && player.Alive {
			s.broadcastToRoom(m.RoomID, Message{
				Type:      game.ProcessedVoteEvent,
				PlayerID:  m.PlayerID,
				GameState: g.GetGameState(),
			})
			return
		}
	}

	nextPhase := game.RevealRolePhase

	if g.IsWordRevealingRound() {
		g.IncrementRound()

		s.broadcastToRoom(m.RoomID, Message{
			Type:      game.RoundUpdatedEvent,
			GameState: g.GetGameState(),
		})

		nextPhase = game.SubmitCluePhase
	}

	if nextPhase == game.RevealRolePhase {
		g.ResolveVotes()
		vr = g.GetVoteRound()

		for _, playerID := range vr.VotedOutPlayerIDs {
			g.KillPlayer(playerID)
			p := g.GetPlayer(playerID)
			if p != nil && p.Role != game.SpyKittenRole {
				s.sendMessageToConnection(p.Conn, Message{
					Type: game.WordSharedEvent,
					Text: p.SecretWord,
				})
			}
		}
	}

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

	sender := g.GetPlayer(m.PlayerID)
	if sender == nil || !sender.Alive {
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Eliminated players can't submit clues",
		})
		return
	}

	if _, ok := g.Clues[g.Round]; !ok {
		g.Clues[g.Round] = game.NewClueRound()
	}
	cr := g.Clues[g.Round]
	if cr.HasSubmitted(m.PlayerID) {
		return
	}

	if m.Text == "" {
		s.logger.Error("Clue is empty")
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Clue is empty",
		})
		return
	}

	clueText := normalizeWord(m.Text)
	// Rulebook: players can't say their own password. Spy has an empty
	// SecretWord so this only bites kittens.
	if sender.SecretWord != "" && clueText == normalizeWord(sender.SecretWord) {
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "You can't use your password as your clue",
		})
		return
	}
	// Rulebook: can't repeat another player's clue from this round.
	for _, existing := range cr.Clues {
		if normalizeWord(existing.Word) == clueText {
			s.sendMessageToConnection(conn, Message{
				Type: game.ErrorEvent,
				Text: "That clue was already used this round",
			})
			return
		}
	}

	clue := game.Clue{
		PlayerID: m.PlayerID,
		Word:     m.Text,
	}
	cr.AddClue(clue)
	cr.AddSubmittedPlayer(m.PlayerID)

	s.broadcastToRoom(m.RoomID, Message{
		Type:      game.ClueSubmittedEvent,
		GameState: g.GetGameState(),
	})

	if g.AllAlivePlayersSubmittedClue(g.Round) {
		g.ResetConfirmedVoteForAlive()
		g.UpdatePhase(game.VotePhase)
		s.broadcastToRoom(m.RoomID, Message{
			Type:      game.PhaseUpdatedEvent,
			GameState: g.GetGameState(),
			Phase:     game.VotePhase,
		})
	}
}

func (s *GameService) handleRoleConfirmed(conn *websocket.Conn, m Message) {
	g, err := s.getGameFromRoomID(m.RoomID)
	if err != nil {
		s.logger.Error("s.getGameFromRoomID", zap.Error(err))
		s.sendMessageToConnection(conn, Message{
			Type: game.ErrorEvent,
			Text: "Failed to handle role confirmation",
		})
		return
	}

	if g.Phase != game.RevealRolePhase {
		return
	}

	// Spy guess branch: guess arrives as a non-empty Text only from the spy after
	// they've been voted out. Correct guess → instant spy win regardless of board
	// state. Wrong guess → spy already killed by handleVote, game continues and
	// gets resolved normally below.
	spyGuessedCorrectly := false
	if m.Text != "" {
		voter := g.GetPlayer(m.PlayerID)
		if voter != nil && voter.Role == game.SpyKittenRole && confirmSecretWordGuess(*g, m) {
			spyGuessedCorrectly = true
		}
	}

	if spyGuessedCorrectly || g.IsOver() {
		g.Result = g.DetermineWinners(spyGuessedCorrectly)
		g.UpdatePhase(game.GameOverPhase)
		s.broadcastToRoom(m.RoomID, Message{
			Type:      game.GameOverEvent,
			GameState: g.GetGameState(),
			Phase:     game.GameOverPhase,
		})
		return
	}

	// Continue loop: advance the round so a fresh ClueRound is used, then go
	// back to SubmitClue. Without the increment, the previous round's clue map
	// would still be full and every submit would no-op (cr.HasSubmitted).
	g.IncrementRound()
	s.broadcastToRoom(m.RoomID, Message{
		Type:      game.RoundUpdatedEvent,
		GameState: g.GetGameState(),
	})

	g.UpdatePhase(game.SubmitCluePhase)
	s.broadcastToRoom(m.RoomID, Message{
		Type:      game.PhaseUpdatedEvent,
		GameState: g.GetGameState(),
		Phase:     game.SubmitCluePhase,
	})
}

func (s *GameService) RespondToMessage(conn *websocket.Conn, messageType int, message []byte) error {
	m, err := parseMessage(message)
	if err != nil {
		return fmt.Errorf("ParseMessage(): %w", err)
	}

	// One in-flight mutator at a time: each WS runs in its own goroutine; without this,
	// handleVote and friends race on game maps/slices (e.g. Set.Add → concurrent map writes).
	s.mu.Lock()
	defer s.mu.Unlock()

	// Append to the event log before dispatch. Events that reference a room
	// are recoverable; the pre-room events (PlayerConnected, CreateRoom) are
	// skipped — CreateRoom writes its own roles_assigned/words_chosen record
	// once the roomID is known.
	if !s.replaying && m.RoomID != "" {
		if _, err := s.store.Append(context.Background(), m.RoomID, string(m.Type), message); err != nil {
			s.logger.Error("store.Append", zap.String("room", string(m.RoomID)), zap.Error(err))
		}
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
	case game.RoleConfirmedEvent:
		s.handleRoleConfirmed(conn, m)
	case game.RejoinEvent:
		s.handleRejoin(conn, m)
	default:
		return fmt.Errorf("unknown message type: %s", m.Type)
	}

	// Snapshot the room's Game after every successful mutation. Recovery reads
	// the latest snapshot per room instead of replaying individual events,
	// sidestepping RNG/non-determinism concerns and making recovery robust
	// against code changes. CreateRoom populates s.Rooms inside the handler;
	// look up by whichever RoomID we know about now.
	if !s.replaying {
		roomID := m.RoomID
		if roomID == "" && m.Type == game.CreateRoomEvent {
			// handleRoomCreatedEvent already logged its own CreateRoom row with
			// the generated hash; find the just-created room by matching the
			// requesting player.
			for rid, r := range s.Rooms {
				if r.Game != nil && len(r.Game.Players) > 0 && r.Game.Players[0].ID == m.PlayerID {
					roomID = rid
					break
				}
			}
		}
		if roomID != "" {
			if room, ok := s.Rooms[roomID]; ok && room.Game != nil {
				if buf, err := json.Marshal(room.Game); err == nil {
					if _, err := s.store.Append(context.Background(), roomID, snapshotEventType, buf); err != nil {
						s.logger.Error("store.Append(snapshot)", zap.String("room", string(roomID)), zap.Error(err))
					}
				} else {
					s.logger.Error("json.Marshal(game)", zap.Error(err))
				}
			}
		}
	}

	return nil
}

// snapshotEventType is the event_type stored for full *Game JSONB snapshots.
// Distinct from any game.Event value so it never collides with inbound events.
const snapshotEventType = "_snapshot"
