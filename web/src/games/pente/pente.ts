import { ALLOWED, ANSWERS } from "./words";
import { hashSeed, seeded, shuffle } from "../rng";

/**
 * Pente: one five-letter word a day, the same for everyone on the server.
 * Six guesses. Green: right letter, right place. Gold: in the word, wrong
 * place. Grey: not in the word (or not this many times).
 */

export type Mark = "hit" | "near" | "miss";
export const LENGTH = 5;
export const TRIES = 6;

const ORDER = shuffle(ANSWERS.slice(), seeded(hashSeed("pente-order")));
const EPOCH = Date.UTC(2026, 9, 1);

export function puzzleNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000) + 1;
}

export function answerFor(day: string): string {
  const n = puzzleNumber(day);
  return ORDER[((n % ORDER.length) + ORDER.length) % ORDER.length];
}

export const isWord = (w: string) => ALLOWED.has(w.toLowerCase());

/** Score a guess. Exact hits first, then near-misses limited by remaining letter counts. */
export function score(guess: string, answer: string): Mark[] {
  const g = guess.toLowerCase();
  const out: Mark[] = Array(LENGTH).fill("miss");
  const left: Record<string, number> = {};
  for (let i = 0; i < LENGTH; i++) {
    if (g[i] === answer[i]) out[i] = "hit";
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < LENGTH; i++) {
    if (out[i] === "hit") continue;
    if (left[g[i]] > 0) {
      out[i] = "near";
      left[g[i]]--;
    }
  }
  return out;
}

export function shareGrid(day: string, rows: Mark[][], solved: boolean): string {
  const sq = { hit: "🟩", near: "🟨", miss: "⬛" };
  return `Pente ${puzzleNumber(day)} ${solved ? rows.length : "X"}/${TRIES}\n` + rows.map((r) => r.map((m) => sq[m]).join("")).join("\n");
}
