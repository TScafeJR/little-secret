package game

import (
	"testing"

	"github.com/TScafeJR/little-secret/internal/id"
)

func TestVoteRound_ResolveVotes_singleTargetWins(t *testing.T) {
	vr := NewVoteRound()
	vr.AddVote(Vote{From: "a", To: "x"})
	vr.AddVote(Vote{From: "b", To: "x"})
	vr.AddVote(Vote{From: "c", To: "y"})
	vr.ResolveVotes()
	if len(vr.VotedOutPlayerIDs) != 1 || vr.VotedOutPlayerIDs[0] != id.PlayerID("x") {
		t.Fatalf("expected only x voted out, got %#v", vr.VotedOutPlayerIDs)
	}
}

func TestVoteRound_ResolveVotes_tieRandomPick(t *testing.T) {
	vr := NewVoteRound()
	vr.AddVote(Vote{From: "a", To: "x"})
	vr.AddVote(Vote{From: "b", To: "y"})
	vr.ResolveVotes()
	if len(vr.VotedOutPlayerIDs) != 1 {
		t.Fatalf("expected single elimination on tie, got %#v", vr.VotedOutPlayerIDs)
	}
	picked := vr.VotedOutPlayerIDs[0]
	if picked != id.PlayerID("x") && picked != id.PlayerID("y") {
		t.Fatalf("expected picked player from tied set, got %q", picked)
	}
	if len(vr.TiedPlayerIDs) != 2 {
		t.Fatalf("expected TiedPlayerIDs to preserve both tied players, got %#v", vr.TiedPlayerIDs)
	}
}
