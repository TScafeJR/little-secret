package game

type Event string

var (
	RoomJoinedEvent        Event = "roomJoined"
	StartGameEvent         Event = "startGame"
	AddPlayerEvent         Event = "addPlayer"
	UpdatePlayerNameEvent  Event = "updatePlayerName"
	SubmitClueEvent        Event = "submitClue"
	VoteEvent              Event = "vote"
	PlayerConnectedEvent   Event = "playerConnected"
	RoomCreatedEvent       Event = "roomCreated"
	CreateRoomEvent        Event = "createRoom"
	PlayerJoinedEvent      Event = "playerJoined"
	RoomCodeSubmittedEvent Event = "roomCodeSubmitted"
	ErrorEvent             Event = "error"
)

type Phase string

var (
	WaitingForPlayersPhase Phase = "waitingForPlayers"
	VotePhase              Phase = "vote"
	SubmitCluePhase        Phase = "submitClue"
	RevealRolePhase        Phase = "revealRole"
	GuessWordPhase         Phase = "guessWord"
)
