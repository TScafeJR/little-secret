package main

import (
	"log"
	"os"

	"github.com/TScafeJR/little-secret/cmd/cli/gcloud"
	"github.com/TScafeJR/little-secret/cmd/cli/srv"
	"github.com/urfave/cli/v3"
)

func main() {
	app := &cli.App{
		Name:                 "cli",
		Usage:                "Commands for doing various things across Little Secret's stack",
		EnableBashCompletion: true,
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:     "project_id",
				Usage:    "project id",
				EnvVars:  []string{"PROJECT_ID"},
				Required: false,
			},
		},
		Commands: []*cli.Command{
			srv.Command,
			gcloud.Command,
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatalln(err)
	}
}
