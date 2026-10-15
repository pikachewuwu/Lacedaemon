import type { Rand } from "../rng";
import type { Colour } from "../boo/round";

/**
 * Spirits: a collectible creature set. Three elements form the same cycle
 * as Blue or Orange (water puts out fire, fire burns grass, grass drinks
 * water), so a Blue or Orange win can drop a spirit of the winning colour
 * and a future battle mode reuses the rule everyone already knows.
 * Aether spirits stand outside the cycle.
 */

export type Element = "water" | "fire" | "grass" | "aether";
export type Rarity = "common" | "uncommon" | "rare" | "mythic" | "exalted";

export const ELEMENT_COLOUR: Record<Exclude<Element, "aether">, Colour> = { water: "blue", fire: "orange", grass: "green" };
export const COLOUR_ELEMENT: Record<Colour, Element> = { blue: "water", orange: "fire", green: "grass" };

export interface Spirit {
  id: string;
  no: number;
  name: string;
  element: Element;
  rarity: Rarity;
  power: number;
  move: string;
  line: string;
}

const S = (no: number, name: string, element: Element, rarity: Rarity, power: number, move: string, line: string): Spirit => ({
  id: name.toLowerCase(),
  no,
  name,
  element,
  rarity,
  power,
  move,
  line,
});

export const SPIRITS: Spirit[] = [
  S(1, "Nerilla", "water", "common", 18, "Undertow", "Hides in the reeds of the Eurotas."),
  S(2, "Hydrak", "water", "common", 22, "Spray", "Three heads, one opinion."),
  S(3, "Glaukid", "water", "common", 20, "Glint", "Its eyes are the colour of shallow sea."),
  S(4, "Thetiscale", "water", "uncommon", 37, "Riptide", "Sheds a scale for every tide it remembers."),
  S(5, "Kymarion", "water", "uncommon", 41, "Breaker", "Rides the ninth wave and no other."),
  S(6, "Okeanyx", "water", "rare", 63, "Abyssal Call", "Older than the coastline."),
  S(7, "Poseidra", "water", "mythic", 84, "Trident Rain", "When she surfaces, harbours empty."),
  S(8, "Emberkid", "fire", "common", 19, "Spark", "Follows anyone carrying a torch."),
  S(9, "Kindlefox", "fire", "common", 21, "Flicker", "Its tail sets the dry grass talking."),
  S(10, "Pyrrhic", "fire", "common", 24, "Costly Blow", "Wins, and pays for it."),
  S(11, "Hephling", "fire", "uncommon", 38, "Forge Breath", "Apprenticed to the smith of the gods."),
  S(12, "Ashmane", "fire", "uncommon", 42, "Cinder Roar", "Leaves a trail of grey where it lies down."),
  S(13, "Phlegyon", "fire", "rare", 65, "Burning River", "Swims upstream through lava."),
  S(14, "Pyrelord", "fire", "mythic", 86, "Pyre", "Lights the offering and keeps the smoke."),
  S(15, "Sproutling", "grass", "common", 17, "Seed Shot", "Plant it and wait a summer."),
  S(16, "Mossbuck", "grass", "common", 23, "Antler Bloom", "Flowers grow on its antlers in spring."),
  S(17, "Thallo", "grass", "common", 20, "Green Shoot", "Named for the season of first growth."),
  S(18, "Dryadel", "grass", "uncommon", 39, "Bark Skin", "Lives in one oak for a thousand years."),
  S(19, "Oleandra", "grass", "uncommon", 40, "Bitter Bloom", "Beautiful, and poisonous to the touch."),
  S(20, "Elaiarch", "grass", "rare", 64, "Olive Crown", "Its branches crown the winners at Olympia."),
  S(21, "Daphnaia", "grass", "mythic", 85, "Laurel Flight", "Became a tree rather than be caught."),
  S(22, "Orthia", "aether", "exalted", 92, "Offering", "The upright one. Accepts what is given."),
  S(23, "Kaiadas", "aether", "exalted", 90, "The Drop", "The pit beneath the mountain, awake."),
  S(24, "Daimon", "aether", "exalted", 99, "Underneath", "The spirit that keeps the ledger."),
];

export const byId = (id: string) => SPIRITS.find((s) => s.id === id)!;

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "mythic", "exalted"];

/** Reference value in dragons, used to price listings and judge wagers. */
export const REFERENCE: Record<Rarity, number> = {
  common: 400,
  uncommon: 1400,
  rare: 6000,
  mythic: 24000,
  exalted: 90000,
};

export interface CardInstance {
  uid: string;
  spirit: string;
  foil: boolean;
  serial: number;
  /** How it was obtained, for the card's back. */
  origin: string;
  /** Set when the card is a game night trophy. */
  laurel?: { week: string; game: string };
}

export function cardValue(card: CardInstance): number {
  const base = REFERENCE[byId(card.spirit).rarity];
  return Math.round(base * (card.foil ? 3 : 1) * (card.laurel ? 2 : 1));
}

function drawRarity(rand: Rand, table: [Rarity, number][]): Rarity {
  let r = rand();
  for (const [rarity, p] of table) {
    if ((r -= p) < 0) return rarity;
  }
  return table[table.length - 1][0];
}

function drawSpirit(rand: Rand, rarity: Rarity, element?: Element): Spirit {
  let pool = SPIRITS.filter((s) => s.rarity === rarity && (!element || s.element === element));
  if (!pool.length) pool = SPIRITS.filter((s) => s.rarity === rarity);
  return pool[Math.floor(rand() * pool.length)];
}

let uidCounter = 0;
const makeUid = (rand: Rand) => `${Date.now().toString(36)}${(uidCounter++).toString(36)}${Math.floor(rand() * 1e6).toString(36)}`;

export function mint(rand: Rand, spirit: Spirit, origin: string, foilChance = 0.06): CardInstance {
  return {
    uid: makeUid(rand),
    spirit: spirit.id,
    foil: rand() < foilChance,
    serial: 1 + Math.floor(rand() * 2400),
    origin,
  };
}

export const PACK_PRICE = 3000;
export const PACK_SLOTS: [Rarity, number][][] = [
  [["common", 1]],
  [["common", 1]],
  [["common", 1]],
  [["uncommon", 1]],
  [["rare", 0.8], ["mythic", 0.16], ["exalted", 0.04]],
];

/** Five cards, rarest last so the reveal builds. */
export function openPack(rand: Rand): CardInstance[] {
  return PACK_SLOTS.map((slot) => mint(rand, drawSpirit(rand, drawRarity(rand, slot)), "Pack"));
}

/**
 * After any finished game there is a chance of a drop, like a weekly case
 * drop. A Blue or Orange win drops a spirit of the winning colour.
 */
export function rollDrop(rand: Rand, origin: string, element?: Element, chance = 0.3): CardInstance | null {
  if (rand() >= chance) return null;
  const rarity = drawRarity(rand, [["common", 0.7], ["uncommon", 0.25], ["rare", 0.05]]);
  return mint(rand, drawSpirit(rand, rarity, element), origin);
}
