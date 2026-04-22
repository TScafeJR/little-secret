package game

type ResultReason string

var (
	ReasonAllImpostersOut  ResultReason = "allImpostersOut"
	ReasonImpostersSurvive ResultReason = "impostersSurvived"
	ReasonSpyGuessedWord   ResultReason = "spyGuessedWord"
	ReasonTwoPlayersLeft   ResultReason = "twoPlayersLeft"
)

type Result struct {
	WinningRoles []Role       `json:"winningRoles"`
	Reason       ResultReason `json:"reason,omitempty"`
}
