package srvcfg

import (
	"errors"

	"go.uber.org/zap"
)

// Cfg is the configuration for the server.
type Cfg struct {
	PublicPort int `json:"public_port"`
	// Empty list allows all origins.
	AllowedOrigins []string    `json:"allowed_origins"`
	Logger         *zap.Logger `json:"-"`
	StaticFilePath string      `json:"static_file_path"`
	DbUri          string      `json:db_uri`
}

// Validate validates the server configuration.
func (c *Cfg) Validate() error {
	if c.PublicPort == 0 {
		return errors.New("missing required variable PublicPort")
	}
	if c.Logger == nil {
		return errors.New("missing required variable Logger access")
	}
	if c.DbUri == "" {
		return errors.New("missing required variable DbUri")
	}

	return nil
}
