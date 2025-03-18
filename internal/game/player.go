package game

import (
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
)

type Player struct {
	ID         id.PlayerID     `json:"id"`
	Name       string          `json:"name"`
	Role       Role            `json:"role,omitzero"`
	SecretWord string          `json:"secretWord,omitzero"`
	Alive      bool            `json:"alive"`
	Conn       *websocket.Conn `json:"-"`
}

func NewPlayer(id id.PlayerID, displayName string, conn *websocket.Conn) *Player {
	return &Player{
		ID:    id,
		Name:  displayName,
		Alive: true,
		Conn:  conn,
	}
}
