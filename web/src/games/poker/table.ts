import { newDeck, type Card } from "./cards";
import { evaluate, type HandValue } from "./evaluate";
import type { Rand } from "../rng";

/**
 * No-limit Texas hold'em, tournament style: everyone starts with the same
 * stack, blinds rise on a schedule, the last player with chips wins.
 * The table is a plain mutable object; the UI re-renders after each call.
 */

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; to: number };

export interface Seat {
  id: string;
  name: string;
  human: boolean;
  stack: number;
  /** Chips in front of the player on the current street. */
  bet: number;
  /** Chips put in during the whole hand. */
  committed: number;
  folded: boolean;
  allIn: boolean;
  out: boolean;
  acted: boolean;
  hole: Card[];
  lastAction: string | null;
}

export interface PotAward {
  amount: number;
  winners: number[];
  hand: string | null;
}

export interface HandResult {
  awards: PotAward[];
  showdown: boolean;
  /** Best hand per seat that reached showdown. */
  hands: Record<number, HandValue>;
}

export interface Legal {
  toCall: number;
  canCheck: boolean;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  pot: number;
}

export const BLIND_LEVELS: [number, number][] = [
  [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400],
  [300, 600], [400, 800], [600, 1200], [800, 1600], [1000, 2000], [1500, 3000],
];

export interface TableOptions {
  startingStack: number;
  handsPerLevel: number;
  rand: Rand;
}

export class PokerTable {
  seats: Seat[];
  dealer = -1;
  board: Card[] = [];
  street: Street = "preflop";
  toAct = -1;
  currentBet = 0;
  minRaise = 0;
  handNo = 0;
  level = 0;
  result: HandResult | null = null;
  log: string[] = [];
  /** Finishing order, first eliminated first. */
  eliminated: number[] = [];
  private deck: Card[] = [];
  private opts: TableOptions;

  constructor(players: { id: string; name: string; human: boolean }[], opts: TableOptions) {
    this.opts = opts;
    this.seats = players.map((p) => ({
      ...p,
      stack: opts.startingStack,
      bet: 0,
      committed: 0,
      folded: false,
      allIn: false,
      out: false,
      acted: false,
      hole: [],
      lastAction: null,
    }));
  }

  get blinds(): [number, number] {
    return BLIND_LEVELS[Math.min(this.level, BLIND_LEVELS.length - 1)];
  }

  get pot(): number {
    return this.seats.reduce((sum, s) => sum + s.committed, 0);
  }

  get alive(): number[] {
    return this.seats.flatMap((s, i) => (s.out ? [] : [i]));
  }

  get gameOver(): boolean {
    return this.alive.length <= 1;
  }

  get handOver(): boolean {
    return this.result !== null;
  }

  /** Next seat after i that is still in the tournament. */
  private nextAlive(i: number): number {
    for (let k = 1; k <= this.seats.length; k++) {
      const j = (i + k) % this.seats.length;
      if (!this.seats[j].out) return j;
    }
    return i;
  }

  private canAct(i: number): boolean {
    const s = this.seats[i];
    return !s.out && !s.folded && !s.allIn;
  }

  private nextToAct(i: number): number {
    for (let k = 1; k <= this.seats.length; k++) {
      const j = (i + k) % this.seats.length;
      if (this.canAct(j)) return j;
    }
    return -1;
  }

  private say(line: string) {
    this.log.push(line);
    if (this.log.length > 80) this.log.shift();
  }

  private put(i: number, amount: number) {
    const s = this.seats[i];
    const a = Math.min(amount, s.stack);
    s.stack -= a;
    s.bet += a;
    s.committed += a;
    if (s.stack === 0) s.allIn = true;
    return a;
  }

