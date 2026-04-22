package game

import (
	"testing"

	"github.com/TScafeJR/little-secret/internal/id"
)

func TestAllAlivePlayersSubmittedClue_countsAliveOnly(t *testing.T) {
	g := &Game{
		Round: 1,
		Players: []*Player{
			{ID: "a", Alive: true, SortOrder: 1},
			{ID: "b", Alive: true, SortOrder: 2},
			{ID: "c", Alive: true, SortOrder: 3},
			{ID: "d", Alive: false, SortOrder: 4},
		},
		Clues: map[int]*ClueRound{},
	}
	g.Clues[1] = NewClueRound()
	cr := g.Clues[1]
	for _, pid := range []id.PlayerID{"a", "b", "c"} {
		cr.AddClue(Clue{PlayerID: pid, Word: "x"})
		cr.AddSubmittedPlayer(pid)
	}
	if !g.AllAlivePlayersSubmittedClue(1) {
		t.Fatal("expected true when every alive player has submitted a clue")
	}
}

func TestAllAlivePlayersSubmittedClue_falseWhenMissingAliveSubmission(t *testing.T) {
	g := &Game{
		Round: 1,
		Players: []*Player{
			{ID: "a", Alive: true, SortOrder: 1},
			{ID: "b", Alive: true, SortOrder: 2},
			{ID: "c", Alive: true, SortOrder: 3},
			{ID: "d", Alive: false, SortOrder: 4},
		},
		Clues: map[int]*ClueRound{},
	}
	g.Clues[1] = NewClueRound()
	cr := g.Clues[1]
	for _, pid := range []id.PlayerID{"a", "b"} {
		cr.AddClue(Clue{PlayerID: pid, Word: "x"})
		cr.AddSubmittedPlayer(pid)
	}
	if g.AllAlivePlayersSubmittedClue(1) {
		t.Fatal("expected false when an alive player has not submitted")
	}
}

func playersFromCounts(good, confused, spy int, deadGood, deadConfused, deadSpy int) []*Player {
	ps := []*Player{}
	for range good {
		ps = append(ps, &Player{ID: id.PlayerID("g"), Role: GoodKittenRole, Alive: true})
	}
	for range deadGood {
		ps = append(ps, &Player{ID: id.PlayerID("g"), Role: GoodKittenRole, Alive: false})
	}
	for range confused {
		ps = append(ps, &Player{ID: id.PlayerID("c"), Role: ConfusedKittenRole, Alive: true})
	}
	for range deadConfused {
		ps = append(ps, &Player{ID: id.PlayerID("c"), Role: ConfusedKittenRole, Alive: false})
	}
	for range spy {
		ps = append(ps, &Player{ID: id.PlayerID("s"), Role: SpyKittenRole, Alive: true})
	}
	for range deadSpy {
		ps = append(ps, &Player{ID: id.PlayerID("s"), Role: SpyKittenRole, Alive: false})
	}
	return ps
}

func TestIsOver(t *testing.T) {
	cases := []struct {
		name            string
		good, conf, spy int
		dGood, dC, dSpy int
		wantOver        bool
	}{
		{"fresh 4p", 3, 1, 0, 0, 0, 0, false},
		{"4p confused out", 3, 0, 0, 0, 1, 0, true},
		{"5p fresh", 3, 1, 1, 0, 0, 0, false},
		{"5p spy out confused remains", 3, 1, 0, 0, 0, 1, false},
		{"5p good down to 2, confused+spy alive", 2, 1, 1, 1, 0, 0, true},
		{"5p all impostors out", 3, 0, 0, 0, 1, 1, true},
		{"7p fresh", 4, 2, 1, 0, 0, 0, false},
		{"7p one confused voted", 4, 1, 1, 0, 1, 0, false},
		{"7p imposters tied with good", 2, 1, 1, 2, 1, 0, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			g := &Game{Players: playersFromCounts(c.good, c.conf, c.spy, c.dGood, c.dC, c.dSpy)}
			if got := g.IsOver(); got != c.wantOver {
				t.Fatalf("IsOver=%v, want %v", got, c.wantOver)
			}
		})
	}
}

func TestDetermineWinners(t *testing.T) {
	t.Run("spy guessed word", func(t *testing.T) {
		g := &Game{Players: playersFromCounts(3, 1, 0, 0, 0, 1)}
		r := g.DetermineWinners(true)
		if r.Reason != ReasonSpyGuessedWord {
			t.Fatalf("reason=%q, want %q", r.Reason, ReasonSpyGuessedWord)
		}
		if len(r.WinningRoles) != 1 || r.WinningRoles[0] != SpyKittenRole {
			t.Fatalf("winners=%v, want [spyKitten]", r.WinningRoles)
		}
	})

	t.Run("all imposters eliminated", func(t *testing.T) {
		g := &Game{Players: playersFromCounts(3, 0, 0, 0, 1, 1)}
		r := g.DetermineWinners(false)
		if r.Reason != ReasonAllImpostersOut {
			t.Fatalf("reason=%q", r.Reason)
		}
		if len(r.WinningRoles) != 1 || r.WinningRoles[0] != GoodKittenRole {
			t.Fatalf("winners=%v", r.WinningRoles)
		}
	})

	t.Run("imposters survived includes all alive imposter roles", func(t *testing.T) {
		g := &Game{Players: playersFromCounts(1, 1, 1, 2, 0, 0)}
		r := g.DetermineWinners(false)
		if r.Reason == "" {
			t.Fatalf("expected a reason")
		}
		found := map[Role]bool{}
		for _, w := range r.WinningRoles {
			found[w] = true
		}
		if !found[ConfusedKittenRole] || !found[SpyKittenRole] {
			t.Fatalf("expected both confused and spy as winners, got %v", r.WinningRoles)
		}
	})

	t.Run("two players left flagged", func(t *testing.T) {
		g := &Game{Players: playersFromCounts(1, 0, 1, 2, 1, 0)}
		r := g.DetermineWinners(false)
		if r.Reason != ReasonTwoPlayersLeft {
			t.Fatalf("reason=%q, want %q", r.Reason, ReasonTwoPlayersLeft)
		}
	})
}

func TestIncrementRound(t *testing.T) {
	g := &Game{Round: 2}
	g.IncrementRound()
	if g.Round != 3 {
		t.Fatalf("Round=%d, want 3", g.Round)
	}
}

func TestKillPlayer(t *testing.T) {
	g := &Game{Players: []*Player{{ID: "a", Alive: true}, {ID: "b", Alive: true}}}
	g.KillPlayer("a")
	if g.Players[0].Alive {
		t.Fatal("a should be dead")
	}
	if !g.Players[1].Alive {
		t.Fatal("b should still be alive")
	}
}

func TestResetConfirmedVoteForAlive(t *testing.T) {
	g := &Game{
		Players: []*Player{
			{ID: "a", Alive: true, ConfirmedVote: true},
			{ID: "b", Alive: false, ConfirmedVote: true},
		},
	}
	g.ResetConfirmedVoteForAlive()
	if !g.Players[0].ConfirmedVote {
		// ok
	} else {
		t.Fatal("alive player should have confirmedVote reset to false")
	}
	if !g.Players[1].ConfirmedVote {
		t.Fatal("dead player confirmedVote should be unchanged")
	}
}
