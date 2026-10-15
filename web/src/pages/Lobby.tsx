import { useState } from "react";
import { go, type Route } from "../app/router";
import { setState, useStore } from "../app/store";
import { sundayInfo, SUNDAY_ENTRY } from "../app/sunday";
import { countdown, dateKey, fmtDate, pad } from "../app/time";
import { dailyQuests } from "../app/quests";
import { answerFor } from "../games/pente/pente";
import { useFeed } from "../app/feed";
import { MEMBERS } from "../app/members";
import { ago, fmt } from "../app/format";
import { PROGRAMS } from "../economy/modules";
import { PACK_PRICE } from "../games/spirits/catalog";
import { Avatar, Daemon, Dragons, useNow } from "../ui/kit";
import { SkyBand } from "../ui/Sky";
import { EntryModal, KindChip } from "../ui/Entry";
import { SpiritCard } from "../ui/SpiritCard";

export function SundayEntrants({ entrants, seats }: { entrants: string[]; seats: number }) {
  return (
    <div className="seats">
      {Array.from({ length: seats }, (_, i) =>
        entrants[i] ? (
          <span key={i} title={entrants[i]}><Avatar name={entrants[i]} you={entrants[i] === "you"} /></span>
        ) : (
          <span key={i} className="seat-empty" />
        ),
      )}
    </div>
  );
}

function Hero() {
  const now = useNow(1000);
  const s = useStore((x) => x);
  const info = sundayInfo(s, new Date(now));
  const c = countdown(info.date.getTime() - now);
  const [open, setOpen] = useState(false);
  const gameName = info.game === "poker" ? "Poker" : "Monopoly";
  return (
    <SkyBand now={now}>
      <div className="hero-copy">
        <p className="label hero-label">Game night · week {info.week}</p>
        <h1 className="display hero-title">{gameName}</h1>
        <p className="hero-when">
          {fmtDate(info.date, { weekday: "long", day: "numeric", month: "long" })} · 16:00 Berlin
        </p>
        <div className="hero-count num" aria-label="Time until game night">
          <span>{c.d}<small>d</small></span>
          <span>{pad(c.h)}<small>h</small></span>
          <span>{pad(c.m)}<small>m</small></span>
          <span>{pad(c.s)}<small>s</small></span>
        </div>
        <div className="hero-row">
          <div className="hero-stat">
            <span className="label">Prize so far</span>
            <Dragons value={info.pot} className="hero-pot" />
          </div>
          <div className="hero-stat">
            <span className="label">{info.entrants.length} of {info.seats} seats</span>
            <SundayEntrants entrants={info.entrants} seats={info.seats} />
          </div>
        </div>
        <div className="hero-actions">
          {info.registered ? (
            <button className="btn btn-lg" onClick={() => go("sunday")}>You're seated · details</button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)} disabled={info.entrants.length >= info.seats}>
              Take a seat · <Dragons value={SUNDAY_ENTRY} />
            </button>
          )}
          <button className="btn btn-lg btn-glass" onClick={() => go(info.game)}>Practice {gameName.toLowerCase()}</button>
        </div>
      </div>
      <EntryModal
        open={open}
        onClose={() => setOpen(false)}
        slug={info.game}
        amount={SUNDAY_ENTRY}
        title={`Game night · ${gameName}`}
        detail={`One seat at the ${fmtDate(info.date, { weekday: "long", day: "numeric", month: "long" })} table. Winner takes the pot.`}
        confirmLabel="Take a seat"
        onEntered={() => setState({ sundayWeek: String(info.week) })}
      />
    </SkyBand>
  );
}

