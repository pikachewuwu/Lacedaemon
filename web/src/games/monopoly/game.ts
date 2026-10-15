import { shuffle, type Rand } from "../rng";
import {
  APELLA, BOARD, GROUPS, ORACLE, PASS_AGORA, PIT, PIT_FINE,
  groupSquares, isOwnable, type DeckCard, type GroupId,
} from "./board";

/**
 * Monopoly with the classic rules most people actually play: buy or pass
 * (no auctions), even building, mortgages, the Pit (jail), card decks,
 * bankruptcy. Trading is left for the live version. A game has a round
 * limit so a Sunday fits in an afternoon; at the limit, net worth decides.
 */

export interface MPlayer {
  id: string;
  name: string;
  human: boolean;
  cash: number;
  pos: number;
  inPit: boolean;
  pitTries: number;
  passes: number;
  bankrupt: boolean;
  doubles: number;
}

export interface Deed {
  owner: number | null;
  houses: number; // 5 = hotel
  mortgaged: boolean;
}

export type Phase = "roll" | "pit" | "buy" | "end" | "over";

export interface MonopolyOptions {
  maxRounds: number;
  startingCash: number;
  rand: Rand;
}

export class MonopolyGame {
  players: MPlayer[];
  deeds: Record<number, Deed> = {};
  turn = 0;
  round = 1;
  phase: Phase = "roll";
  dice: [number, number] | null = null;
  card: { deck: "Oracle" | "Apella"; text: string } | null = null;
  log: string[] = [];
  /** Square index of the last landing, for the UI to highlight. */
  landed: number | null = null;
  private oracle: DeckCard[];
  private apella: DeckCard[];
  private rand: Rand;
  readonly maxRounds: number;

  constructor(players: { id: string; name: string; human: boolean }[], opts: MonopolyOptions) {
    this.rand = opts.rand;
    this.maxRounds = opts.maxRounds;
    this.players = players.map((p) => ({ ...p, cash: opts.startingCash, pos: 0, inPit: false, pitTries: 0, passes: 0, bankrupt: false, doubles: 0 }));
    BOARD.forEach((sq, i) => {
      if (isOwnable(sq)) this.deeds[i] = { owner: null, houses: 0, mortgaged: false };
    });
    this.oracle = shuffle(ORACLE.slice(), this.rand);
    this.apella = shuffle(APELLA.slice(), this.rand);
    this.say(`${this.current.name} starts`);
  }

  get current(): MPlayer {
    return this.players[this.turn];
  }

  get alive(): number[] {
    return this.players.flatMap((p, i) => (p.bankrupt ? [] : [i]));
  }

  private say(text: string) {
    this.log.push(text);
    if (this.log.length > 120) this.log.shift();
  }

  private d6() {
    return 1 + Math.floor(this.rand() * 6);
  }

  // ---- Ownership ------------------------------------------------------

  ownsGroup(player: number, group: GroupId): boolean {
    return groupSquares(group).every((i) => this.deeds[i].owner === player);
  }

  owned(player: number): number[] {
    return Object.keys(this.deeds).map(Number).filter((i) => this.deeds[i].owner === player);
  }

  rentFor(square: number, diceTotal: number, mult = 1): number {
    const deed = this.deeds[square];
    const sq = BOARD[square];
    if (!deed || deed.owner === null || deed.mortgaged) return 0;
    if (sq.kind === "property") {
      if (deed.houses > 0) return sq.rent[deed.houses];
      return sq.rent[0] * (this.ownsGroup(deed.owner, sq.group) ? 2 : 1);
    }
    if (sq.kind === "road") {
      const n = this.owned(deed.owner).filter((i) => BOARD[i].kind === "road").length;
      return 25 * 2 ** (n - 1) * mult;
    }
    if (sq.kind === "utility") {
      const n = this.owned(deed.owner).filter((i) => BOARD[i].kind === "utility").length;
      return diceTotal * (mult > 1 ? 10 : n === 2 ? 10 : 4);
    }
    return 0;
  }

  netWorth(player: number): number {
    const p = this.players[player];
    if (p.bankrupt) return 0;
    let worth = p.cash;
    for (const i of this.owned(player)) {
      const sq = BOARD[i];
      const deed = this.deeds[i];
      if (!isOwnable(sq)) continue;
      worth += deed.mortgaged ? sq.price / 2 : sq.price;
      if (sq.kind === "property") worth += deed.houses * GROUPS[sq.group].house;
    }
    return worth;
  }

