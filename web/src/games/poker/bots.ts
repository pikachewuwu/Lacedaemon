import { equity } from "./evaluate";
import type { Action, PokerTable } from "./table";
import type { Rand } from "../rng";

/** How a bot plays. tight: folds more marginal hands. aggression: raises instead of calling. bluff: bets with nothing. */
export interface BotStyle {
  tight: number;
  aggression: number;
  bluff: number;
}

export const STYLES: Record<string, BotStyle> = {
  rock: { tight: 0.8, aggression: 0.3, bluff: 0.02 },
  shark: { tight: 0.55, aggression: 0.75, bluff: 0.08 },
  maniac: { tight: 0.15, aggression: 0.85, bluff: 0.18 },
  station: { tight: 0.25, aggression: 0.2, bluff: 0.03 },
};

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

export function decide(table: PokerTable, seat: number, style: BotStyle, rand: Rand): Action {
  const s = table.seats[seat];
  const legal = table.legal(seat);
  const opponents = table.seats.filter((o, j) => j !== seat && !o.out && !o.folded).length;
  const eq = equity(s.hole, table.board, opponents, table.board.length ? 260 : 180, rand);

  // Equity a random hand would have: the bar to clear grows with tightness.
  const fair = 1 / (opponents + 1);
  const strength = eq / fair; // 1.0 = average hand in this spot
  const pot = legal.pot;
  const bb = table.blinds[1];
  const shortStack = s.stack < bb * 8;

  const raiseTo = (fraction: number): Action => {
    const target = table.currentBet + Math.max(table.minRaise, pot * fraction);
    const to = Math.min(legal.maxRaiseTo, roundTo(target, bb / 2));
    return { type: "raise", to };
  };

  if (legal.toCall === 0) {
    if (strength > 1.9 - style.aggression * 0.4 && legal.canRaise) {
      if (shortStack || (strength > 2.6 && rand() < 0.25)) return { type: "raise", to: legal.maxRaiseTo };
      return raiseTo(0.5 + rand() * 0.5);
    }
    if (legal.canRaise && rand() < style.bluff) return raiseTo(0.4 + rand() * 0.3);
    return { type: "check" };
  }

  const potOdds = legal.toCall / (pot + legal.toCall);
  const margin = 0.02 + style.tight * 0.08;
  if (eq > potOdds + 0.22 && legal.canRaise && rand() < 0.35 + style.aggression * 0.5) {
    if (shortStack || strength > 2.8) return { type: "raise", to: legal.maxRaiseTo };
    return raiseTo(0.6 + rand() * 0.6);
  }
  if (eq >= potOdds + margin) return { type: "call" };
  if (rand() < style.bluff * 0.35 && legal.toCall <= bb * 3) return { type: "call" };
  return { type: "fold" };
}
