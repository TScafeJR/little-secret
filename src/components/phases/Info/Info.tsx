import { useState, useCallback } from "react";
import Word from "./Word.tsx";

export default function Info() {
  const [wordSeen, setWordSeen] = useState(false);

  const handleWordSeenClick = useCallback(() => {
    setWordSeen(true);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <Word wordSeen={wordSeen} />
      {!wordSeen && (
        <button
          className="fw-button cta-button"
          id="confirm-word-btn"
          onClick={handleWordSeenClick}
        >
          Confirm Word Seen
        </button>
      )}
    </div>
  );
}