  canBuild(player: number, square: number): boolean {
    const sq = BOARD[square];
    const deed = this.deeds[square];
    if (sq?.kind !== "property" || deed.owner !== player || deed.houses >= 5) return false;
    if (!this.ownsGroup(player, sq.group)) return false;
    const group = groupSquares(sq.group);
    if (group.some((i) => this.deeds[i].mortgaged)) return false;
    const min = Math.min(...group.map((i) => this.deeds[i].houses));
    return deed.houses === min && this.players[player].cash >= GROUPS[sq.group].house;
  }

  build(player: number, square: number): boolean {
    if (!this.canBuild(player, square)) return false;
    const sq = BOARD[square] as Extract<(typeof BOARD)[number], { kind: "property" }>;
    this.players[player].cash -= GROUPS[sq.group].house;
    this.deeds[square].houses++;
    this.say(`${this.players[player].name} builds ${this.deeds[square].houses === 5 ? "a hotel" : "a house"} on ${sq.name}`);
    return true;
  }

  canSellHouse(player: number, square: number): boolean {
    const sq = BOARD[square];
    const deed = this.deeds[square];
    if (sq?.kind !== "property" || deed.owner !== player || deed.houses === 0) return false;
    const max = Math.max(...groupSquares(sq.group).map((i) => this.deeds[i].houses));
    return deed.houses === max;
  }

  sellHouse(player: number, square: number): boolean {
    if (!this.canSellHouse(player, square)) return false;
    const sq = BOARD[square] as Extract<(typeof BOARD)[number], { kind: "property" }>;
    this.deeds[square].houses--;
    this.players[player].cash += GROUPS[sq.group].house / 2;
    this.say(`${this.players[player].name} sells a house on ${sq.name}`);
    return true;
  }

  canMortgage(player: number, square: number): boolean {
    const sq = BOARD[square];
    const deed = this.deeds[square];
    if (!deed || deed.owner !== player || deed.mortgaged) return false;
    if (sq.kind === "property") return groupSquares(sq.group).every((i) => this.deeds[i].houses === 0);
    return true;
  }

  mortgage(player: number, square: number): boolean {
    if (!this.canMortgage(player, square)) return false;
    const sq = BOARD[square];
    if (!isOwnable(sq)) return false;
    this.deeds[square].mortgaged = true;
    this.players[player].cash += sq.price / 2;
    this.say(`${this.players[player].name} mortgages ${sq.name}`);
    return true;
  }

  unmortgageCost(square: number): number {
    const sq = BOARD[square];
    return isOwnable(sq) ? Math.ceil((sq.price / 2) * 1.1) : 0;
  }

  unmortgage(player: number, square: number): boolean {
    const deed = this.deeds[square];
    const cost = this.unmortgageCost(square);
    if (!deed || deed.owner !== player || !deed.mortgaged || this.players[player].cash < cost) return false;
    deed.mortgaged = false;
    this.players[player].cash -= cost;
    this.say(`${this.players[player].name} lifts the mortgage on ${BOARD[square].name}`);
    return true;
  }

  // ---- Money ------------------------------------------------------------

  /** Sell houses, then mortgage, cheapest first, until `need` is covered. */
  private raise(player: number, need: number) {
    const p = this.players[player];
    let guard = 0;
    while (p.cash < need && guard++ < 200) {
      const sellable = this.owned(player).filter((i) => this.canSellHouse(player, i));
      if (sellable.length) {
        this.sellHouse(player, sellable[0]);
        continue;
      }
      const mortgageable = this.owned(player)
        .filter((i) => this.canMortgage(player, i))
        .sort((a, b) => (BOARD[a] as { price: number }).price - (BOARD[b] as { price: number }).price);
      if (!mortgageable.length) break;
      this.mortgage(player, mortgageable[0]);
    }
  }

  /** Pay `amount` to a player, or to the bank when `to` is null. */
  private pay(from: number, to: number | null, amount: number) {
    const p = this.players[from];
    if (p.cash < amount) this.raise(from, amount);
    if (p.cash < amount) return this.bankrupt(from, to);
    p.cash -= amount;
    if (to !== null) this.players[to].cash += amount;
  }

  private bankrupt(player: number, creditor: number | null) {
    const p = this.players[player];
    this.say(`${p.name} is bankrupt${creditor !== null ? ` to ${this.players[creditor].name}` : ""}`);
    if (creditor !== null) this.players[creditor].cash += p.cash;
    for (const i of this.owned(player)) {
      const deed = this.deeds[i];
      deed.houses = 0;
      if (creditor !== null) deed.owner = creditor;
      else Object.assign(deed, { owner: null, mortgaged: false });
    }
    p.cash = 0;
    p.bankrupt = true;
    p.passes = 0;
    if (this.alive.length <= 1) this.finish();
    else if (player === this.turn) this.phase = "end";
  }

