package gameservice

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/TScafeJR/little-secret/internal/game"
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// testClient wraps a websocket.Conn with an inbound message channel so tests
// can wait for specific server events without races.
type testClient struct {
	t        *testing.T
	conn     *websocket.Conn
	inbound  chan Message
	PlayerID id.PlayerID
	RoomID   id.RoomHash
}

func newTestClient(t *testing.T, srvURL string) *testClient {
	t.Helper()
	u, err := url.Parse(srvURL)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	u.Scheme = "ws"
	u.Path = "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	c := &testClient{
		t:       t,
		conn:    conn,
		inbound: make(chan Message, 64),
	}
	go c.readLoop()
	return c
}

func (c *testClient) readLoop() {
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			close(c.inbound)
			return
		}
		var m Message
		if err := json.Unmarshal(data, &m); err != nil {
			continue
		}
		c.inbound <- m
	}
}

func (c *testClient) send(m Message) {
	c.t.Helper()
	if err := c.conn.WriteJSON(m); err != nil {
		c.t.Fatalf("write: %v", err)
	}
}

// waitFor pulls messages from the inbound channel until one matches pred.
// Returns the matching message or fails the test on timeout.
func (c *testClient) waitFor(pred func(Message) bool, timeout time.Duration) Message {
	c.t.Helper()
	deadline := time.After(timeout)
	for {
		select {
		case m, ok := <-c.inbound:
			if !ok {
				c.t.Fatalf("client closed while waiting")
			}
			if pred(m) {
				return m
			}
		case <-deadline:
			c.t.Fatalf("timeout waiting for message")
		}
	}
}

func ofType(e game.Event) func(Message) bool {
	return func(m Message) bool { return m.Type == e }
}

func phaseEquals(p game.Phase) func(Message) bool {
	return func(m Message) bool {
		return (m.Type == game.PhaseUpdatedEvent || m.Type == game.GameOverEvent) && m.Phase == p
	}
}

type harness struct {
	t       *testing.T
	srv     *httptest.Server
	svc     *GameService
	clients []*testClient
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	logger := zap.NewNop()
	svc, err := New(&ServiceCfg{Logger: logger, Store: NewMemoryEventStore()})
	if err != nil {
		t.Fatalf("service New: %v", err)
	}
	srv := httptest.NewServer(http.HandlerFunc(svc.HandleWebSocket))
	t.Cleanup(func() {
		svc.CloseAllConnections()
		srv.Close()
	})
	return &harness{t: t, srv: srv, svc: svc}
}

func (h *harness) connect(n int) []*testClient {
	h.t.Helper()
	for range n {
		c := newTestClient(h.t, h.srv.URL)
		c.send(Message{Type: game.PlayerConnectedEvent})
		m := c.waitFor(ofType(game.PlayerConnectedEvent), 2*time.Second)
		c.PlayerID = m.PlayerID
		h.clients = append(h.clients, c)
	}
	return h.clients
}

// startRoom has client[0] host a room and the rest join.
func (h *harness) startRoom() id.RoomHash {
	h.t.Helper()
	host := h.clients[0]
	host.send(Message{Type: game.CreateRoomEvent, PlayerID: host.PlayerID})
	m := host.waitFor(ofType(game.RoomCreatedEvent), 2*time.Second)
	room := m.RoomID
	host.RoomID = room
	// host also gets an initial PlayerJoinedEvent — drain it so later waits don't see it.
	host.waitFor(ofType(game.PlayerJoinedEvent), 2*time.Second)

	for _, c := range h.clients[1:] {
		c.send(Message{
			Type:     game.RoomCodeSubmittedEvent,
			PlayerID: c.PlayerID,
			Text:     string(room),
		})
		c.waitFor(ofType(game.RoomJoinedEvent), 2*time.Second)
		c.RoomID = room
	}
	// Drain the PlayerJoined broadcasts. Host already drained the initial one
	// above; each subsequent join broadcasts to everyone in the room at that
	// moment. So client i (1-indexed in join order) sees self + later joiners.
	for i, c := range h.clients {
		var expected int
		if i == 0 {
			expected = len(h.clients) - 1
		} else {
			expected = len(h.clients) - i
		}
		for range expected {
			c.waitFor(ofType(game.PlayerJoinedEvent), 2*time.Second)
		}
	}
	return room
}

