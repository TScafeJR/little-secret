package gameservice

import (
	"testing"
	"time"

	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/id"
)

func TestRejoin_SwapsConnAndReturnsGameState(t *testing.T) {
	h := newHarness(t)
	h.connect(4)
	room := h.startRoom()

	// Original client leaves; a fresh socket rejoins under the same id.
	original := h.clients[0]
	playerID := original.PlayerID
	original.conn.Close()

	c := newTestClient(t, h.srv.URL)
	c.send(Message{Type: game.RejoinEvent, RoomID: room, PlayerID: playerID})
	m := c.waitFor(ofType(game.RejoinedEvent), 2*time.Second)

	if m.RoomID != room {
		t.Errorf("rejoined roomID = %s, want %s", m.RoomID, room)
	}
	if m.PlayerID != playerID {
		t.Errorf("rejoined playerID = %s, want %s", m.PlayerID, playerID)
	}
	if len(m.GameState.Players) != 4 {
		t.Errorf("gameState.players = %d, want 4", len(m.GameState.Players))
	}
}

func TestRejoin_UnknownRoomFails(t *testing.T) {
	h := newHarness(t)
	h.connect(1)

	c := h.clients[0]
	c.send(Message{Type: game.RejoinEvent, RoomID: id.RoomHash("no-such-room"), PlayerID: c.PlayerID})
	m := c.waitFor(ofType(game.RejoinFailedEvent), 2*time.Second)
	if m.Text == "" {
		t.Errorf("expected reason text on rejoinFailed, got empty")
	}
}

func TestRejoin_UnknownPlayerFails(t *testing.T) {
	h := newHarness(t)
	h.connect(4)
	room := h.startRoom()

	c := newTestClient(t, h.srv.URL)
	c.send(Message{Type: game.RejoinEvent, RoomID: room, PlayerID: id.PlayerID("ghost")})
	m := c.waitFor(ofType(game.RejoinFailedEvent), 2*time.Second)
	if m.Text == "" {
		t.Errorf("expected reason text on rejoinFailed, got empty")
	}
}