  // ---- Turn flow --------------------------------------------------------

  roll() {
    if (this.phase !== "roll" && this.phase !== "pit") return;
    const p = this.current;
    const a = this.d6();
    const b = this.d6();
    this.dice = [a, b];
    this.card = null;
    const doubles = a === b;

    if (p.inPit) {
      p.pitTries++;
      if (doubles) {
        p.inPit = false;
        p.pitTries = 0;
        this.say(`${p.name} rolls doubles and climbs out of the Pit`);
        this.move(a + b, true);
        if (this.phase === "roll") this.phase = "end"; // no extra roll after leaving
        return;
      }
      if (p.pitTries < 3) {
        this.say(`${p.name} rolls ${a}+${b} and stays in the Pit`);
        this.phase = "end";
        return;
      }
      this.say(`${p.name} pays ${PIT_FINE} after three tries`);
      p.inPit = false;
      p.pitTries = 0;
      this.pay(this.turn, null, PIT_FINE);
      if (p.bankrupt) return;
      this.move(a + b, true);
      if (this.phase === "roll") this.phase = "end";
      return;
    }

    p.doubles = doubles ? p.doubles + 1 : 0;
    if (p.doubles === 3) {
      this.say(`${p.name} rolls a third double in a row`);
      this.sendToPit();
      return;
    }
    this.say(`${p.name} rolls ${a}+${b}`);
    this.move(a + b, true);
    if (this.phase === "roll" && !doubles) this.phase = "end";
  }

  payToLeavePit() {
    const p = this.current;
    if (!p.inPit || this.phase !== "pit") return;
    if (p.passes > 0) {
      p.passes--;
      this.say(`${p.name} uses a pardon`);
    } else {
      if (p.cash < PIT_FINE) return;
      this.pay(this.turn, null, PIT_FINE);
      this.say(`${p.name} pays ${PIT_FINE} to leave the Pit`);
    }
    p.inPit = false;
    p.pitTries = 0;
    this.phase = "roll";
  }

  private sendToPit() {
    const p = this.current;
    p.pos = PIT;
    p.inPit = true;
    p.pitTries = 0;
    p.doubles = 0;
    this.landed = PIT;
    this.say(`${p.name} goes to the Pit`);
    this.phase = "end";
  }

  private move(steps: number, collect: boolean): void {
    const p = this.current;
    const to = (p.pos + steps + 40) % 40;
    if (collect && steps > 0 && to < p.pos) {
      p.cash += PASS_AGORA;
      this.say(`${p.name} passes the Agora, +${PASS_AGORA}`);
    }
    p.pos = to;
    this.land();
  }

  private moveTo(target: number): void {
    const p = this.current;
    const steps = (target - p.pos + 40) % 40;
    this.move(steps, true);
  }

  private land(mult = 1): void {
    const p = this.current;
    const i = p.pos;
    const sq = BOARD[i];
    this.landed = i;
    this.phase = "roll"; // default; caller downgrades to "end" when the turn is done

    switch (sq.kind) {
      case "banish":
        return this.sendToPit();
      case "tax":
        this.say(`${p.name} pays ${sq.amount} to ${sq.name}`);
        return this.pay(this.turn, null, sq.amount);
      case "oracle":
      case "apella":
        return this.draw(sq.kind);
      case "property":
      case "road":
      case "utility": {
        const deed = this.deeds[i];
        if (deed.owner === null) {
          this.phase = "buy";
          return;
        }
        if (deed.owner === this.turn) return;
        const total = this.dice ? this.dice[0] + this.dice[1] : 7;
        const rent = this.rentFor(i, total, mult);
        if (rent > 0) {
          this.say(`${p.name} pays ${rent} rent to ${this.players[deed.owner].name}`);
          this.pay(this.turn, deed.owner, rent);
        }
        return;
      }
      default:
        return;
    }
  }

