import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { collect, COLLECT_AMOUNT, earn, getState, track, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { MEMBERS, hueFor } from "../app/members";
import { go } from "../app/router";
import { fmt, fmtD } from "../app/format";
import { useWire, hnLink } from "../app/wire";
import { nameOf, throwBones } from "../games/astragaloi";
import { defaultRand, hashSeed, seeded } from "../games/rng";
import { Avatar, DaemonSign, DragonSign, Mark, useNow } from "../ui/kit";
import { Icon } from "../ui/icons";
import { McHead } from "../ui/Pixel";

/**
 * Chat: the server, without Discord. Its own world under a purple sky.
 * Channels, voice rooms, roles, bots, and a composer that doubles as the
 * command line: =collect, =bal, =claim, /daemon balance, /bones, /roll.
 */

type Kind = "user" | "bot" | "system" | "mc";
interface Embed {
  color: string;
  title: string;
  body: ReactNode;
  action?: { label: string; run: () => void };
  ephemeral?: boolean;
}
interface Msg {
  id: string;
  channel: string;
  who: string;
  at: number;
  text?: string;
  kind: Kind;
  embed?: Embed;
  reactions?: Record<string, number>;
}

const CHANNELS: { id: string; topic: string; group: "info" | "talk" | "games" | "worlds" }[] = [
  { id: "announcements", topic: "Updates from the economy and the site", group: "info" },
  { id: "news", topic: "The Laconian, delivered", group: "info" },
  { id: "general", topic: "Anything goes", group: "talk" },
  { id: "collect", topic: "=collect here. BlitzChecks drop here.", group: "talk" },
  { id: "wire", topic: "Hacker News, live", group: "talk" },
  { id: "symposium", topic: "Knucklebones, kottabos, wine", group: "games" },
  { id: "pente", topic: "Share your grid. No spoilers.", group: "games" },
  { id: "arena", topic: "Spirits duels and trash talk", group: "games" },
  { id: "minecraft", topic: "Bridged to the server chat", group: "worlds" },
  { id: "trade", topic: "WTB / WTS, agents report here", group: "worlds" },
];

const VOICE = [
  { id: "agora", name: "The Agora", people: ["gorgo", "lysander", "kyniska"] },
  { id: "table", name: "Game night table", people: [] as string[] },
  { id: "quiet", name: "Quiet room", people: ["chilon"] },
];

const BOTS: Record<string, { color: string; tag: string }> = {
  UnbelievaBoat: { color: "#6fa9e6", tag: "BOT" },
  YAGPDB: { color: "#86c27f", tag: "BOT" },
  "Economy++": { color: "#f4a35f", tag: "BOT" },
  Wire: { color: "#ff6600", tag: "BOT" },
  Herald: { color: "#c9a4ff", tag: "BOT" },
};

const ROLES: Record<string, { role: string; color: string }> = {
  gorgo: { role: "Soul", color: "#c9a4ff" },
  lysander: { role: "Booster", color: "#ff7ab6" },
  brasidas: { role: "Netherite Overlord", color: "#8d8a99" },
  kyniska: { role: "Champion", color: "#f4a35f" },
  agis: { role: "Soul", color: "#c9a4ff" },
  chilon: { role: "OG", color: "#86c27f" },
  demaratus: { role: "Mansa Musa", color: "#e8c547" },
  archidamus: { role: "Soul", color: "#c9a4ff" },
};

const MC_PLAYERS = ["Brasidas_", "gorgoMC", "xX_helot_Xx"];

let mid = 0;
const nid = () => `m${Date.now().toString(36)}${(mid++).toString(36)}`;

function seedMessages(): Msg[] {
  const r = seeded(hashSeed("chat-seed"));
  const t = (min: number) => Date.now() - min * 60_000;
  const lines: Msg[] = [
    { id: nid(), channel: "announcements", who: "Herald", kind: "bot", at: t(60 * 26), embed: { color: "#c9a4ff", title: "The site is open", body: "Sign in with Discord, play Sunday's table, and everything you have carries over. Nothing resets." } },
    { id: nid(), channel: "announcements", who: "Herald", kind: "bot", at: t(60 * 20), embed: { color: "#f4a35f", title: "Blue or Orange has three colours now", body: "Blue puts out orange, orange burns green, green drinks blue. Smallest pool wins half; the two largest fight for the rest." } },
    { id: nid(), channel: "announcements", who: "Herald", kind: "bot", at: t(60 * 3), embed: { color: "#86c27f", title: "Speed Check update", body: "BlitzChecks drop in #collect 3–6 hours after the last one. First =claim takes 5,000." } },
    { id: nid(), channel: "general", who: "gorgo", kind: "user", at: t(48), text: "who's in for poker sunday", reactions: { "🔥": 3 } },
    { id: nid(), channel: "general", who: "lysander", kind: "user", at: t(46), text: "always" },
    { id: nid(), channel: "general", who: "kyniska", kind: "user", at: t(45), text: "if agis brings the figs" },
    { id: nid(), channel: "general", who: "agis", kind: "user", at: t(31), text: "figs are a module now. 2 DAEMON per fig", reactions: { "😂": 4 } },
    { id: nid(), channel: "general", who: "chilon", kind: "user", at: t(12), text: "pulled Poseidra from a pack. foil. I'm never selling" , reactions: { "🐉": 2, "❤️": 1 } },
    { id: nid(), channel: "collect", who: "archidamus", kind: "user", at: t(40), text: "=collect" },
    { id: nid(), channel: "collect", who: "UnbelievaBoat", kind: "bot", at: t(40), embed: { color: "#6fa9e6", title: "archidamus collected", body: <>Soul · <b>17,000</b> dragons</> } },
    { id: nid(), channel: "symposium", who: "demaratus", kind: "user", at: t(22), text: "threw the Dog three times in a row. I'm cursed" },
    { id: nid(), channel: "arena", who: "brasidas", kind: "user", at: t(18), text: "fire team only. no regrets" },
    { id: nid(), channel: "arena", who: "kyniska", kind: "user", at: t(17), text: "Nerilla says hi", reactions: { "😂": 2 } },
    { id: nid(), channel: "trade", who: "demaratus", kind: "user", at: t(25), text: "WTB 2 netherite, paying 8,600 each" },
    { id: nid(), channel: "trade", who: "Economy++", kind: "bot", at: t(9), embed: { color: "#f4a35f", title: "Agent trade", body: "gorgo's agent bought 4 × Diamond at 440" } },
    { id: nid(), channel: "minecraft", who: "Brasidas_", kind: "mc", at: t(15), text: "anyone want to help with the sea lantern farm" },
    { id: nid(), channel: "minecraft", who: "gorgoMC", kind: "mc", at: t(14), text: "omw, bring prismarine" },
    { id: nid(), channel: "minecraft", who: "Economy++", kind: "bot", at: t(6), embed: { color: "#f4a35f", title: "Bounty placed", body: "xX_helot_Xx put 2,000 dragons on Brasidas_" } },
    { id: nid(), channel: "pente", who: "lysander", kind: "user", at: t(30), text: "Pente " + (r() > 0.5 ? "14 3/6" : "14 4/6") + "\n🟨⬛⬛🟩⬛\n⬛🟩🟩🟩⬛\n🟩🟩🟩🟩🟩" },
    { id: nid(), channel: "news", who: "Herald", kind: "bot", at: t(60 * 8), embed: { color: "#c9a4ff", title: "The Laconian · today's issue", body: "Game night, markets, Minecraft and the wire. Open it in the newspaper.", } },
  ];
  return lines;
}

function Clouds() {
  return (
    <div className="clouds" aria-hidden="true">
      <div className="cloud-layer l1" />
      <div className="cloud-layer l2" />
      <div className="cloud-layer l3" />
      <div className="cloud-stars" />
    </div>
  );
}

function MessageView({ m, me, onReact, grouped }: { m: Msg; me: string; onReact: (id: string, e: string) => void; grouped: boolean }) {
  const bot = BOTS[m.who];
  const role = ROLES[m.who];
  const color = m.who === me ? "var(--accent)" : bot ? bot.color : role ? role.color : `hsl(${hueFor(m.who)} 60% 72%)`;
  return (
    <div className={`msg ${grouped ? "is-grouped" : ""} ${m.embed?.ephemeral ? "is-ephemeral" : ""}`}>
      {!grouped ? (
        m.kind === "mc" ? <McHead name={m.who} size={36} /> : bot ? <span className="bot-avatar" style={{ background: bot.color }}>{m.who === "Wire" ? "Y" : m.who[0]}</span> : <Avatar name={m.who} you={m.who === me} size="lg" />
      ) : <span className="msg-gutter" />}
      <div className="msg-body">
        {!grouped && (
          <div className="msg-head">
            <span className="msg-who" style={{ color }}>{m.who}</span>
            {bot && <span className="bot-tag">{bot.tag}</span>}
            {m.kind === "mc" && <span className="bot-tag mc-tag">MC</span>}
            <span className="msg-time">{new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}
        {m.text && <p className="msg-text">{m.text}</p>}
        {m.embed && (
          <div className="embed" style={{ borderLeftColor: m.embed.color }}>
            {m.embed.ephemeral && <span className="faint embed-eph">only you can see this</span>}
            <span className="embed-title">{m.embed.title}</span>
            <div className="embed-body">{m.embed.body}</div>
            {m.embed.action && <button className="btn btn-sm embed-act" onClick={m.embed.action.run}>{m.embed.action.label}</button>}
          </div>
        )}
        {m.reactions && Object.keys(m.reactions).length > 0 && (
          <div className="reactions">
            {Object.entries(m.reactions).map(([e, n]) => (
              <button key={e} className="reaction" onClick={() => onReact(m.id, e)}>{e} <span className="num">{n}</span></button>
            ))}
          </div>
        )}
      </div>
      <div className="msg-tools">
        {["🔥", "😂", "🐉", "👍"].map((e) => <button key={e} onClick={() => onReact(m.id, e)} aria-label={`React ${e}`}>{e}</button>)}
      </div>
    </div>
  );
}

export function ChatPage() {
  const me = useStore((s) => s.name);
  const signedIn = useStore((s) => s.signedIn);
  const posts = useStore((s) => s.posts);
  const [channel, setChannel] = useState("general");
  const [msgs, setMsgs] = useState<Msg[]>(seedMessages);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [voiceSince, setVoiceSince] = useState(0);
  const [unread, setUnread] = useState<Record<string, number>>({ announcements: 1, collect: 1, wire: 6, trade: 1 });
  const [showChannels, setShowChannels] = useState(false);
  const blitz = useRef<{ id: string; claimed: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const now = useNow(1000);
  const wire = useWire();

  const add = (m: Omit<Msg, "id" | "at"> & { at?: number }) => {
    const msg = { ...m, id: nid(), at: m.at ?? Date.now() } as Msg;
    setMsgs((list) => [...list, msg].slice(-400));
    if (m.channel !== channel) setUnread((u) => ({ ...u, [m.channel]: (u[m.channel] ?? 0) + 1 }));
    return msg;
  };

  // Shares from elsewhere on the site (Pente grids, Minecraft chat) appear as your messages.
  const seenPosts = useRef(new Set<string>());
  useEffect(() => {
    for (const p of posts) {
      if (seenPosts.current.has(p.id)) continue;
      seenPosts.current.add(p.id);
      setMsgs((list) => [...list, { id: p.id, channel: p.channel, who: me, at: p.at, text: p.text, kind: "user" }]);
    }
  }, [posts, me]);

  // The wire posts stories.
  useEffect(() => {
    if (wire.loading) return;
    setMsgs((list) => {
      if (list.some((m) => m.channel === "wire")) return list;
      return [
        ...list,
        ...wire.stories.slice(0, 8).reverse().map((s, i) => ({
          id: `w${s.id}`, channel: "wire", who: "Wire", kind: "bot" as Kind, at: Date.now() - (8 - i) * 900_000,
          embed: { color: "#ff6600", title: s.title, body: <><a href={hnLink(s)} target="_blank" rel="noreferrer">{s.score} points · {s.comments} comments · by {s.by}</a>{!wire.live && <span className="faint"> · sample, live on the real site</span>}</> },
        })),
      ];
    });
  }, [wire]);

  // Life: people talk, drops happen.
  useEffect(() => {
    const LINES: Record<string, string[]> = {
      general: ["lol", "who took my seat", "brb collecting", "anyone else's agent buy 40 redstone by accident", "the sky on the lobby is so nice at night", "Monopoly on the new board is cursed", "gg"],
      symposium: ["more wine", "Venus!!", "the Dog again", "kottabos is rigged (it's not)"],
      arena: ["water team is broken", "aether is overrated", "1200 rating let's go"],
      trade: ["WTS 3 obsidian 55 each", "anyone selling Okeanyx", "my agent is smarter than me"],
      minecraft: ["need iron", "who reset the nether portal", "sea lantern farm done!", "creeper took my house"],
    };
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const ch = Object.keys(LINES)[Math.floor(Math.random() * 5)];
      const isMc = ch === "minecraft";
      const who = isMc ? MC_PLAYERS[Math.floor(Math.random() * MC_PLAYERS.length)] : MEMBERS[Math.floor(Math.random() * MEMBERS.length)].name;
      if (ch === channel) {
        setTyping(who);
        setTimeout(() => {
          setTyping(null);
          add({ channel: ch, who, kind: isMc ? "mc" : "user", text: LINES[ch][Math.floor(Math.random() * LINES[ch].length)] });
        }, 1600);
      } else add({ channel: ch, who, kind: isMc ? "mc" : "user", text: LINES[ch][Math.floor(Math.random() * LINES[ch].length)] });
      t = setTimeout(tick, 6000 + Math.random() * 9000);
    };
    t = setTimeout(tick, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  // A BlitzCheck drops in #collect shortly after you arrive.
  useEffect(() => {
    const t = setTimeout(() => {
      const m = add({
        channel: "collect", who: "YAGPDB", kind: "bot",
        embed: { color: "#86c27f", title: "⚡ BlitzCheck", body: <>The first to type <b>=claim</b> gets <b>5,000</b> dragons.</>, action: { label: "=claim", run: () => claimBlitz() } },
      });
      blitz.current = { id: m.id, claimed: false };
      setTimeout(() => {
        if (blitz.current && !blitz.current.claimed) {
          blitz.current.claimed = true;
          add({ channel: "collect", who: "kyniska", kind: "user", text: "=claim" });
          add({ channel: "collect", who: "YAGPDB", kind: "bot", embed: { color: "#86c27f", title: "Claimed", body: "kyniska was faster. Next BlitzCheck in 3–6 hours." } });
        }
      }, 25000);
    }, 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs, channel]);

  function claimBlitz() {
    if (!requireAccount()) return;
    const b = blitz.current;
    if (!b || b.claimed) {
      add({ channel: "collect", who: "YAGPDB", kind: "bot", embed: { color: "#86c27f", title: "Too late", body: "This BlitzCheck was already claimed.", ephemeral: true } });
      return;
    }
    b.claimed = true;
    earn(5000, "BlitzCheck", "collect");
    add({ channel: "collect", who: "YAGPDB", kind: "bot", embed: { color: "#86c27f", title: `${getState().name} claimed the BlitzCheck`, body: <><DragonSign /> <b>5,000</b> dragons</> } });
  }

  const command = (raw: string): boolean => {
    const c = raw.trim().toLowerCase();
    const s = getState();
    if (c === "=collect" || c === "/collect") {
      const ok = collect();
      add({ channel, who: "UnbelievaBoat", kind: "bot", embed: ok
        ? { color: "#6fa9e6", title: `${s.name} collected`, body: <>Soul · <b>{fmt(COLLECT_AMOUNT)}</b> dragons</> }
        : { color: "#6fa9e6", title: "Not yet", body: `Your next collect is in ${Math.ceil((s.collectAt - Date.now()) / 60000)} minutes.`, ephemeral: true } });
      return true;
    }
    if (c === "=bal" || c === "=money" || c === "/bal") {
      add({ channel, who: "UnbelievaBoat", kind: "bot", embed: { color: "#6fa9e6", title: `${s.name}'s balance`, body: <><DragonSign /> <b>{fmt(s.dragons)}</b> dragons · {s.cards.length} spirits</> } });
      return true;
    }
    if (c === "=claim") { claimBlitz(); return true; }
    if (c === "/daemon balance" || c === "/daemon") {
      add({ channel, who: "Economy++", kind: "bot", embed: { color: "#000", title: "DAEMON", body: <span className="mono"><DaemonSign /> {fmtD(s.daemon)} · only you can see this</span>, ephemeral: true } });
      return true;
    }
    if (c === "/bones") {
      const t = throwBones(defaultRand);
      add({ channel, who: "Economy++", kind: "bot", embed: { color: "#e8935a", title: `${s.name} throws the knucklebones`, body: <span className="mono">{t.join(" · ")} → {nameOf(t)}</span> } });
      return true;
    }
    if (c.startsWith("/roll")) {
      add({ channel, who: "Economy++", kind: "bot", embed: { color: "#f4a35f", title: `${s.name} rolls`, body: <b className="num">{1 + Math.floor(Math.random() * 100)}</b> } });
      return true;
    }
    if (c === "/help") {
      add({ channel, who: "Herald", kind: "bot", embed: { color: "#c9a4ff", title: "Commands", body: <span className="mono">=collect · =bal · =claim · /daemon balance · /bones · /roll</span>, ephemeral: true } });
      return true;
    }
    return false;
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    requireAccount(() => {
      add({ channel, who: me, kind: "user", text: t });
      setText("");
      track("chat_message");
      if (channel === "minecraft") track("mc_chat");
      if (/^[=/]/.test(t)) setTimeout(() => command(t), 300);
    });
  };

  const react = (id: string, e: string) =>
    setMsgs((list) => list.map((m) => (m.id === id ? { ...m, reactions: { ...m.reactions, [e]: (m.reactions?.[e] ?? 0) + 1 } } : m)));

  const shown = msgs.filter((m) => m.channel === channel).sort((a, b) => a.at - b.at);
  const ch = CHANNELS.find((c) => c.id === channel)!;
  const voiceMin = voice ? Math.floor((now - voiceSince) / 60000) : 0;
  const groups = useMemo(() => {
    const online = MEMBERS.filter((m) => m.online);
    const by: Record<string, string[]> = {};
    for (const m of online) (by[ROLES[m.name]?.role ?? "Member"] ??= []).push(m.name);
    return by;
  }, []);

  return (
    <div className="chat">
      <Clouds />
      <div className="chat-shell">
        <aside className={`chat-channels ${showChannels ? "is-open" : ""}`}>
          <div className="server-head">
            <Mark size={22} />
            <span className="display">Lacedaemon</span>
          </div>
          {(["info", "talk", "games", "worlds"] as const).map((g) => (
            <div key={g} className="ch-group">
              <span className="ch-label">{g === "info" ? "Information" : g === "talk" ? "Talk" : g === "games" ? "Games" : "Worlds"}</span>
              {CHANNELS.filter((c) => c.group === g).map((c) => (
                <button key={c.id} className={`ch ${channel === c.id ? "is-on" : ""} ${unread[c.id] ? "is-unread" : ""}`} onClick={() => { setChannel(c.id); setUnread((u) => ({ ...u, [c.id]: 0 })); setShowChannels(false); }}>
                  <Icon name="hash" size={15} /> {c.id}
                  {unread[c.id] ? <span className="ch-count">{unread[c.id]}</span> : null}
                </button>
              ))}
            </div>
          ))}
          <div className="ch-group">
            <span className="ch-label">Voice</span>
            {VOICE.map((v) => (
              <div key={v.id} className="vc">
                <button className={`ch ${voice === v.id ? "is-on" : ""}`} onClick={() => requireAccount(() => { setVoice(voice === v.id ? null : v.id); setVoiceSince(Date.now()); })}>
                  <Icon name="voice" size={15} /> {v.name}
                </button>
                {[...v.people, ...(voice === v.id ? [me] : [])].map((p) => (
                  <span key={p} className={`vc-person ${p === me ? "is-you" : ""}`}><Avatar name={p} you={p === me} /> {p}</span>
                ))}
              </div>
            ))}
          </div>
          <div className="me-bar">
            <Avatar name={me} you />
            <div>
              <span className="me-name">{signedIn ? me : "not signed in"}</span>
              <span className="faint mono me-status">{voice ? `in voice · ${voiceMin} / 30 min to the hero role` : "online"}</span>
            </div>
          </div>
        </aside>

        <section className="chat-main">
          <header className="chat-head">
            <button className="icon-btn ch-toggle" onClick={() => setShowChannels((x) => !x)} aria-label="Channels"><Icon name="menu" /></button>
            <Icon name="hash" />
            <b>{ch.id}</b>
            <span className="faint chat-topic">{ch.topic}</span>
            {channel === "news" && <button className="btn btn-sm" onClick={() => go("news")}>Open the paper</button>}
            {channel === "minecraft" && <span className="chip chip-live">bridged · 3 in game</span>}
          </header>
          <div className="msgs" ref={box}>
            <div className="ch-intro">
              <span className="ch-intro-icon"><Icon name="hash" size={28} /></span>
              <h2 className="display">Welcome to #{ch.id}</h2>
              <p className="faint">{ch.topic}.</p>
            </div>
            {shown.map((m, i) => {
              const prev = shown[i - 1];
              const grouped = !!prev && prev.who === m.who && m.at - prev.at < 5 * 60_000 && !m.embed && !prev.embed;
              return <MessageView key={m.id} m={m} me={me} onReact={react} grouped={grouped} />;
            })}
          </div>
          <div className="typing faint">{typing ? <><span className="dots"><i /><i /><i /></span> {typing} is typing…</> : ""}</div>
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input
              id="chat-input"
              className="composer-input"
              placeholder={channel === "minecraft" ? "Message the Minecraft server" : `Message #${ch.id} · try =collect or /bones`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={channel === "announcements"}
              maxLength={400}
              autoComplete="off"
            />
            <button className="btn btn-primary" type="submit" disabled={channel === "announcements"}>Send</button>
          </form>
          {text.startsWith("/") || text.startsWith("=") ? (
            <div className="cmd-hints mono">
              {["=collect", "=bal", "=claim", "/daemon balance", "/bones", "/roll", "/help"].filter((c) => c.startsWith(text.toLowerCase())).map((c) => (
                <button key={c} onClick={() => setText(c)}>{c}</button>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="chat-members">
          {Object.entries(groups).map(([role, names]) => (
            <div key={role} className="mem-group">
              <span className="ch-label">{role} — {names.length}</span>
              {names.map((n) => (
                <div key={n} className="mem">
                  <span className="mem-av"><Avatar name={n} /><i className="presence" /></span>
                  <span style={{ color: ROLES[n]?.color }}>{n}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="mem-group">
            <span className="ch-label">Bots — {Object.keys(BOTS).length}</span>
            {Object.entries(BOTS).map(([n, b]) => (
              <div key={n} className="mem"><span className="bot-avatar sm" style={{ background: b.color }}>{n === "Wire" ? "Y" : n[0]}</span><span>{n}</span><span className="bot-tag">BOT</span></div>
            ))}
          </div>
          <div className="mem-group">
            <span className="ch-label">Offline — {MEMBERS.filter((m) => !m.online).length}</span>
            {MEMBERS.filter((m) => !m.online).map((m) => (
              <div key={m.id} className="mem is-off"><Avatar name={m.name} /><span>{m.name}</span></div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
