package srv

import (
	"os"

	"github.com/TScafeJR/little-secret/internal/server"
	"github.com/TScafeJR/little-secret/internal/server/srvcfg"
	"github.com/streamingfast/logging"
	"github.com/urfave/cli/v3"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"golang.org/x/term"
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
		isTTY := term.IsTerminal(int(os.Stderr.Fd()))
		logStdoutWriter := zapcore.Lock(os.Stderr)

		logger := zap.New(zapcore.NewCore(logging.NewEncoder(4, isTTY), logStdoutWriter, zapcore.DebugLevel), zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
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
