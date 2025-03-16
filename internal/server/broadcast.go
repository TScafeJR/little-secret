package server

type Server struct {
	rooms []*game.Room
}

func (s *Server) broadcastToRoom(game *game.Game, msg map[string]string) {
	for conn := range s.rooms[game.RoomID] {
		conn.WriteJSON(msg)
	}
}