func (h *harness) currentGame(room id.RoomHash) *game.Game {
	h.t.Helper()
	g, err := h.svc.getGameFromRoomID(room)
	if err != nil {
		h.t.Fatalf("game not found: %v", err)
	}
	return g
}

// confirmWordForAll advances past the Info phase by sending an empty-text VOTE
// from every client, matching the real "Confirm word seen" UI flow.
func (h *harness) confirmWordForAll(room id.RoomHash) {
	h.t.Helper()
	for _, c := range h.clients {
		c.send(Message{Type: game.VoteEvent, PlayerID: c.PlayerID, RoomID: room})
	}
	// Wait for any phase update to SubmitClue on the last client
	h.clients[len(h.clients)-1].waitFor(phaseEquals(game.SubmitCluePhase), 2*time.Second)
}

// submitClueAllAlive has every alive player submit a unique clue; drains events.
func (h *harness) submitClueAllAlive(room id.RoomHash, baseWord string) {
	h.t.Helper()
	g := h.currentGame(room)
	for _, c := range h.clients {
		p := g.GetPlayer(c.PlayerID)
		if p == nil || !p.Alive {
			continue
		}
		clue := baseWord + "-" + string(c.PlayerID)[:4]
		c.send(Message{
			Type:     game.SubmitClueEvent,
			PlayerID: c.PlayerID,
			RoomID:   room,
			Text:     clue,
		})
	}
	// Wait for phase to advance to Vote
	h.clients[0].waitFor(phaseEquals(game.VotePhase), 2*time.Second)
}

// voteAll votes every alive player for `target`; target votes for the first
// alive non-target. Drains phase update.
func (h *harness) voteAll(room id.RoomHash, target id.PlayerID) {
	h.t.Helper()
	g := h.currentGame(room)
	fallback := id.PlayerID("")
	for _, p := range g.Players {
		if p.Alive && p.ID != target {
			fallback = p.ID
			break
		}
	}
	for _, c := range h.clients {
		p := g.GetPlayer(c.PlayerID)
		if p == nil || !p.Alive {
			continue
		}
		to := target
		if c.PlayerID == target {
			to = fallback
		}
		c.send(Message{
			Type:     game.VoteEvent,
			PlayerID: c.PlayerID,
			RoomID:   room,
			Text:     string(to),
		})
	}
}

func findPlayerByRole(g *game.Game, role game.Role) *game.Player {
	for _, p := range g.Players {
		if p.Role == role {
			return p
		}
	}
	return nil
}

func (h *harness) clientFor(playerID id.PlayerID) *testClient {
	for _, c := range h.clients {
		if c.PlayerID == playerID {
			return c
		}
	}
	h.t.Fatalf("no client for player %q", playerID)
	return nil
}

// --- tests ---

