import { describe, expect, it } from "vitest";
import { answerFor, isWord, score } from "../src/games/pente/pente";
import { ANSWERS } from "../src/games/pente/words";

describe("pente", () => {
  it("scores hits, near misses and misses", () => {
    expect(score("crane", "crane")).toEqual(["hit", "hit", "hit", "hit", "hit"]);
    expect(score("react", "crane")).toEqual(["near", "near", "hit", "near", "miss"]);
  });

  it("does not over-count repeated letters", () => {
    // answer has one L, matched exactly by the second L: the first L is grey
    expect(score("llama", "blade")).toEqual(["miss", "hit", "hit", "miss", "miss"]);
    // one unplaced L in the answer: only one of two guessed L's goes gold
    expect(score("hello", "lunar")).toEqual(["miss", "miss", "near", "miss", "miss"]);
    // answer has two E's: the guess's E's are matched in place first
    expect(score("eerie", "sleep")).toEqual(["near", "near", "miss", "miss", "miss"]);
  });

  it("gives every day a valid, guessable answer", () => {
    for (let d = 1; d <= 60; d++) {
      const a = answerFor(`2026-11-${String((d % 28) + 1).padStart(2, "0")}`);
      expect(isWord(a)).toBe(true);
    }
    expect(ANSWERS.every(isWord)).toBe(true);
  });
});