  private draw(kind: "oracle" | "apella"): void {
    const deck = kind === "oracle" ? this.oracle : this.apella;
    const card = deck.shift()!;
    deck.push(card);
    const p = this.current;
    this.card = { deck: kind === "oracle" ? "Oracle" : "Apella", text: card.text };
    this.say(`${p.name} draws: ${card.text}`);
    const e = card.effect;
    switch (e.type) {
      case "move":
        return this.moveTo(e.to);
      case "back":
        p.pos = (p.pos - e.steps + 40) % 40;
        return this.land();
      case "nearest": {
        let j = p.pos;
        do j = (j + 1) % 40;
        while (BOARD[j].kind !== e.kind);
        const steps = (j - p.pos + 40) % 40;
        if (j < p.pos) {
          p.cash += PASS_AGORA;
          this.say(`${p.name} passes the Agora, +${PASS_AGORA}`);
        }
        p.pos = (p.pos + steps) % 40;
        if (e.kind === "utility") this.dice = [this.d6(), this.d6()];
        return this.land(2);
      }
      case "money":
        if (e.amount >= 0) p.cash += e.amount;
        else this.pay(this.turn, null, -e.amount);
        return;
      case "each":
        for (const j of this.alive) {
          if (j === this.turn) continue;
          if (e.amount > 0) this.pay(j, this.turn, e.amount);
          else this.pay(this.turn, j, -e.amount);
        }
        return;
      case "repairs": {
        let cost = 0;
        for (const i of this.owned(this.turn)) {
          const h = this.deeds[i].houses;
          cost += h === 5 ? e.hotel : h * e.house;
        }
        if (cost) this.pay(this.turn, null, cost);
        return;
      }
      case "pit":
        return this.sendToPit();
      case "pass":
        p.passes++;
        return;
    }
  }

  buy() {
    if (this.phase !== "buy") return;
    const p = this.current;
    const sq = BOARD[p.pos];
    if (!isOwnable(sq) || p.cash < sq.price) return;
    p.cash -= sq.price;
    this.deeds[p.pos].owner = this.turn;
    this.say(`${p.name} buys ${sq.name} for ${sq.price}`);
    this.afterDecision();
  }

  pass() {
    if (this.phase !== "buy") return;
    this.say(`${this.current.name} leaves ${BOARD[this.current.pos].name} on the market`);
    this.afterDecision();
  }

  private afterDecision() {
    const doubles = this.dice && this.dice[0] === this.dice[1] && !this.current.inPit && this.current.doubles > 0;
    this.phase = doubles ? "roll" : "end";
  }

  endTurn() {
    if (this.phase !== "end" && !(this.phase === "roll" && this.current.bankrupt)) return;
    if (this.alive.length <= 1) return this.finish();
    let next = this.turn;
    do {
      next = (next + 1) % this.players.length;
      if (next === 0) this.round++;
    } while (this.players[next].bankrupt);
    if (this.round > this.maxRounds) return this.finish();
    this.turn = next;
    this.dice = null;
    this.card = null;
    this.current.doubles = 0;
    this.phase = this.current.inPit ? "pit" : "roll";
  }

  private finish() {
    this.phase = "over";
    const w = this.standings()[0];
    this.say(`${this.players[w].name} wins with ${this.netWorth(w)} in net worth`);
  }

  /** Winner first: survivors by net worth, then the bankrupt in reverse order of falling. */
  standings(): number[] {
    return this.players
      .map((_, i) => i)
      .sort((a, b) => Number(this.players[a].bankrupt) - Number(this.players[b].bankrupt) || this.netWorth(b) - this.netWorth(a));
  }
}

/** One decision for the current bot. Returns false when it's a human's move. */
export function botStep(g: MonopolyGame): boolean {
  if (g.phase === "over") return false;
  const me = g.turn;
  const p = g.current;
  if (p.human) return false;

  switch (g.phase) {
    case "pit":
      // Leave early in the game when properties are still for sale; sit tight later.
      if (p.passes > 0 || (g.round < 12 && p.cash > 400)) g.payToLeavePit();
      else g.roll();
      return true;
    case "roll":
      g.roll();
      return true;
    case "buy": {
      const sq = BOARD[p.pos] as { price: number; kind: string; group?: GroupId };
      const completes = sq.kind === "property" && sq.group
        ? groupSquares(sq.group).every((i) => i === p.pos || g.deeds[i].owner === me)
        : false;
      const reserve = completes ? 0 : g.round < 8 ? 100 : 250;
      if (p.cash - sq.price >= reserve) g.buy();
      else g.pass();
      return true;
    }
    case "end": {
      // Develop when comfortable, then lift mortgages, then end the turn.
      const buildable = g.owned(me).filter((i) => g.canBuild(me, i)).sort((a, b) => b - a);
      if (buildable.length && p.cash - 300 > 0) {
        const sq = BOARD[buildable[0]] as { group: GroupId };
        if (p.cash - GROUPS[sq.group].house >= 300) {
          g.build(me, buildable[0]);
          return true;
        }
      }
      const mortgaged = g.owned(me).filter((i) => g.deeds[i].mortgaged);
      if (mortgaged.length && p.cash - g.unmortgageCost(mortgaged[0]) > 600) {
        g.unmortgage(me, mortgaged[0]);
        return true;
      }
      g.endTurn();
      return true;
    }
  }
  return false;
}
