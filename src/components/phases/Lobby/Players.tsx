import { useContext } from "react";
import { GameContext } from "../../GameState";

export default function Players() {
  const gameContext = useContext(GameContext);

  return (
    <div className="flex flex-col gap-4 my-4">
      <h3 className="items-center">Players:</h3>
      <ol className="list-decimal ml-4">
        {gameContext.players.map((p) => {
          return <li key={p.id}>{p.displayName}</li>;
        })}
      </ol>
    </div>
  );
}
