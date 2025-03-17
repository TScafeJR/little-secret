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

type Phase string

var (
	WaitingForPlayersPhase Phase = "waitingForPlayers"
	VotePhase              Phase = "vote"
	SubmitCluePhase        Phase = "submitClue"
	RevealRolePhase        Phase = "revealRole"
	GuessWordPhase         Phase = "guessWord"
)
