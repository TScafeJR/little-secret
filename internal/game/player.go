package game

import (
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
)

type Player struct {
	ID         id.PlayerID
	Name       string
	Role       Role
	SecretWord string
	Alive      bool
	Conn       *websocket.Conn
}

func NewPlayer(id id.PlayerID, displayName string, conn *websocket.Conn) *Player {
	return &Player{
		ID:    id,
		Name:  displayName,
		Alive: true,
		Conn:  conn,
	}
}
