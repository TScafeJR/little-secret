package gameservice

import (
	"net/http"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *GameService) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Error("upgrader.Upgrade()", zap.Error(err))
		return
	}

	s.logger.Info("New client connected")

	defer conn.Close()
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			s.logger.Error("conn.ReadMessage", zap.Error(err))
			break
		}

		s.checkRoom(r, conn)

		if err = s.HandleIncomingMessage(conn, messageType, message); err != nil {
			s.logger.Error("s.HandleIncomingMessage", zap.Error(err))
			break
		}
	}
}

func (s *GameService) logWriteError(e error) {
	s.logger.Error("conn.WriteJSON", zap.Error(e))
}

func (s *GameService) checkRoom(r *http.Request, conn *websocket.Conn) {
	roomID := r.URL.Query().Get("room")

	if roomID == "" {
		roomID = s.generateNewRoomCode()
	}

	if s.Rooms[roomID] == nil {
		s.Rooms[roomID] = make(map[*websocket.Conn]bool)
	}
	s.Rooms[roomID][conn] = true

	response := map[string]string{"type": "roomJoined", "room": roomID}
	if err := conn.WriteJSON(response); err != nil {
		s.logWriteError(err)
	}
}
