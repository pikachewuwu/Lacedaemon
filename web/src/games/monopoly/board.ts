/**
 * The Lacedaemon board. Classic Monopoly layout, prices and rent tables;
 * the squares are places in Laconia. Money is drachmae (₯), not dragons:
 * dragons only change hands at entry and payout.
 */

export type GroupId = "brown" | "sky" | "rose" | "amber" | "red" | "gold" | "olive" | "royal";

export const GROUPS: Record<GroupId, { color: string; house: number }> = {
  brown: { color: "#8a5a3c", house: 50 },
  sky: { color: "#8fc4e8", house: 50 },
  rose: { color: "#d76fa3", house: 100 },
  amber: { color: "#f0923e", house: 100 },
  red: { color: "#d9534a", house: 150 },
  gold: { color: "#e8c547", house: 150 },
  olive: { color: "#6fae6a", house: 200 },
  royal: { color: "#4f6fd6", house: 200 },
};

export type Square =
  | { kind: "agora"; name: string }
  | { kind: "property"; name: string; group: GroupId; price: number; rent: [number, number, number, number, number, number] }
  | { kind: "road"; name: string; price: number }
  | { kind: "utility"; name: string; price: number }
  | { kind: "tax"; name: string; amount: number }
  | { kind: "oracle"; name: string }
  | { kind: "apella"; name: string }
  | { kind: "pit"; name: string }
  | { kind: "rest"; name: string }
  | { kind: "banish"; name: string };

type Rent = [number, number, number, number, number, number];
const P = (name: string, group: GroupId, price: number, rent: Rent): Square => ({
  kind: "property",
  name,
  group,
  price,
  rent,
});

export const BOARD: Square[] = [
  { kind: "agora", name: "Agora" },
  P("Helos", "brown", 60, [2, 10, 30, 90, 160, 250]),
  { kind: "apella", name: "Apella" },
  P("Gytheion", "brown", 60, [4, 20, 60, 180, 320, 450]),
  { kind: "tax", name: "Tribute", amount: 200 },
  { kind: "road", name: "Road to Argos", price: 200 },
  P("Amyklai", "sky", 100, [6, 30, 90, 270, 400, 550]),
  { kind: "oracle", name: "Oracle" },
  P("Therapne", "sky", 100, [6, 30, 90, 270, 400, 550]),
  P("Pellana", "sky", 120, [8, 40, 100, 300, 450, 600]),
  { kind: "pit", name: "The Pit" },
  P("Sellasia", "rose", 140, [10, 50, 150, 450, 625, 750]),
  { kind: "utility", name: "The Wells", price: 150 },
  P("Karyai", "rose", 140, [10, 50, 150, 450, 625, 750]),
  P("Oinous", "rose", 160, [12, 60, 180, 500, 700, 900]),
  { kind: "road", name: "Road to Tegea", price: 200 },
  P("Taygetus", "amber", 180, [14, 70, 200, 550, 750, 950]),
  { kind: "apella", name: "Apella" },
  P("Eurotas Ford", "amber", 180, [14, 70, 200, 550, 750, 950]),
  P("Menelaion", "amber", 200, [16, 80, 220, 600, 800, 1000]),
  { kind: "rest", name: "Rest" },
  P("Pitane", "red", 220, [18, 90, 250, 700, 875, 1050]),
  { kind: "oracle", name: "Oracle" },
  P("Limnai", "red", 220, [18, 90, 250, 700, 875, 1050]),
  P("Mesoa", "red", 240, [20, 100, 300, 750, 925, 1100]),
  { kind: "road", name: "Road to Messene", price: 200 },
  P("Kynosoura", "gold", 260, [22, 110, 330, 800, 975, 1150]),
  P("Dromos", "gold", 260, [22, 110, 330, 800, 975, 1150]),
  { kind: "utility", name: "The Forge", price: 150 },
  P("Platanistas", "gold", 280, [24, 120, 360, 850, 1025, 1200]),
  { kind: "banish", name: "Banished" },
  P("Theatre", "olive", 300, [26, 130, 390, 900, 1100, 1275]),
  P("Persian Stoa", "olive", 300, [26, 130, 390, 900, 1100, 1275]),
  { kind: "apella", name: "Apella" },
  P("Acropolis", "olive", 320, [28, 150, 450, 1000, 1200, 1400]),
  { kind: "road", name: "Road to Olympia", price: 200 },
  { kind: "oracle", name: "Oracle" },
  P("Sanctuary of Orthia", "royal", 350, [35, 175, 500, 1100, 1300, 1500]),
  { kind: "tax", name: "Ephors' Levy", amount: 100 },
  P("Throne of Apollo", "royal", 400, [50, 200, 600, 1400, 1700, 2000]),
];

