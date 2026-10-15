import { MEMBERS } from "./members";
import { programBySlug, splitEntry } from "../economy/modules";
import { nextSunday, sundayGame, sundayIndex } from "./time";
import type { State } from "./store";

export const SUNDAY_ENTRY = 10_000;
export const SUNDAY_SEATS: Record<"poker" | "monopoly", number> = { poker: 8, monopoly: 4 };

export interface SundayInfo {
  date: Date;
  week: number;
  game: "poker" | "monopoly";
  seats: number;
  entrants: string[];
  registered: boolean;
  fromEntries: number;
  fromModules: number;
  pot: number;
}

export function sundayInfo(s: Pick<State, "sundayWeek" | "sundayExtra" | "name">, now = new Date()): SundayInfo {
  const date = nextSunday(now);
  const week = sundayIndex(date);
  const game = sundayGame(date);
  const seats = SUNDAY_SEATS[game];
  const registered = s.sundayWeek === String(week);
  const others = MEMBERS.slice((week * 3) % 4).slice(0, game === "poker" ? 5 : 2).map((m) => m.name);
  const entrants = registered ? [...others, s.name] : others;
  const perEntry = splitEntry(programBySlug(game), SUNDAY_ENTRY).pot;
  const fromEntries = entrants.length * perEntry;
  return { date, week, game, seats, entrants, registered, fromEntries, fromModules: s.sundayExtra, pot: fromEntries + s.sundayExtra };
}
