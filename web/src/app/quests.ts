import { addCards, earn, getState, notify, setState, setTracker } from "./store";
import { dateKey, nextSunday, sundayIndex } from "./time";
import { openPack } from "../games/spirits/catalog";
import { defaultRand, hashSeed, seeded } from "../games/rng";

/**
 * Quests tie every corner of the site together: a daily set drawn from a
 * pool, a weekly set, and a season track that levels up with XP. Anything
 * on the site reports progress with track("event"); quests listen.
 */

export type Reward = { dragons?: number; pack?: boolean; title?: string };

export interface Quest {
  id: string;
  title: string;
  event: string;
  goal: number;
  xp: number;
  reward: Reward;
  where: string;
}

const DAILY_POOL: Quest[] = [
  { id: "d-collect", title: "Collect your income", event: "collect", goal: 1, xp: 40, reward: { dragons: 2000 }, where: "lobby" },
  { id: "d-boo", title: "Back a colour in Blue or Orange", event: "enter:blue-or-orange", goal: 1, xp: 50, reward: { dragons: 1500 }, where: "blue-or-orange" },
  { id: "d-hands", title: "Play 10 hands of poker", event: "poker_hand", goal: 10, xp: 60, reward: { dragons: 2500 }, where: "poker" },
  { id: "d-bones", title: "Throw the knucklebones 5 times", event: "bones_throw", goal: 5, xp: 40, reward: { dragons: 1500 }, where: "symposium" },
  { id: "d-arena", title: "Win an arena duel", event: "win:arena", goal: 1, xp: 80, reward: { dragons: 3000 }, where: "arena" },
  { id: "d-chat", title: "Send 5 messages in chat", event: "chat_message", goal: 5, xp: 30, reward: { dragons: 1000 }, where: "chat" },
  { id: "d-mc", title: "Say something in the Minecraft chat", event: "mc_chat", goal: 1, xp: 30, reward: { dragons: 1000 }, where: "minecraft" },
  { id: "d-pack", title: "Open a pack", event: "pack_open", goal: 1, xp: 50, reward: { dragons: 1000 }, where: "spirits" },
  { id: "d-market", title: "Trade on any market", event: "market_trade", goal: 1, xp: 40, reward: { dragons: 1500 }, where: "spirits" },
  { id: "d-news", title: "Read today's Laconian", event: "news_read", goal: 1, xp: 20, reward: { dragons: 500 }, where: "news" },
  { id: "d-kottabos", title: "Hit the disc at kottabos", event: "kottabos_hit", goal: 1, xp: 40, reward: { dragons: 1500 }, where: "symposium" },
  { id: "d-vote", title: "Vote on an idea", event: "idea_vote", goal: 1, xp: 20, reward: { dragons: 500 }, where: "ideas" },
  { id: "d-pente", title: "Finish today's Pente", event: "pente_done", goal: 1, xp: 40, reward: { dragons: 1000 }, where: "pente" },
];

export const WEEKLY: Quest[] = [
  { id: "w-sunday", title: "Take a seat at game night", event: "enter:poker|enter:monopoly", goal: 1, xp: 150, reward: { pack: true }, where: "sunday" },
  { id: "w-arena", title: "Win 3 arena duels", event: "win:arena", goal: 3, xp: 200, reward: { pack: true }, where: "arena" },
  { id: "w-boo", title: "Win a round of Blue or Orange", event: "win:boo", goal: 1, xp: 150, reward: { dragons: 8000 }, where: "blue-or-orange" },
  { id: "w-mc", title: "Trade an item on the Minecraft market", event: "mc_trade", goal: 1, xp: 120, reward: { dragons: 6000 }, where: "minecraft" },
  { id: "w-monopoly", title: "Finish a game of Monopoly", event: "play:monopoly", goal: 1, xp: 150, reward: { dragons: 6000 }, where: "monopoly" },
];

