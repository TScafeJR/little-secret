import { useEffect, useState } from 'react';

export function Game() {
	const [messages, setMessages] = useState([]);
  const [role, setRole] = useState(null);

	  useEffect(() => {
    // Connect to WebSocket backend (adjust URL and protocol as needed)
    const socket = new WebSocket(`wss://example.com/ws?room=${roomCode}`);
    
    socket.onopen = () => {
      console.log("WebSocket connected");
      // Send a join message to the server (if query param wasn't enough)
      const joinMsg = { action: "join", room: roomCode, name: playerName };
      socket.send(JSON.stringify(joinMsg));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("Received message:", msg);
      // Handle different message types from server
      if (msg.type === "roleAssignment") {
        setRole({ role: msg.role, word: msg.word });  // store my role and secret word
      } else if (msg.type === "phase") {
        // Update UI to show new phase (discussion, voting, etc.)
      } else if (msg.type === "clue") {
        // A clue from another player
        setMessages(prev => [...prev, `${msg.player}: ${msg.word}`]);
      } else if (msg.type === "elimination") {
        // Show who was eliminated and their role
        setMessages(prev => [...prev, `Eliminated ${msg.player} (was ${msg.role})`]);
      } else if (msg.type === "gameOver") {
        // Display winner info from msg.winner
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => socket.close();
  }, [roomCode, playerName]);

	return (

	)
}