func TestFullRoundTripIncrementsRoundAndEndsGame(t *testing.T) {
	h := newHarness(t)
	h.connect(4)
	room := h.startRoom()
	host := h.clients[0]

	host.send(Message{Type: game.StartGameEvent, RoomID: room, PlayerID: host.PlayerID})
	host.waitFor(phaseEquals(game.InfoPhase), 2*time.Second)

	h.confirmWordForAll(room)
	g := h.currentGame(room)
	if g.Round != 1 {
		t.Fatalf("expected Round=1 after Info confirm, got %d", g.Round)
	}

	// Run vote rounds until the game ends. Each iteration: all alive submit a clue,
	// everyone votes for the first alive confused kitten, then continue past reveal.
	for round := 0; round < 5 && g.Phase != game.GameOverPhase; round++ {
		h.submitClueAllAlive(room, "word")

		// Target a still-alive confused kitten (guaranteed win path: Good wins).
		target := findPlayerByRole(g, game.ConfusedKittenRole)
		for target == nil || !target.Alive {
			// all confused dead — shouldn't happen in 4p before GameOver
			break
		}
		if target == nil {
			t.Fatalf("no confused target available")
		}
		h.voteAll(room, target.ID)

		// Wait for RevealRole or GameOver
		host.waitFor(func(m Message) bool {
			return (m.Type == game.PhaseUpdatedEvent || m.Type == game.GameOverEvent) &&
				(m.Phase == game.RevealRolePhase || m.Phase == game.GameOverPhase)
		}, 2*time.Second)

		if g.Phase == game.GameOverPhase {
			break
		}

		// host continues; kicks off SubmitClue (if not over) or GameOver
		host.send(Message{
			Type:     game.RoleConfirmedEvent,
			PlayerID: host.PlayerID,
			RoomID:   room,
		})

		host.waitFor(func(m Message) bool {
			return (m.Type == game.PhaseUpdatedEvent || m.Type == game.GameOverEvent) &&
				(m.Phase == game.SubmitCluePhase || m.Phase == game.GameOverPhase)
		}, 2*time.Second)
	}

	if g.Phase != game.GameOverPhase {
		t.Fatalf("expected game to end; phase=%s", g.Phase)
	}
	if g.Result == nil {
		t.Fatalf("expected Result set on game over")
	}
	if g.Result.Reason != game.ReasonAllImpostersOut {
		t.Fatalf("expected allImpostersOut reason, got %q", g.Result.Reason)
	}
	if len(g.Result.WinningRoles) != 1 || g.Result.WinningRoles[0] != game.GoodKittenRole {
		t.Fatalf("expected good-kitten win, got %v", g.Result.WinningRoles)
	}
}

func TestDeadPlayerClueRejected(t *testing.T) {
	h := newHarness(t)
	h.connect(4)
	room := h.startRoom()
	host := h.clients[0]
	host.send(Message{Type: game.StartGameEvent, RoomID: room, PlayerID: host.PlayerID})
	host.waitFor(phaseEquals(game.InfoPhase), 2*time.Second)
	h.confirmWordForAll(room)

	// Mark one client dead manually to avoid running a whole vote loop
	g := h.currentGame(room)
	dead := h.clients[1]
	h.svc.mu.Lock()
	g.GetPlayer(dead.PlayerID).Alive = false
	h.svc.mu.Unlock()

	dead.send(Message{
		Type:     game.SubmitClueEvent,
		PlayerID: dead.PlayerID,
		RoomID:   room,
		Text:     "nope",
	})
	m := dead.waitFor(ofType(game.ErrorEvent), 2*time.Second)
	if !strings.Contains(strings.ToLower(m.Text), "eliminated") {
		t.Fatalf("expected eliminated-players error, got %q", m.Text)
	}
}

func TestClueEqualsSecretWordRejected(t *testing.T) {
	h := newHarness(t)
	h.connect(4)
	room := h.startRoom()
	host := h.clients[0]
	host.send(Message{Type: game.StartGameEvent, RoomID: room, PlayerID: host.PlayerID})
	host.waitFor(phaseEquals(game.InfoPhase), 2*time.Second)
	h.confirmWordForAll(room)

	g := h.currentGame(room)
	// Any good/confused kitten has a non-empty SecretWord; take the first.
	var kitten *testClient
	for _, c := range h.clients {
		p := g.GetPlayer(c.PlayerID)
		if p != nil && p.SecretWord != "" {
			kitten = c
			break
		}
	}
	if kitten == nil {
		t.Fatalf("no kitten with a password found")
	}
	secret := g.GetPlayer(kitten.PlayerID).SecretWord
	kitten.send(Message{
		Type:     game.SubmitClueEvent,
		PlayerID: kitten.PlayerID,
		RoomID:   room,
		Text:     strings.ToUpper(secret), // exercises case-insensitive check
	})
	m := kitten.waitFor(ofType(game.ErrorEvent), 2*time.Second)
	if !strings.Contains(strings.ToLower(m.Text), "password") {
		t.Fatalf("expected password error, got %q", m.Text)
	}
}

