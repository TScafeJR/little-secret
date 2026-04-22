package gameservice

import (
	"context"
	"testing"
	"time"

	"github.com/TScafeJR/little-secret/internal/game"
	"go.uber.org/zap"
)

// TestRecoverRestoresRoomStateFromSnapshot drives a real room through
// CreateRoom → RoomCodeSubmitted → StartGame, then spins up a fresh
// GameService backed by the same store and asserts Recover() rebuilds the
// same room with the same players and phase.
func TestRecoverRestoresRoomStateFromSnapshot(t *testing.T) {
	h := newHarness(t)
	h.connect(4)
	roomID := h.startRoom()

	h.clients[0].send(Message{Type: game.StartGameEvent, RoomID: roomID, PlayerID: h.clients[0].PlayerID})
	h.clients[0].waitFor(phaseEquals(game.InfoPhase), 2*time.Second)

	origGame := h.currentGame(roomID)
	origPhase := origGame.Phase
	origPlayerCount := len(origGame.Players)

	// Fresh service, same store.
	store := h.svc.store
	svc2, err := New(&ServiceCfg{Logger: zap.NewNop(), Store: store})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if err := svc2.Recover(context.Background()); err != nil {
		t.Fatalf("Recover: %v", err)
	}

	restored, ok := svc2.Rooms[roomID]
	if !ok {
		t.Fatalf("room %s not restored", roomID)
	}
	if restored.Game == nil {
		t.Fatalf("restored room has nil Game")
	}
	if restored.Game.Phase != origPhase {
		t.Errorf("phase = %s, want %s", restored.Game.Phase, origPhase)
	}
	if len(restored.Game.Players) != origPlayerCount {
		t.Errorf("player count = %d, want %d", len(restored.Game.Players), origPlayerCount)
	}
	if len(restored.Connections) != 0 {
		t.Errorf("restored room should have 0 connections until REJOIN, got %d", len(restored.Connections))
	}
}
