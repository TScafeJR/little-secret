import { useState, useCallback } from "react";

export default function CodeSubmission() {
  const [code, setCode] = useState("");

  const handleCodeSubmission = useCallback((c: string) => {
    console.log(c);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="text"
        placeholder="Room Code"
        className="base-input center-text uppercase"
        value="code"
        id="room-code-input"
        onChange={(e) => setCode(e.target.value)}
        autoFocus
      />
      <button
        type="submit"
        className="fw-button reg-button"
        onClick={() => handleCodeSubmission(code)}
      >
        Submit Code
      </button>
    </div>
  );
}
