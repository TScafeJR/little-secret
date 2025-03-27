package game

import "github.com/TScafeJR/little-secret/internal/id"

type Clue struct {
	Word     string      `json:"word"`
	PlayerID id.PlayerID `json:"playerID"`
}
