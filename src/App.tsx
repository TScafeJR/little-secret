import { useContext, useEffect, useState } from "react";
import "./App.css";
import Game from "./components/Game.tsx";
import { GameContext } from "./components/GameState.tsx";
import GameStateProvider from "./components/GameStateProvider.tsx";
import { Phase } from "./components/phases/phases.ts";

const RULES_VIDEO_URL = "https://www.youtube.com/watch?v=2Phx2vlr9Mc";
const RULES_PDF_URL = "/Little_Secret_US_FLYER.pdf";

function AppContent() {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const gameContext = useContext(GameContext);
  const hasGameStarted = gameContext.phase !== Phase.WAITING_FOR_PLAYERS;

  useEffect(() => {
    if (!isRulesOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRulesOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isRulesOpen]);

  return (
    <div className="app-bg min-h-screen">
      <main className="app-container">
        <header className="brand-banner">
          <p className="brand-kicker">Cats, clues, and chaos</p>
          <h1>
            <b>Little Secret</b>
          </h1>
          <p className="brand-subtitle">
            Bluff with your friends, spot the Spy Pup, and protect your word.
          </p>
          {!hasGameStarted ? (
            <div className="rules-toolbar">
              <button
                className="fw-button reg-button rules-trigger"
                id="rules-btn"
                onClick={() => setIsRulesOpen(true)}
              >
                How to Play
              </button>
            </div>
          ) : null}
        </header>
        <section className="game-stage">
          {hasGameStarted ? (
            <div className="in-game-header">
              <p className="in-game-header-label">Need a refresher?</p>
              <button
                className="in-game-info-btn"
                id="in-game-rules-btn"
                aria-label="Open rules"
                onClick={() => setIsRulesOpen(true)}
              >
                <span className="in-game-info-icon" aria-hidden="true">
                  i
                </span>
                <span>Rules</span>
              </button>
            </div>
          ) : null}
          <Game />
        </section>
      </main>
      {isRulesOpen ? (
        <div
          className="rules-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-title"
          onClick={() => setIsRulesOpen(false)}
        >
          <section
            className="rules-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rules-head">
              <p className="rules-eyebrow">Quick Start</p>
              <h2 id="rules-title">Little Secret Rules</h2>
              <button
                className="rules-dismiss"
                id="rules-dismiss-btn"
                aria-label="Close rules"
                onClick={() => setIsRulesOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="rules-intro">
              Written rules are shown first, then you can jump to the official
              flyer or watch the overview video.
            </p>
            <ol className="rules-list">
              <li>
                <strong>Get your role and word.</strong> Good Kittens share one
                secret word, Confused Kittens see a decoy word, and the Spy Pup
                gets no word.
              </li>
              <li>
                <strong>Take turns giving one-word clues.</strong> Keep clues
                related to your word, avoid saying your exact word, and avoid
                repeating clues in the same round.
              </li>
              <li>
                <strong>Vote after clues are in.</strong> Everyone votes for the
                player they think is most suspicious.
              </li>
              <li>
                <strong>Reveal the voted player&apos;s role.</strong> If it is
                the first reveal, their word is shown too.
              </li>
              <li>
                <strong>Keep playing rounds until game over.</strong> Good
                Kittens win by eliminating imposters; imposters win by surviving
                to parity with Good Kittens.
              </li>
              <li>
                <strong>Spy Pup twist.</strong> If revealed, the Spy Pup can
                guess the Good word for an instant imposter win.
              </li>
            </ol>
            <section
              className="rules-table-wrap"
              aria-label="Role distribution by player count"
            >
              <p className="rules-resources-title">
                Role distribution by players
              </p>
              <table className="rules-table">
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">4</th>
                    <th scope="col">5</th>
                    <th scope="col">6</th>
                    <th scope="col">7</th>
                    <th scope="col">8</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Good Kittens</th>
                    <td>3</td>
                    <td>3</td>
                    <td>4</td>
                    <td>4</td>
                    <td>5</td>
                  </tr>
                  <tr>
                    <th scope="row">Confused Kittens</th>
                    <td>1</td>
                    <td>1</td>
                    <td>1</td>
                    <td>2</td>
                    <td>2</td>
                  </tr>
                  <tr>
                    <th scope="row">Spy Pup</th>
                    <td>0</td>
                    <td>1</td>
                    <td>1</td>
                    <td>1</td>
                    <td>1</td>
                  </tr>
                </tbody>
              </table>
            </section>
            <p className="rules-resources-title">Official resources</p>
            <div className="rules-links">
              <a
                className="fw-button reg-button rules-link"
                id="rules-pdf-link"
                href={RULES_PDF_URL}
                target="_blank"
                rel="noreferrer"
              >
                Open Official PDF Rules
              </a>
              <a
                className="fw-button reg-button rules-link"
                id="rules-video-link"
                href={RULES_VIDEO_URL}
                target="_blank"
                rel="noreferrer"
              >
                Watch Rules Video
              </a>
            </div>
            <button
              className="fw-button cta-button rules-close"
              id="rules-close-btn"
              onClick={() => setIsRulesOpen(false)}
            >
              Back to Game
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function App() {
  return (
    <GameStateProvider>
      <AppContent />
    </GameStateProvider>
  );
}

export default App;
