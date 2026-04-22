package gameservice

import (
	"errors"
	"net/http"
	"strings"
	"syscall"

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

	defer func() {
		s.forgetConnWrite(conn)
		_ = conn.Close()
	}()
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

// logWriteError reports a WriteJSON failure at the right level. A client
// disconnecting mid-broadcast (page close/refresh, normal WS close) shows up
// as "broken pipe" / "use of closed network connection" / "websocket: close
// sent" — none of which are actionable server errors, so we demote them to
// Info. Anything else is still Error with a stack trace.
func (s *GameService) logWriteError(e error) {
	if isDisconnectErr(e) {
		s.logger.Info("conn.WriteJSON (peer disconnected)", zap.Error(e))
		return
	}
	s.logger.Error("conn.WriteJSON", zap.Error(e))
}

func isDisconnectErr(e error) bool {
	if e == nil {
		return false
	}
	if errors.Is(e, syscall.EPIPE) || errors.Is(e, syscall.ECONNRESET) {
		return true
	}
	msg := e.Error()
	return strings.Contains(msg, "websocket: close sent") ||
		strings.Contains(msg, "use of closed network connection") ||
		strings.Contains(msg, "broken pipe") ||
		strings.Contains(msg, "connection reset by peer")
}