export const XP_PER_LEVEL = 300;
export const SEASON: { level: number; reward: Reward; label: string }[] = [
  { level: 1, reward: { dragons: 5000 }, label: "5,000 dragons" },
  { level: 2, reward: { pack: true }, label: "Spirits pack" },
  { level: 3, reward: { title: "Hoplite" }, label: "Title: Hoplite" },
  { level: 4, reward: { dragons: 10000 }, label: "10,000 dragons" },
  { level: 5, reward: { pack: true }, label: "Spirits pack" },
  { level: 6, reward: { title: "Helot Whisperer" }, label: "Title: Helot Whisperer" },
  { level: 7, reward: { dragons: 20000 }, label: "20,000 dragons" },
  { level: 8, reward: { pack: true }, label: "Spirits pack" },
  { level: 9, reward: { title: "Ephor" }, label: "Title: Ephor" },
  { level: 10, reward: { dragons: 50000, title: "Spartiate" }, label: "50,000 dragons and Spartiate" },
];

export function weekKey(now = new Date()) {
  return String(sundayIndex(nextSunday(now)));
}

export function dailyQuests(day = dateKey()): Quest[] {
  const r = seeded(hashSeed("quests:" + day));
  return DAILY_POOL.slice().sort(() => r() - 0.5).slice(0, 4);
}

export const level = (xp: number) => Math.floor(xp / XP_PER_LEVEL);

const matches = (q: Quest, event: string) => q.event.split("|").includes(event);

/** Reset progress when the day or week rolls over. */
function fresh() {
  const s = getState();
  const day = dateKey();
  const week = weekKey();
  if (s.quests.day === day && s.quests.week === week) return s.quests;
  const keepWeekly = s.quests.week === week;
  const progress: Record<string, number> = {};
  const claimed: string[] = [];
  if (keepWeekly) {
    for (const q of WEEKLY) {
      if (s.quests.progress[q.id]) progress[q.id] = s.quests.progress[q.id];
      if (s.quests.claimed.includes(q.id)) claimed.push(q.id);
    }
  }
  const quests = { day, week, progress, claimed };
  setState({ quests });
  return quests;
}

setTracker((event, amount) => {
  if (!getState().signedIn) return;
  const q = fresh();
  const progress = { ...q.progress };
  let changed = false;
  for (const quest of [...dailyQuests(q.day), ...WEEKLY]) {
    if (!matches(quest, event)) continue;
    const before = progress[quest.id] ?? 0;
    if (before >= quest.goal) continue;
    progress[quest.id] = Math.min(quest.goal, before + amount);
    changed = true;
    if (progress[quest.id] >= quest.goal) notify(`Quest done: ${quest.title}. Claim your reward.`, "quests");
  }
  if (changed) setState({ quests: { ...q, progress } });
});

function grant(reward: Reward, why: string) {
  if (reward.dragons) earn(reward.dragons, why, "quest");
  if (reward.pack) addCards(openPack(defaultRand), `${why}: a Spirits pack`, "quest");
  if (reward.title) setState((s) => ({ titles: s.titles.includes(reward.title!) ? s.titles : [...s.titles, reward.title!] }));
}

export function claim(quest: Quest) {
  const q = fresh();
  if ((q.progress[quest.id] ?? 0) < quest.goal || q.claimed.includes(quest.id)) return false;
  setState((s) => ({ quests: { ...q, claimed: [...q.claimed, quest.id] }, xp: s.xp + quest.xp }));
  grant(quest.reward, `Quest: ${quest.title}`);
  return true;
}

export function claimSeason(lvl: number) {
  const s = getState();
  const step = SEASON.find((x) => x.level === lvl);
  if (!step || level(s.xp) < lvl || s.seasonClaimed.includes(lvl)) return false;
  setState({ seasonClaimed: [...s.seasonClaimed, lvl] });
  grant(step.reward, `Season level ${lvl}`);
  return true;
}

export function questState() {
  return fresh();
}
