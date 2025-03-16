package game

import "math/rand"

func shufflePlayers(players []*Player) {
	// implement Fisher-Yates shuffle

	for i := len(players) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		players[i], players[j] = players[j], players[i]
	}
}

func startGame(game *Game) {
	// Example: assume game.Players list is populated
	shufflePlayers(game.Players)
	game.Players[0].Role = "Spy Pup"
	game.Players[0].SecretWord = "" // Spy has no word
	game.Players[1].Role = "Confused Kitten"
	game.Players[1].SecretWord = game.DecoyWord
	for i := 2; i < len(game.Players); i++ {
		game.Players[i].Role = "Good Kitten"
		game.Players[i].SecretWord = game.SecretWord
	}
	game.Phase = "discussion"
	// Notify each player of their role and secret word
	for _, p := range game.Players {
		privateMsg := map[string]string{
			"type": "roleAssignment",
			"role": p.Role,
			"word": p.SecretWord,
		}
		p.Conn.WriteJSON(privateMsg)
	}
	// Broadcast to room that the discussion phase has started
	broadcastToRoom(game, map[string]string{"type": "phase", "phase": "discussion"})
}

func tallyVotes(game *Game) {
	// Count votes
	counts := map[string]int{}
	for _, targetID := range game.Votes {
		counts[targetID]++
	}
	// Find highest vote count
	var eliminatedID string
	maxVotes := -1
	for target, count := range counts {
		if count > maxVotes {
			maxVotes = count
			eliminatedID = target
		}
	}
	// Eliminate player
	eliminatedPlayer := game.findPlayer(eliminatedID)
	eliminatedPlayer.Alive = false
	// Inform everyone who was eliminated and their role
	revealMsg := map[string]string{
		"type":   "elimination",
		"player": eliminatedPlayer.Name,
		"role":   eliminatedPlayer.Role,
	}
	broadcastToRoom(game, revealMsg)
	handleEliminationOutcome(game, eliminatedPlayer)
}
