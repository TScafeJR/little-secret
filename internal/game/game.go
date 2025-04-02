package game

import (
	_ "embed"
	"encoding/json"
	"fmt"

	"slices"

	"github.com/TScafeJR/little-secret/internal/common"
	"github.com/TScafeJR/little-secret/internal/id"
	"github.com/gorilla/websocket"
)

var (
	//go:embed data/words.json
	wordList []byte
)

type Game struct {
	RoomID             id.RoomHash
	Players            []*Player
	SecretWord         string
	DecoyWord          string
	Phase              Phase
	Round              int
	Votes              map[int]*VoteRound
	Clues              map[int]*ClueRound
	HostID             id.PlayerID
	PlayerOrderPointer int
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
	h.Host = true

	votes := make(map[int]*VoteRound)
	clues := make(map[int]*ClueRound)

	return &Game{
		RoomID:  roomID,
		Players: []*Player{h},
		HostID:  hostID,
		Votes:   votes,
		Clues:   clues,
	}
}

func (g *Game) AddPlayer(pID id.PlayerID, conn *websocket.Conn) *Player {
	p := NewPlayer(pID, fmt.Sprintf("Player %d", len(g.Players)+1), conn)
	g.Players = append(g.Players, p)
	g.PlayerOrderPointer = g.PlayerOrderPointer + 1

	p.SortOrder = g.PlayerOrderPointer

	return p
}

type GameState struct {
	Players []*Player          `json:"players"`
	Phase   Phase              `json:"phase"`
	Clues   map[int]*ClueRound `json:"clues"`
	Round   int                `json:"round"`
	Votes   map[int]*VoteRound `json:"votes"`
}

func (g *Game) GetGameState() GameState {
	return GameState{
		Players: g.Players,
		Phase:   g.Phase,
		Clues:   g.Clues,
		Round:   g.Round,
		Votes:   g.Votes,
	}
}

func wordsToMap(words []byte) ([]map[string]string, error) {
	var rawList []map[string]string
	if err := json.Unmarshal(words, &rawList); err != nil {
		return nil, fmt.Errorf("json.Unmarshal(): %w", err)
	}
	return rawList, nil
}

func getRandomPairing(words []byte) (string, string, error) {
	rawList, err := wordsToMap(words)
	if err != nil {
		return "", "", fmt.Errorf("wordsToMap(): %w", err)
	}
	common.Shuffle(rawList)

	for _, entry := range rawList {
		for k, v := range entry {
			return k, v, nil
		}
	}

	return "", "", fmt.Errorf("no words found")
}

func (g *Game) assignRoles(c RoleConfig) error {
	if len(g.Players) != int(c.Good+c.Confused+c.Spy) {
		return fmt.Errorf("not enough players for role config")
	}

	for i := range c.Good {
		g.Players[i].Role = GoodKittenRole
	}

	for i := int(c.Good); i < int(c.Good+c.Confused); i++ {
		g.Players[i].Role = ConfusedKittenRole
	}

	for i := int(c.Good + c.Confused); i < int(c.Good+c.Confused+c.Spy); i++ {
		g.Players[i].Role = SpyKittenRole
	}

	return nil
}

func (g *Game) StartGame() error {
	config, err := getConfig(len(g.Players))
	if err != nil {
		return fmt.Errorf("getConfig(): %w", err)
	}

	common.Shuffle(g.Players)

	if err := g.assignRoles(config); err != nil {
		return fmt.Errorf("assignRoles(): %w", err)
	}

	g.SecretWord, g.DecoyWord, err = getRandomPairing(wordList)
	if err != nil {
		return fmt.Errorf("getRandomPairing(): %w", err)
	}

	for i := range g.Players {
		p := g.Players[i]
		switch p.Role {
		case GoodKittenRole:
			p.SecretWord = g.SecretWord
		case ConfusedKittenRole:
			p.SecretWord = g.DecoyWord
		default:
		}
	}

	g.Phase = InfoPhase

	return nil
}

func (g *Game) RemovePlayer(playerID id.PlayerID) error {
	for i, player := range g.Players {
		if player.ID == playerID {
			g.Players = slices.Delete(g.Players, i, i+1)
			return nil
		}
	}
	return fmt.Errorf("player not found")
}

func (g *Game) UpdatePhase(p Phase) {
	g.Phase = p
}

func (g *Game) ToggleConfirmedVote(playerID id.PlayerID) {
	for _, player := range g.Players {
		if player.ID == playerID {
			player.ConfirmedVote = !player.ConfirmedVote
		}
	}
}

func (g *Game) AllAlivePlayersSubmittedClue(round int) bool {
	roundClue, exists := g.Clues[round]
	if !exists {
		return false
	}
	return roundClue.SubmissionCount() == len(g.Players)
}

func (g *Game) IncrementRound() {
	g.Round++
}

func (g *Game) IsWordRevealingRound() bool {
	return g.Round == 0
}

func (g *Game) NumberOfAlivePlayers() int {
	count := 0
	for _, player := range g.Players {
		if player.Alive {
			count++
		}
	}
	return count
}

func (g *Game) IsOver() bool {
	// game is over if (confused + spy).alive >= good.alive
	confusedOrSpy := 0
	for _, player := range g.Players {
		if player.Role == ConfusedKittenRole || player.Role == SpyKittenRole {
			if player.Alive {
				confusedOrSpy++
			}
		}
	}

	good := g.NumberOfAlivePlayers() - confusedOrSpy

	return confusedOrSpy >= good
}

func (g *Game) ResolveVotes() {
	for _, r := range g.Votes {
		r.ResolveVotes()
	}
}

func (g *Game) GetVoteRound() *VoteRound {
	return g.Votes[g.Round]
}

func (g *Game) KillPlayer(pID id.PlayerID) {
	for _, player := range g.Players {
		if player.ID == pID {
			player.Alive = false
		}
	}

}

func (g *Game) GetPlayer(pID id.PlayerID) *Player {
	for _, player := range g.Players {
		if player.ID == pID {
			return player
		}
	}
	return nil
}
