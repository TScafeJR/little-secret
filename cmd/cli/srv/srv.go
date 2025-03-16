package srv

import "github.com/urfave/cli/v2"

var Command = &cli.Command{
	Name:  "srv",
	Usage: "Server commands",
	Subcommands: []*cli.Command{
		localCommand,
	},
}
