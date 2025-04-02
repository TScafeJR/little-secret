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
	VoteMap           map[id.PlayerID]id.PlayerID `json:"voteMap"`
}

func NewVoteRound() *VoteRound {
	s := common.NewSet[id.PlayerID]()
	vm := make(map[id.PlayerID]id.PlayerID)

	return &VoteRound{
		Submitted:         s,
		Votes:             []Vote{},
		VotedOutPlayerIDs: []id.PlayerID{},
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

func (vr *VoteRound) getVotedOutMembers() []id.PlayerID {
	// find maximum vote count, return all players with that count
	voteCount := vr.resolveVotes()
	maxVotes := 0

	for _, count := range voteCount {
		if count > maxVotes {
			maxVotes = count
		}
	}

	var votedOutMembers []id.PlayerID
	for playerID, count := range voteCount {
		if count == maxVotes {
			votedOutMembers = append(votedOutMembers, playerID)
		}
	}

	return votedOutMembers
}

func (vr *VoteRound) ResolveVotes() {
	vr.VotedOutPlayerIDs = vr.getVotedOutMembers()
}
