import "./App.css";
import Game from "./components/Game.tsx";
import GameStateProvider from "./components/GameStateProvider.tsx";

function App() {
  return (
    <GameStateProvider>
      <div className="app-container min-h-screen">
        <h1>
          <b>Little Secret</b>
        </h1>
        <Game />
      </div>
    </GameStateProvider>
  );
}

export default App;