  startHand() {
    if (this.gameOver) return;
    this.handNo++;
    this.level = Math.floor((this.handNo - 1) / this.opts.handsPerLevel);
    const [sb, bb] = this.blinds;
    this.result = null;
    this.board = [];
    this.street = "preflop";
    this.deck = newDeck(this.opts.rand);
    for (const s of this.seats) {
      Object.assign(s, { bet: 0, committed: 0, folded: s.out, allIn: false, acted: false, hole: [], lastAction: null });
    }

    this.dealer = this.nextAlive(this.dealer < 0 ? this.seats.length - 1 : this.dealer);
    const headsUp = this.alive.length === 2;
    const sbSeat = headsUp ? this.dealer : this.nextAlive(this.dealer);
    const bbSeat = this.nextAlive(sbSeat);
    this.put(sbSeat, sb);
    this.put(bbSeat, bb);
    this.seats[sbSeat].lastAction = `SB ${sb}`;
    this.seats[bbSeat].lastAction = `BB ${bb}`;
    for (let round = 0; round < 2; round++) {
      for (const i of this.alive) this.seats[i].hole.push(this.deck.pop()!);
    }
    this.currentBet = bb;
    this.minRaise = bb;
    this.say(`Hand ${this.handNo} · blinds ${sb}/${bb}`);
    this.toAct = this.nextToAct(bbSeat);
    if (this.roundComplete()) this.advanceStreet();
  }

  legal(i = this.toAct): Legal {
    const s = this.seats[i];
    const toCall = Math.max(0, this.currentBet - s.bet);
    const maxRaiseTo = s.bet + s.stack;
    const othersCanRespond = this.seats.some((_, j) => j !== i && this.canAct(j));
    return {
      toCall: Math.min(toCall, s.stack),
      canCheck: toCall === 0,
      canRaise: s.stack > toCall && othersCanRespond,
      minRaiseTo: Math.min(this.currentBet + this.minRaise, maxRaiseTo),
      maxRaiseTo,
      pot: this.pot,
    };
  }

  act(action: Action): void {
    if (this.result || this.toAct < 0) return;
    const i = this.toAct;
    const s = this.seats[i];
    const legal = this.legal(i);

    switch (action.type) {
      case "fold":
        s.folded = true;
        s.lastAction = "Fold";
        this.say(`${s.name} folds`);
        break;
      case "check":
        if (!legal.canCheck) return this.act({ type: "call" });
        s.lastAction = "Check";
        this.say(`${s.name} checks`);
        break;
      case "call": {
        if (legal.toCall === 0) return this.act({ type: "check" });
        const paid = this.put(i, legal.toCall);
        s.lastAction = s.allIn ? `All-in ${s.bet}` : `Call ${paid}`;
        this.say(`${s.name} ${s.allIn ? "calls all-in" : "calls"} ${paid}`);
        break;
      }
      case "raise": {
        if (!legal.canRaise) return this.act({ type: legal.canCheck ? "check" : "call" });
        const to = Math.max(Math.min(Math.round(action.to), legal.maxRaiseTo), legal.minRaiseTo);
        const increase = to - this.currentBet;
        this.put(i, to - s.bet);
        if (increase >= this.minRaise) {
          this.minRaise = increase;
          // A full raise reopens the action for everyone else.
          for (const [j, o] of this.seats.entries()) if (j !== i) o.acted = false;
        }
        const opening = this.currentBet === 0;
        this.currentBet = Math.max(this.currentBet, s.bet);
        s.lastAction = s.allIn ? `All-in ${s.bet}` : `${opening ? "Bet" : "Raise to"} ${s.bet}`;
        this.say(`${s.name} ${s.allIn ? "goes all-in for" : opening ? "bets" : "raises to"} ${s.bet}`);
        break;
      }
    }
    s.acted = true;

    const live = this.seats.flatMap((o, j) => (!o.out && !o.folded ? [j] : []));
    if (live.length === 1) return this.finishUncontested(live[0]);
    if (this.roundComplete()) return this.advanceStreet();
    this.toAct = this.nextToAct(i);
  }

  private roundComplete(): boolean {
    const actors = this.seats.flatMap((s, j) => (this.canAct(j) ? [s] : []));
    if (actors.length === 0) return true;
    if (actors.length === 1) {
      const facing = this.seats.some((o) => !o.out && !o.folded && o !== actors[0]);
      // Alone against all-in players: no decision left unless facing a bet.
      if (facing && actors[0].bet >= this.currentBet) return true;
    }
    return actors.every((s) => s.acted && s.bet === this.currentBet);
  }

