package game

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