func TestDuplicateClueRejected(t *testing.T) {
	h := newHarness(t)
	h.connect(4)
	room := h.startRoom()
	host := h.clients[0]
	host.send(Message{Type: game.StartGameEvent, RoomID: room, PlayerID: host.PlayerID})
	host.waitFor(phaseEquals(game.InfoPhase), 2*time.Second)
	h.confirmWordForAll(room)

	// First client submits "same"; second submits "SAME" — should be rejected.
	h.clients[0].send(Message{
		Type:     game.SubmitClueEvent,
		PlayerID: h.clients[0].PlayerID,
		RoomID:   room,
		Text:     "same",
	})
	h.clients[0].waitFor(ofType(game.ClueSubmittedEvent), 2*time.Second)
	h.clients[1].send(Message{
		Type:     game.SubmitClueEvent,
		PlayerID: h.clients[1].PlayerID,
		RoomID:   room,
		Text:     "SAME",
	})
	m := h.clients[1].waitFor(ofType(game.ErrorEvent), 2*time.Second)
	if !strings.Contains(strings.ToLower(m.Text), "already used") {
		t.Fatalf("expected duplicate-clue error, got %q", m.Text)
	}
}

func TestSpyCorrectGuessEndsGameInSpyWin(t *testing.T) {
	h := newHarness(t)
	h.connect(5)
	room := h.startRoom()
	host := h.clients[0]
	host.send(Message{Type: game.StartGameEvent, RoomID: room, PlayerID: host.PlayerID})
	host.waitFor(phaseEquals(game.InfoPhase), 2*time.Second)
	h.confirmWordForAll(room)
	h.submitClueAllAlive(room, "c")

	g := h.currentGame(room)
	spy := findPlayerByRole(g, game.SpyKittenRole)
	if spy == nil {
		t.Fatalf("expected a spy in 5p game")
	}
	h.voteAll(room, spy.ID)
	host.waitFor(phaseEquals(game.RevealRolePhase), 2*time.Second)

	g = h.currentGame(room)
	secret := g.SecretWord
	spyClient := h.clientFor(spy.ID)
	spyClient.send(Message{
		Type:     game.RoleConfirmedEvent,
		PlayerID: spy.ID,
		RoomID:   room,
		Text:     string(secret),
	})
	host.waitFor(phaseEquals(game.GameOverPhase), 2*time.Second)
	g = h.currentGame(room)
	if g.Result == nil {
		t.Fatalf("expected result after spy win")
	}
	if g.Result.Reason != game.ReasonSpyGuessedWord {
		t.Fatalf("expected spyGuessedWord, got %q", g.Result.Reason)
	}
}

func TestSpyWrongGuessContinuesToSubmitClue(t *testing.T) {
	h := newHarness(t)
	h.connect(5)
	room := h.startRoom()
	host := h.clients[0]
	host.send(Message{Type: game.StartGameEvent, RoomID: room, PlayerID: host.PlayerID})
	host.waitFor(phaseEquals(game.InfoPhase), 2*time.Second)
	h.confirmWordForAll(room)
	h.submitClueAllAlive(room, "w")

	g := h.currentGame(room)
	spy := findPlayerByRole(g, game.SpyKittenRole)
	if spy == nil {
		t.Fatalf("expected a spy in 5p game")
	}
	h.voteAll(room, spy.ID)
	host.waitFor(phaseEquals(game.RevealRolePhase), 2*time.Second)

	h.clientFor(spy.ID).send(Message{
		Type:     game.RoleConfirmedEvent,
		PlayerID: spy.ID,
		RoomID:   room,
		Text:     "obviously-wrong-guess-xyz",
	})
	host.waitFor(phaseEquals(game.SubmitCluePhase), 2*time.Second)
	g = h.currentGame(room)
	if g.Phase != game.SubmitCluePhase {
		t.Fatalf("expected SubmitClue after wrong guess, got %s", g.Phase)
	}
	if g.Result != nil {
		t.Fatalf("expected no game result yet, got %v", g.Result)
	}
}
