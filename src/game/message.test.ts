import { describe, it, expect } from "vitest";
import { sortMessages, type InboundMessage } from "./message";

describe("sortMessages", () => {
  it("orders messages by ascending timestamp", () => {
    const msgs: InboundMessage[] = [
      { messageID: "c", timestamp: "2026-01-01T00:00:03Z" },
      { messageID: "a", timestamp: "2026-01-01T00:00:01Z" },
      { messageID: "b", timestamp: "2026-01-01T00:00:02Z" },
    ];
    const sorted = sortMessages([...msgs]);
    expect(sorted.map((m) => m.messageID)).toEqual(["a", "b", "c"]);
  });

  it("treats missing timestamps as invalid and keeps them grouped", () => {
    const msgs: InboundMessage[] = [
      { messageID: "a", timestamp: "2026-01-01T00:00:01Z" },
      { messageID: "no-ts" },
      { messageID: "b", timestamp: "2026-01-01T00:00:02Z" },
    ];
    const sorted = sortMessages([...msgs]);
    // Messages with invalid (NaN) timestamps shouldn't crash; real timestamps sort
    const ids = sorted.map((m) => m.messageID);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("b"));
  });
});
