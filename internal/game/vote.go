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
	Submitted         *common.Set[id.PlayerID]    `json:"-"`
	Votes             []Vote                      `json:"votes"`
	VotedOutPlayerIDs []id.PlayerID               `json:"votedOutPlayerIDs"`
	TiedPlayerIDs     []id.PlayerID               `json:"tiedPlayerIDs"`
	VoteMap           map[id.PlayerID]id.PlayerID `json:"voteMap"`
}

func NewVoteRound() *VoteRound {
	s := common.NewSet[id.PlayerID]()
	vm := make(map[id.PlayerID]id.PlayerID)

	return &VoteRound{
		Submitted:         s,
		Votes:             []Vote{},
		VotedOutPlayerIDs: []id.PlayerID{},
		TiedPlayerIDs:     []id.PlayerID{},
		VoteMap:           vm,
	}
}

func (vr *VoteRound) AddVote(vote Vote) {
	vr.Votes = append(vr.Votes, vote)
	vr.VoteMap[vote.From] = vote.To
}

func (vr *VoteRound) resolveVotes() map[id.PlayerID]int {
	voteCount := make(map[id.PlayerID]int)
	for _, vote := range vr.Votes {
		voteCount[vote.To]++
	}
	return voteCount
}

func (vr *VoteRound) getTopVoteGetters() []id.PlayerID {
	voteCount := vr.resolveVotes()
	maxVotes := 0

	for _, count := range voteCount {
		if count > maxVotes {
			maxVotes = count
		}
	}

	var top []id.PlayerID
	for playerID, count := range voteCount {
		if count == maxVotes {
			top = append(top, playerID)
		}
	}

	return top
}

// ResolveVotes decides who is eliminated. On a tie, one player is picked at
// random from the tied set; the full tied list is preserved on TiedPlayerIDs
// so the UI can surface it.
func (vr *VoteRound) ResolveVotes() {
	top := vr.getTopVoteGetters()
	if len(top) == 0 {
		vr.VotedOutPlayerIDs = nil
		vr.TiedPlayerIDs = nil
		return
	}

	if len(top) == 1 {
		vr.VotedOutPlayerIDs = []id.PlayerID{top[0]}
		vr.TiedPlayerIDs = nil
		return
	}

	tied := append([]id.PlayerID(nil), top...)
	common.Shuffle(top)
	vr.VotedOutPlayerIDs = []id.PlayerID{top[0]}
	vr.TiedPlayerIDs = tied
}
