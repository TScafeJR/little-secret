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
	ChangePhaseEvent       Event = "changePhase"
	PhaseUpdatedEvent      Event = "phaseUpdated"
	RoleRevealEvent        Event = "roleReveal"
	RemovePlayerEvent      Event = "removePlayer"
	HostLeftGameEvent      Event = "hostLeftGame"
	ProcessedVoteEvent     Event = "processedVote"
	ClueSubmittedEvent     Event = "clueSubmitted"
	RoundUpdatedEvent      Event = "roundUpdated"
	WordSharedEvent        Event = "wordShared"
	RoleConfirmedEvent     Event = "roleConfirmed"
	GameOverEvent          Event = "gameOver"
	RejoinEvent            Event = "rejoin"
	RejoinFailedEvent      Event = "rejoinFailed"
	RejoinedEvent          Event = "rejoined"
)

type Phase string

var (
	WaitingForPlayersPhase Phase = "waitingForPlayers"
	InfoPhase              Phase = "info"
	VotePhase              Phase = "vote"
	SubmitCluePhase        Phase = "submitClue"
	RevealRolePhase        Phase = "revealRole"
	GuessWordPhase         Phase = "guessWord"
	GameOverPhase          Phase = "gameOver"
)
