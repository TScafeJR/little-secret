import { useContext } from "react";
import { GameContext } from "../../GameState";

export default function Host() {
  const gameContext = useContext(GameContext);

  return (
    <div className="flex flex-col items-center gap-4">
      <h3>Players:</h3>
      <ol>
        {gameContext.players.map((p) => {
          return <li key={p.id}>{p.displayName}</li>;
        })}
      </ol>
    </div>
  );
}