function GameArt({ kind }: { kind: string }) {
  if (kind === "poker")
    return (
      <div className="ga ga-poker">
        <span className="pc pc-a">A<i>♠</i></span>
        <span className="pc pc-k">K<i>♥</i></span>
      </div>
    );
  if (kind === "monopoly")
    return (
      <div className="ga ga-mono">
        {["#8a5a3c", "#8fc4e8", "#d76fa3", "#f0923e", "#d9534a", "#e8c547", "#6fae6a", "#4f6fd6"].map((c) => <i key={c} style={{ background: c }} />)}
      </div>
    );
  if (kind === "blue-or-orange")
    return (
      <div className="ga ga-boo">
        <i className="b" /><i className="o" /><i className="g" />
      </div>
    );
  if (kind === "knucklebones")
    return (
      <div className="ga ga-bones">
        {[0, 1, 2, 3].map((i) => (
          <svg key={i} viewBox="-20 -16 40 32" style={{ transform: `rotate(${[-18, 12, -6, 24][i]}deg)` }}>
            <path d="M-17 -9 Q -10 -15 -4 -10 Q 0 -6 4 -10 Q 10 -15 17 -9 Q 19 0 17 9 Q 10 15 4 10 Q 0 6 -4 10 Q -10 15 -17 9 Q -19 0 -17 -9 Z" />
          </svg>
        ))}
      </div>
    );
  if (kind === "arena")
    return (
      <div className="ga ga-arena">
        <SpiritCard spiritId="phlegyon" size="sm" />
        <span className="display ga-vs">vs</span>
        <SpiritCard spiritId="okeanyx" size="sm" />
      </div>
    );
  return (
    <div className="ga ga-spirits">
      <SpiritCard spiritId="okeanyx" size="sm" />
      <SpiritCard spiritId="pyrelord" size="sm" />
      <SpiritCard spiritId="daphnaia" size="sm" />
    </div>
  );
}

interface Tile { route: Route; slug: string; art: string; title: string; line: string; cta: string; meta: string }

const HOUSE_TILES: Tile[] = [
  { route: "poker", slug: "poker", art: "poker", title: "Poker", line: "Sit & go tournaments, or a private table where dragons, cards and Minecraft items can be staked.", cta: "Sit down", meta: "from 2,500" },
  { route: "monopoly", slug: "monopoly", art: "monopoly", title: "Monopoly", line: "The Laconian board. Buy the Eurotas, build on Orthia, bankrupt your friends.", cta: "Play a game", meta: "10,000" },
  { route: "arena", slug: "arena", art: "arena", title: "Arena", line: "Three spirits a side. Guess who they send, and send what beats it.", cta: "Find a duel", meta: "ranked" },
];

const MEMBER_TILES: Tile[] = [
  { route: "blue-or-orange", slug: "blue-or-orange", art: "blue-or-orange", title: "Blue or Orange", line: "Once a day. Back a colour. The smallest pool wins, the two biggest fight.", cta: "Stake today", meta: "from 500" },
  { route: "spirits", slug: "spirits", art: "spirits", title: "Spirits", line: "Open packs, collect all 24, duel in the arena, trade or stake them.", cta: "Open a pack", meta: `pack ${fmt(PACK_PRICE)}` },
  { route: "symposium", slug: "knucklebones", art: "knucklebones", title: "Knucklebones", line: "At the Symposium. Everyone antes, everyone throws. Venus beats all.", cta: "Take a seat", meta: "from 500" },
];

function TileCard({ t }: { t: Tile }) {
  const m = PROGRAMS.find((x) => x.slug === t.slug);
  return (
    <button className="tile" onClick={() => go(t.route)}>
      <GameArt kind={t.art} />
      <div className="tile-body">
        <div className="tile-top">
          <h3>{t.title}</h3>
          <KindChip slug={t.slug} />
        </div>
        <p className="muted">{t.line}</p>
        <div className="tile-foot">
          <span className="faint mono tile-mod">{m && m.kind === "module" ? `${m.players7d} players this week · ` : ""}{t.meta}</span>
          <span className="tile-cta">{t.cta} →</span>
        </div>
      </div>
    </button>
  );
}

