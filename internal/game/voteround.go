package game

import (
	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/id"
)

type Vote struct {
	From id.PlayerID
	To   id.PlayerID
}

type VoteRound struct {
	Submitted *common.Set[id.PlayerID]
	Round     int
	Votes     []Vote
}

func NewVoteRound(round int) *VoteRound {
	s := common.NewSet[id.PlayerID]()
	return &VoteRound{
		Submitted: s,
		Round:     round,
		Votes:     []Vote{},
	}
}
