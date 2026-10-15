import { useEffect, useState } from "react";
import { MEMBERS } from "./members";
import { SPIRITS } from "../games/spirits/catalog";
import { hashSeed, pick, seeded, type Rand } from "../games/rng";

/** The lobby's live feed. Example events, generated so it feels inhabited. */
export interface FeedEvent {
  id: string;
  at: number;
  who: string;
  text: string;
  amount?: number;
  kind: "win" | "enter" | "pack" | "market" | "boo" | "collect";
}

function makeEvent(r: Rand, at: number, n: number): FeedEvent {
  const who = pick(MEMBERS, r).name;
  const roll = r();
  const id = `${at}-${n}`;
  if (roll < 0.18) return { id, at, who, kind: "win", text: "won a poker sit & go", amount: Math.round((9000 + r() * 30000) / 100) * 100 };
  if (roll < 0.36) return { id, at, who, kind: "boo", text: "staked on today's Blue or Orange" };
  if (roll < 0.52) {
    const s = pick(SPIRITS.filter((x) => x.rarity !== "common"), r);
    return { id, at, who, kind: "pack", text: `pulled ${s.name} from a pack` };
  }
  if (roll < 0.66) {
    const s = pick(SPIRITS, r);
    return { id, at, who, kind: "market", text: `bought ${s.name} on the market`, amount: Math.round((400 + r() * 7000) / 10) * 10 };
  }
  if (roll < 0.82) return { id, at, who, kind: "collect", text: "collected", amount: 17000 };
  return { id, at, who, kind: "enter", text: "took a seat for Sunday" };
}

export function useFeed(size = 9): FeedEvent[] {
  const [events, setEvents] = useState<FeedEvent[]>(() => {
    const now = Date.now();
    const r = seeded(hashSeed(String(Math.floor(now / 3_600_000))));
    return Array.from({ length: size }, (_, i) => makeEvent(r, now - (i + 1) * (90_000 + r() * 240_000), i));
  });
  useEffect(() => {
    const r = seeded(Date.now() >>> 0);
    let n = 1000;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setEvents((list) => [makeEvent(r, Date.now(), n++), ...list].slice(0, size));
      timer = setTimeout(tick, 7000 + r() * 11000);
    };
    timer = setTimeout(tick, 5000);
    return () => clearTimeout(timer);
  }, [size]);
  return events;
}