function Today() {
  const s = useStore((x) => x);
  const now = useNow(60000);
  const day = dateKey(new Date(now));
  const pente = s.pente.day === day ? s.pente.guesses : [];
  const solved = pente.length > 0 && pente[pente.length - 1] === answerFor(day);
  const quests = dailyQuests(day);
  const done = quests.filter((q) => (s.quests.day === day ? s.quests.progress[q.id] ?? 0 : 0) >= q.goal).length;
  const boo = s.boo && s.boo.date === day;
  const ready = now >= s.collectAt;
  return (
    <div className="today">
      <button className="today-card" onClick={() => go("pente")}>
        <span className="label">Pente · daily</span>
        <span className="today-v">{solved ? `Solved in ${pente.length}` : pente.length >= 6 ? "Not today" : pente.length ? `${pente.length}/6 guesses` : "Today's word is waiting"}</span>
        <span className="today-tiles">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={solved ? "hit" : i < pente.length ? "near" : ""} />)}</span>
      </button>
      <button className="today-card" onClick={() => go("quests")}>
        <span className="label">Quests</span>
        <span className="today-v">{done} of {quests.length} done</span>
        <span className="today-bar"><i style={{ width: `${(done / quests.length) * 100}%` }} /></span>
      </button>
      <button className="today-card" onClick={() => go("blue-or-orange")}>
        <span className="label">Blue or Orange</span>
        <span className="today-v">{boo ? <>Backed <b className={`t-${s.boo!.colour}`}>{s.boo!.colour}</b></> : "Not staked yet"}</span>
        <span className="boo-orbs"><i className="b" /><i className="o" /><i className="g" /></span>
      </button>
      <button className="today-card" onClick={() => go("chat")}>
        <span className="label">=collect</span>
        <span className="today-v">{ready ? "Ready to collect" : `in ${Math.ceil((s.collectAt - now) / 3600000)} h`}</span>
        <span className="faint mono" style={{ fontSize: 11 }}>{ready ? "17,000 dragons" : "Soul income"}</span>
      </button>
    </div>
  );
}

function Feed() {
  const events = useFeed(8);
  const now = useNow(10000);
  return (
    <section className="panel">
      <div className="panel-head"><h3>Live</h3><span className="chip chip-live">{MEMBERS.filter((m) => m.online).length} online</span></div>
      <ol className="feed mono">
        {events.map((e) => (
          <li key={e.id}>
            <span className="feed-t">{ago(e.at, now)}</span>
            <span className="feed-line"><span className="feed-who">{e.who}</span> <span className="feed-what">{e.text}{e.amount ? <> <Dragons value={e.amount} /></> : null}</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Standing() {
  const s = useStore((x) => x);
  const top = [...MEMBERS].sort((a, b) => b.dragons - a.dragons).slice(0, 5);
  return (
    <section className="panel">
      <div className="panel-head"><h3>Richest</h3><button className="btn btn-ghost btn-sm" onClick={() => go("leaderboard")}>All</button></div>
      <ol className="leaders">
        {top.map((m, i) => (
          <li key={m.id}>
            <span className="num faint">{i + 1}</span>
            <Avatar name={m.name} />
            <span className="leaders-name">{m.name}</span>
            <Dragons value={m.dragons} />
          </li>
        ))}
      </ol>
      {s.signedIn && (
        <div className="panel-foot">
          <span className="muted">You</span>
          <Dragons value={s.dragons} />
          {s.daemon > 0 && <Daemon value={s.daemon} className="faint" />}
        </div>
      )}
    </section>
  );
}

export function Lobby() {
  return (
    <div className="lobby">
      <Hero />
      <div className="lobby-grid">
        <div className="lobby-main">
          <Today />
          <div className="section-title shelf-title">
            <h2>House games</h2>
            <p className="muted">Run by the server. Dragons only, every entry goes to the prize.</p>
          </div>
          <div className="tiles">
            {HOUSE_TILES.map((t) => <TileCard key={t.slug} t={t} />)}
          </div>
          <div className="section-title shelf-title">
            <h2>Built by members</h2>
            <p className="muted">Games members build and run themselves. Entries buy a little of what's underneath.</p>
          </div>
          <div className="tiles">
            {MEMBER_TILES.map((t) => <TileCard key={t.slug} t={t} />)}
            <button className="tile tile-ghost" onClick={() => go("daemon")}>
              <div className="ga ga-ghost"><span className="ghost-plus">+</span></div>
              <div className="tile-body">
                <div className="tile-top"><h3>Yours</h3></div>
                <p className="muted">Build a game, set where the dragons go, and run it for the server.</p>
                <div className="tile-foot"><span /><span className="tile-cta">Go underneath →</span></div>
              </div>
            </button>
          </div>
        </div>
        <aside className="lobby-rail">
          <Feed />
          <Standing />
        </aside>
      </div>
    </div>
  );
}
