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
	Submitted           *common.Set[id.PlayerID] `json:"-"`
	Clues               []Clue                   `json:"clues"`
	LastSubmittedPlayer id.PlayerID              `json:"lastSubmittedPlayer"`
}
