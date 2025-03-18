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
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				s.logger.Info("Client disconnected", zap.Error(err))
				break
			}
			s.logger.Error("Unexpected WebSocket error", zap.Error(err))
		}

		if err = s.HandleIncomingMessage(conn, messageType, message); err != nil {
			s.logger.Error("s.HandleIncomingMessage", zap.Error(err))
			break
		}
	}
}

func (s *GameService) logWriteError(e error) {
	s.logger.Error("conn.WriteJSON", zap.Error(e))
}
