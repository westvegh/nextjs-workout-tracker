import { beforeEach, describe, expect, it } from "vitest";
import { pushRecent, RECENT_KEY } from "./recent-exercises";

describe("pushRecent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates the list on first push", () => {
    const result = pushRecent("bench");
    expect(result).toEqual(["bench"]);
    expect(JSON.parse(window.localStorage.getItem(RECENT_KEY)!)).toEqual([
      "bench",
    ]);
  });

  it("puts the newest id first", () => {
    pushRecent("bench");
    const result = pushRecent("squat");
    expect(result).toEqual(["squat", "bench"]);
  });

  it("deduplicates by moving an existing id to the front", () => {
    pushRecent("a");
    pushRecent("b");
    pushRecent("c");
    const result = pushRecent("a");
    expect(result).toEqual(["a", "c", "b"]);
  });

  it("caps the list at 10 entries", () => {
    for (let i = 0; i < 12; i++) {
      pushRecent(`ex-${i}`);
    }
    const result = pushRecent("final");
    expect(result).toHaveLength(10);
    expect(result[0]).toBe("final");
    // The two oldest (ex-0, ex-1) should have been evicted.
    expect(result).not.toContain("ex-0");
    expect(result).not.toContain("ex-1");
  });

  it("tolerates corrupted existing state by treating it as empty", () => {
    window.localStorage.setItem(RECENT_KEY, "not valid json {");
    const result = pushRecent("bench");
    expect(result).toEqual(["bench"]);
  });
});
