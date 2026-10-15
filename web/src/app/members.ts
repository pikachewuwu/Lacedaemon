import { hashSeed, seeded } from "../games/rng";

/** Example members for the mockup. Not real people. */
export interface Member {
  id: string;
  name: string;
  hue: number;
  dragons: number;
  sundays: number;
  booBest: number;
  pokerWins: number;
  monopolyWins: number;
  online: boolean;
}

const NAMES = ["lysander", "gorgo", "brasidas", "kyniska", "agis", "chilon", "demaratus", "archidamus"];

export const MEMBERS: Member[] = NAMES.map((name, i) => {
  const r = seeded(hashSeed(name));
  return {
    id: name,
    name,
    hue: Math.floor(r() * 360),
    dragons: Math.round((80_000 + r() * 900_000) / 100) * 100,
    sundays: Math.floor(r() * 6),
    booBest: 1 + Math.floor(r() * 7),
    pokerWins: Math.floor(r() * 9),
    monopolyWins: Math.floor(r() * 4),
    online: i % 3 !== 2,
  };
});

export const memberByName = (name: string) => MEMBERS.find((m) => m.name === name);

export function hueFor(name: string): number {
  return memberByName(name)?.hue ?? hashSeed(name) % 360;
}