export const PIT = 10;
export const PASS_AGORA = 200;
export const PIT_FINE = 50;

export const isOwnable = (sq: Square): sq is Extract<Square, { price: number }> =>
  sq.kind === "property" || sq.kind === "road" || sq.kind === "utility";

export const groupSquares = (group: GroupId) =>
  BOARD.flatMap((sq, i) => (sq.kind === "property" && sq.group === group ? [i] : []));

export type CardEffect =
  | { type: "move"; to: number }
  | { type: "back"; steps: number }
  | { type: "nearest"; kind: "road" | "utility" }
  | { type: "money"; amount: number }
  | { type: "each"; amount: number }
  | { type: "repairs"; house: number; hotel: number }
  | { type: "pit" }
  | { type: "pass" };

export interface DeckCard {
  text: string;
  effect: CardEffect;
}

export const ORACLE: DeckCard[] = [
  { text: "The oracle sends you to the Agora. Collect 200.", effect: { type: "move", to: 0 } },
  { text: "Walk to the Throne of Apollo.", effect: { type: "move", to: 39 } },
  { text: "Go to Mesoa. Collect 200 if you pass the Agora.", effect: { type: "move", to: 24 } },
  { text: "Go to Sellasia. Collect 200 if you pass the Agora.", effect: { type: "move", to: 11 } },
  { text: "Take the nearest road. Pay its owner double.", effect: { type: "nearest", kind: "road" } },
  { text: "Go to the nearest utility. Pay ten times the dice.", effect: { type: "nearest", kind: "utility" } },
  { text: "The gods are pleased. Collect 50.", effect: { type: "money", amount: 50 } },
  { text: "A favour from the ephors. Keep this to leave the Pit.", effect: { type: "pass" } },
  { text: "Step back three squares.", effect: { type: "back", steps: 3 } },
  { text: "Your sins are known. Go to the Pit.", effect: { type: "pit" } },
  { text: "Your walls need repair. Pay 25 per house, 100 per hotel.", effect: { type: "repairs", house: 25, hotel: 100 } },
  { text: "Speeding chariot. Pay 15.", effect: { type: "money", amount: -15 } },
  { text: "Take the Road to Argos.", effect: { type: "move", to: 5 } },
  { text: "You lead the assembly. Pay each player 50.", effect: { type: "each", amount: -50 } },
  { text: "Your grain loan matures. Collect 150.", effect: { type: "money", amount: 150 } },
];

export const APELLA: DeckCard[] = [
  { text: "Return to the Agora. Collect 200.", effect: { type: "move", to: 0 } },
  { text: "The treasury miscounted in your favour. Collect 200.", effect: { type: "money", amount: 200 } },
  { text: "The physician's fee. Pay 50.", effect: { type: "money", amount: -50 } },
  { text: "You sell olive oil. Collect 50.", effect: { type: "money", amount: 50 } },
  { text: "Pardoned. Keep this to leave the Pit.", effect: { type: "pass" } },
  { text: "Caught stealing cheese at Orthia. Go to the Pit.", effect: { type: "pit" } },
  { text: "Festival fund pays out. Collect 100.", effect: { type: "money", amount: 100 } },
  { text: "Tribute refund. Collect 20.", effect: { type: "money", amount: 20 } },
  { text: "It's your name day. Collect 10 from each player.", effect: { type: "each", amount: 10 } },
  { text: "Your hoplite insurance matures. Collect 100.", effect: { type: "money", amount: 100 } },
  { text: "Wounded in training. Pay 100.", effect: { type: "money", amount: -100 } },
  { text: "The agoge asks for its fee. Pay 50.", effect: { type: "money", amount: -50 } },
  { text: "Paid for advice. Collect 25.", effect: { type: "money", amount: 25 } },
  { text: "Road works. Pay 40 per house, 115 per hotel.", effect: { type: "repairs", house: 40, hotel: 115 } },
  { text: "Second place at the games. Collect 10.", effect: { type: "money", amount: 10 } },
  { text: "An inheritance. Collect 100.", effect: { type: "money", amount: 100 } },
];
