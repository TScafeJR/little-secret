package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow all origins for demo
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)      // WebSocket endpoint
	log.Fatal(http.ListenAndServe(":8080", nil)) // Start HTTP server
}

var rooms = make(map[string]map[*websocket.Conn]bool) // roomID -> set of connections

func generateNewRoomCode() string {
	return "ROOM123"
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	log.Println("New client connected")

	defer conn.Close()
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error:", err)
			break // Exit loop on error (client disconnected or error)
		}
		log.Printf("Received: %s\n", message)
		// Here you would process the message and possibly respond or broadcast.
		// For simplicity, we could echo the message back:
		if err := conn.WriteMessage(messageType, message); err != nil {
			log.Println("write error:", err)
			break
		}
	}

	// ... after upgrading to conn:
	roomID := r.URL.Query().Get("room") // e.g. ws://server/ws?room=ROOM123
	if roomID == "" {
		roomID = generateNewRoomCode() // create a new room if none provided
	}
	// Register connection in the room set
	if rooms[roomID] == nil {
		rooms[roomID] = make(map[*websocket.Conn]bool)
	}
	rooms[roomID][conn] = true

	// Inform the client of the roomID (if newly created) or successful join
	response := map[string]string{"type": "roomJoined", "room": roomID}
	conn.WriteJSON(response)
	// Continue with reading loop as above...
}
