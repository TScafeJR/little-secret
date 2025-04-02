import { useContext } from "react";
import { GameContext } from "../GameState";

export default function Players() {
  const gameContext = useContext(GameContext);

  return (
    <div className="flex flex-col gap-4 my-4">
      <h3 className="items-center">Players:</h3>
      <ul className="items-center ml-4">
        {gameContext.players.map((p) => {
          return (
            <div className="flex items-center gap-2" key={`${p.id}-indicator`}>
              <div
                className={`w-2 h-2 rounded-full ${
                  p.alive
                    ? p.confirmedVote
                      ? "bg-green-400"
                      : "bg-yellow-400 animate-pulse"
                    : "bg-red-500"
                }`}
              ></div>
              <li key={p.id} className={`${!p.alive ? "line-through" : ""}`}>
                {p.displayName}
              </li>
            </div>
          );
        })}
      </ul>
    </div>
  );
}
