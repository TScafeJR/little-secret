package game

import (
	"fmt"

	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
)

type Game struct {
	RoomID     id.RoomHash
	Players    []*Player
	SecretWord string
	DecoyWord  string
	Phase      string
	Round      int
	Votes      map[string]string
	HostID     id.PlayerID
}

func (g *Game) FindPlayer(playerID id.PlayerID) (*Player, error) {
	for _, player := range g.Players {
		if player.ID == playerID {
			return player, nil
		}
	}
	return nil, fmt.Errorf("player not found")
}

func NewGame(roomID id.RoomHash, hostID id.PlayerID, hostConn *websocket.Conn) *Game {
	h := NewPlayer(hostID, "Player 1", hostConn)
	return &Game{
		RoomID:  roomID,
		Players: []*Player{h},
		HostID:  hostID,
	}
}

type GameState struct {
	Players []*Player `json:"players"`
}

func (g *Game) GetGameState() GameState {
	return GameState{
		Players: g.Players,
	}
}
