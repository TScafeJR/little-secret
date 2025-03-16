package game

import "github.com/gorilla/websocket"

type Player struct {
	ID         string
	Name       string
	Role       string // "Good Kitten", "Confused Kitten", or "Spy Pup"
	SecretWord string // The password if the role has one
	Alive      bool
	Conn       *websocket.Conn // WebSocket connection for this player
}
