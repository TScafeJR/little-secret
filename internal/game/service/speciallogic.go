package gameservice

import (
	"strings"

	"github.com/TScafeJR/little-secret/internal/game"
)

func normalizeWord(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func confirmSecretWordGuess(g game.Game, m Message) bool {
	return normalizeWord(m.Text) == normalizeWord(g.SecretWord)
}
