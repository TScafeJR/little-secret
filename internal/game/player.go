package game

import "github.com/gorilla/websocket"

type Player struct {
	ID         string
	Name       string
	Role       Role
	SecretWord string
	Alive      bool
	Conn       *websocket.Conn
}
