package gameservice

import "github.com/gorilla/websocket"

type GameService struct {
	Rooms map[string]map[*websocket.Conn]bool
}

func generateNewRoomCode() string {
	return "ROOM123"
}
