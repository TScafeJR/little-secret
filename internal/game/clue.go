package game

import (
	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/id"
)

type Clue struct {
	Word     string      `json:"word"`
	PlayerID id.PlayerID `json:"playerID"`
}

type ClueRound struct {
	submitted             *common.Set[id.PlayerID] `json:"-"`
	Clues                 []Clue                   `json:"clues"`
	LastSubmittedPlayerID id.PlayerID              `json:"lastSubmittedPlayerID"`
}

func (cr *ClueRound) AddClue(clue Clue) {
	cr.Clues = append(cr.Clues, clue)
	cr.LastSubmittedPlayerID = clue.PlayerID
}

func (cr *ClueRound) AddSubmittedPlayer(playerID id.PlayerID) {
	cr.submitted.Add(playerID)
}

func (cr *ClueRound) HasSubmitted(playerID id.PlayerID) bool {
	return cr.submitted.Contains(playerID)
}

func (cr *ClueRound) SubmissionCount() int {
	return cr.submitted.Len()
}

func NewClueRound() *ClueRound {
	s := common.NewSet[id.PlayerID]()
	return &ClueRound{
		submitted: s,
		Clues:     []Clue{},
	}
}
