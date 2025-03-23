package game

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

type Role string

var (
	GoodKittenRole     Role = "goodKitten"
	ConfusedKittenRole Role = "confusedKitten"
	SpyKittenRole      Role = "spyKitten"
)

var (
	//go:embed data/role-config.json
	roleConfig []byte
)

type RoleConfig struct {
	Good     uint8 `json:"good"`
	Confused uint8 `json:"confused"`
	Spy      uint8 `json:"spy"`
}

func getConfig(numPlayers int) (RoleConfig, error) {
	var c map[string]RoleConfig
	if err := json.Unmarshal(roleConfig, &c); err != nil {
		return RoleConfig{}, fmt.Errorf("json.Unmarshal(): %w", err)
	}

	// convert numPlayers to string
	iN := fmt.Sprintf("%d", numPlayers)

	config, ok := c[iN]
	if !ok {
		return RoleConfig{}, fmt.Errorf("no role config for %d players", numPlayers)
	}
	return config, nil
}
