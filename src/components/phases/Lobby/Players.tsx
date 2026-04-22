import { useContext } from "react";
import { GameContext } from "../../GameState";

export default function Players() {
  const gameContext = useContext(GameContext);

  return (
    <div className="w-full max-w-sm flex flex-col gap-2 my-2">
      <h3 className="items-center">Players</h3>
      <ol className="list-decimal list-inside text-left">
        {gameContext.players.map((p) => {
          return <li key={`${p.id}-player-list`}>{p.displayName}</li>;
        })}
      </ol>
    </div>
  );
}
