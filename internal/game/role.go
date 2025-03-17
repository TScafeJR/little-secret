package game

type Role string

var (
	GoodKittenRole     Role = "goodKitten"
	ConfusedKittenRole Role = "confusedKitten"
	SpyKittenRole      Role = "spyKitten"
)

type RoleConfig struct {
	Good     uint8 `json:"good"`
	Confused uint8 `json:"confused"`
	Spy      uint8 `json:"spy"`
}
