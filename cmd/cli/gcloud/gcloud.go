package gcloud

import (
	"github.com/TScafeJR/little-secret/cmd/cli/gcloud/secrets"
	"github.com/urfave/cli/v2"
)

var Command = &cli.Command{
	Name:  "gcloud",
	Usage: "Gcloud commands",
	Subcommands: []*cli.Command{
		secrets.Command,
	},
}
