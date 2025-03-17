package game

type Event string

var (
	RoomJoinedEvent       Event = "roomJoined"
	StartGameEvent        Event = "startGame"
	AddPlayerEvent        Event = "addPlayer"
	UpdatePlayerNameEvent Event = "updatePlayerName"
	SubmitClueEvent       Event = "submitClue"
	VoteEvent             Event = "vote"
)
