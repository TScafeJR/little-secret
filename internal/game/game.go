package game

import "fmt"

type Game struct {
	RoomID     string
	Players    []*Player
	SecretWord string // The real password for Good Kittens
	DecoyWord  string // A different password given to Confused Kittens
	Phase      string // "discussion", "debate", "voting", or "finished"
	Round      int
	Votes      map[string]string // map from voting player ID -> voted player ID
	// ... other state as needed
}

func (g *Game) FindPlayer(playerID string) (*Player, error) {
	for _, player := range g.Players {
		if player.ID == playerID {
			return player, nil
		}
	}
	return nil, fmt.Errorf("player not found")
}
