import { useContext } from "react";
import { GameContext } from "../../GameState";

export default function RevealRole() {
  const gameContext = useContext(GameContext);

  return (
    <div>
      <h3>Reveal Role</h3>
    </div>
  );
}
