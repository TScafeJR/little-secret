package game

import (
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
)

type Player struct {
	ID            id.PlayerID     `json:"id"`
	Name          string          `json:"displayName"`
	Role          Role            `json:"-"`
	SecretWord    string          `json:"-"`
	Alive         bool            `json:"alive"`
	Conn          *websocket.Conn `json:"-"`
	Host          bool            `json:"host"`
	ConfirmedVote bool            `json:"confirmedVote"`
}

func NewPlayer(id id.PlayerID, displayName string, conn *websocket.Conn) *Player {
	return &Player{
		ID:    id,
		Name:  displayName,
		Alive: true,
		Conn:  conn,
	}
}