  private advanceStreet(): void {
    for (const s of this.seats) {
      s.bet = 0;
      s.acted = false;
      if (!s.folded && !s.allIn && !s.out) s.lastAction = null;
    }
    this.currentBet = 0;
    this.minRaise = this.blinds[1];

    const order: Street[] = ["preflop", "flop", "turn", "river", "showdown"];
    this.street = order[order.indexOf(this.street) + 1];
    if (this.street === "flop") this.board.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
    else if (this.street === "turn" || this.street === "river") this.board.push(this.deck.pop()!);
    if (this.street === "showdown") return this.showdown();

    this.say(`${this.street[0].toUpperCase() + this.street.slice(1)}`);
    const actors = this.seats.filter((_, j) => this.canAct(j)).length;
    if (actors <= 1) return this.advanceStreet(); // run it out
    this.toAct = this.nextToAct(this.dealer);
  }

  private finishUncontested(winner: number): void {
    const amount = this.pot;
    this.seats[winner].stack += amount;
    this.say(`${this.seats[winner].name} wins ${amount}`);
    this.result = { awards: [{ amount, winners: [winner], hand: null }], showdown: false, hands: {} };
    this.endHand();
  }

  private showdown(): void {
    this.street = "showdown";
    this.toAct = -1;
    const hands: Record<number, HandValue> = {};
    this.seats.forEach((s, i) => {
      if (!s.out && !s.folded) hands[i] = evaluate([...s.hole, ...this.board]);
    });
    const awards = buildPots(this.seats).map((pot) => {
      const best = Math.max(...pot.eligible.map((i) => hands[i].score));
      const winners = this.clockwiseFromDealer(pot.eligible.filter((i) => hands[i].score === best));
      const share = Math.floor(pot.amount / winners.length);
      let odd = pot.amount - share * winners.length;
      for (const w of winners) {
        this.seats[w].stack += share + (odd > 0 ? 1 : 0);
        odd--;
      }
      return { amount: pot.amount, winners, hand: hands[winners[0]].name };
    });
    for (const a of awards) {
      this.say(`${a.winners.map((w) => this.seats[w].name).join(" and ")} win${a.winners.length > 1 ? "" : "s"} ${a.amount} with ${a.hand}`);
    }
    this.result = { awards, showdown: true, hands };
    this.endHand();
  }

  private clockwiseFromDealer(seats: number[]): number[] {
    const n = this.seats.length;
    return seats.slice().sort((a, b) => ((a - this.dealer - 1 + n) % n) - ((b - this.dealer - 1 + n) % n));
  }

  private endHand() {
    this.toAct = -1;
    const busted = this.seats.flatMap((s, i) => (!s.out && s.stack === 0 ? [i] : []));
    // Bigger stack at the start of the hand finishes higher: sort by committed.
    busted.sort((a, b) => this.seats[a].committed - this.seats[b].committed);
    for (const i of busted) {
      this.seats[i].out = true;
      this.eliminated.push(i);
      this.say(`${this.seats[i].name} is out`);
    }
  }

  /** Final standings, winner first. */
  standings(): number[] {
    const left = this.alive.sort((a, b) => this.seats[b].stack - this.seats[a].stack);
    return [...left, ...this.eliminated.slice().reverse()];
  }
}

/**
 * Split everything committed into a main pot and side pots. Each level is a
 * distinct commitment amount; players who folded feed pots but can't win them.
 */
export function buildPots(seats: Pick<Seat, "committed" | "folded" | "out">[]): { amount: number; eligible: number[] }[] {
  const levels = [...new Set(seats.map((s) => s.committed).filter((c) => c > 0))].sort((a, b) => a - b);
  const pots: { amount: number; eligible: number[] }[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const s of seats) amount += Math.max(0, Math.min(s.committed, level) - prev);
    const eligible = seats.flatMap((s, i) => (!s.folded && !s.out && s.committed >= level ? [i] : []));
    if (eligible.length === 0 && pots.length) pots[pots.length - 1].amount += amount;
    else if (eligible.length) {
      const last = pots[pots.length - 1];
      if (last && sameSet(last.eligible, eligible)) last.amount += amount;
      else pots.push({ amount, eligible });
    }
    prev = level;
  }
  return pots;
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
