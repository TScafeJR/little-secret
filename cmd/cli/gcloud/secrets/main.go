package secrets

import "github.com/urfave/cli/v3"

var Command = &cli.Command{
	Name:  "secrets",
	Usage: "Gcloud secrets commands",
	Subcommands: []*cli.Command{
		listSecretsCommand,
	},
}
