package srv

import (
	"fmt"

	"github.com/TScafeJR/little-secret/internal/server"
	"github.com/TScafeJR/little-secret/internal/server/srvcfg"
	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
)

var localCommand = &cli.Command{
	Name:  "local",
	Usage: "run local dev server",
	Flags: []cli.Flag{
		&cli.IntFlag{
			Name:    "public_http_port",
			Usage:   "Public HTTP Port",
			EnvVars: []string{"PORT"},
		},
		&cli.StringFlag{
			Name:    "db_uri",
			Usage:   "postgres db uri",
			EnvVars: []string{"POSTGRES_URL"},
		},
	},
	Action: func(c *cli.Context) error {
		logger, err := zap.NewDevelopment()
		if err != nil {
			return fmt.Errorf("zap.NewDevelopment(): %w", err)
		}
		defer logger.Sync()

		allowedOrigins := make([]string, 0)

		config := srvcfg.Cfg{
			PublicPort:     c.Int("public_http_port"),
			AllowedOrigins: allowedOrigins,
			Logger:         logger.Named("app"),
			StaticFilePath: "./public/build",
			DbUri:          c.String("db_uri"),
		}

		return server.ServeWeb(config)
	},
}
