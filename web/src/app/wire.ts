import { useEffect, useState } from "react";

/**
 * The Wire: Hacker News top stories, for the newspaper and #wire.
 * Uses the public HN API. Where the network is blocked (the hosted
 * preview), it shows a labelled sample instead.
 */

export interface Story {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  comments: number;
  time: number;
}

const SAMPLE: Story[] = [
  { id: 1, title: "Show HN: A multiplayer Monopoly that runs entirely in the browser", score: 412, by: "sample", comments: 138, time: Date.now() / 1000 - 3600 },
  { id: 2, title: "Ask HN: What do you use to replace Discord for a small community?", score: 377, by: "sample", comments: 291, time: Date.now() / 1000 - 7200 },
  { id: 3, title: "Designing fair crash-free games: notes on provably fair randomness", score: 254, by: "sample", comments: 87, time: Date.now() / 1000 - 9800 },
  { id: 4, title: "Running an open-weights model as an auditable judge", score: 221, by: "sample", comments: 64, time: Date.now() / 1000 - 14000 },
  { id: 5, title: "The economics of Minecraft servers with real item markets", score: 198, by: "sample", comments: 112, time: Date.now() / 1000 - 18000 },
  { id: 6, title: "A field guide to rock-paper-scissors dynamics in voting systems", score: 166, by: "sample", comments: 41, time: Date.now() / 1000 - 26000 },
];

let cache: { stories: Story[]; live: boolean } | null = null;

async function load(): Promise<{ stories: Story[]; live: boolean }> {
  if (cache) return cache;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const ids: number[] = await (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: ctl.signal })).json();
    const items = await Promise.all(
      ids.slice(0, 12).map(async (id) => (await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: ctl.signal })).json()),
    );
    clearTimeout(t);
    cache = {
      live: true,
      stories: items.filter(Boolean).map((i) => ({ id: i.id, title: i.title, url: i.url, score: i.score, by: i.by, comments: i.descendants ?? 0, time: i.time })),
    };
  } catch {
    cache = { live: false, stories: SAMPLE };
  }
  return cache;
}

export function useWire() {
  const [state, setState] = useState<{ stories: Story[]; live: boolean; loading: boolean }>({ stories: cache?.stories ?? [], live: cache?.live ?? false, loading: !cache });
  useEffect(() => {
    let alive = true;
    load().then((r) => alive && setState({ ...r, loading: false }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export const hnLink = (s: Story) => (s.by === "sample" ? "https://news.ycombinator.com" : `https://news.ycombinator.com/item?id=${s.id}`);
