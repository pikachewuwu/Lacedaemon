import { useMemo, useState } from "react";
import { setState, track, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { hashSeed } from "../games/rng";
import { Avatar, toast } from "../ui/kit";

/**
 * Ideas: the server's backlog, in public. Anyone can add one, anyone can
 * vote. Status shows what's live, what's being built and what's waiting.
 */

type Status = "live" | "building" | "voting" | "idea";
interface Idea {
  id: string;
  title: string;
  body: string;
  status: Status;
  cat: "games" | "economy" | "minecraft" | "social" | "daemon" | "site";
  by: string;
}

const I = (title: string, body: string, status: Status, cat: Idea["cat"], by: string): Idea => ({ id: title.toLowerCase().replace(/\W+/g, "-"), title, body, status, cat, by });

const IDEAS: Idea[] = [
  I("Sunday game night", "One table for the whole server every Sunday at 16:00. Winner takes the pot and a laurel card.", "live", "games", "chilon"),
  I("Blue or Orange with three colours", "Rock-paper-scissors dynamics: the smallest pool wins half, the two biggest fight. Alts become pointless.", "live", "games", "chilon"),
  I("Spirits arena", "Three-spirit duels where both players secretly choose who steps forward.", "live", "games", "kyniska"),
  I("Trading agents", "Bots that buy and sell for you by rules or plain words. Bring your own with a capped API key.", "live", "economy", "lysander"),
  I("Pente, the daily word", "Wordle-style, same word for the whole server, results in #pente.", "live", "games", "gorgo"),
  I("Chat on the site", "Channels, voice, roles and bots without leaving the website.", "live", "social", "chilon"),
  I("Real Discord sign-in", "OAuth with Discord, roles read live from the server.", "building", "site", "brasidas"),
  I("UnbelievaBoat balance sync", "Dragons on the site and in Discord are the same balance.", "building", "economy", "brasidas"),
  I("Live rooms", "WebSocket rooms for poker, the Symposium and Sunday so everyone really is in the same room.", "building", "site", "agis"),
  I("Nuclear Nations, revived", "Buy shares in nations, the biggest shareholder becomes president and picks a target. Rebuilt as a Daemon module with the old 19% interception and 1% backfire.", "voting", "games", "chilon"),
  I("Collect Guess, as a daily module", "Guess how many =collect commands tomorrow brings. Within 10% pays.", "voting", "games", "chilon"),
  I("Blue or Orange index options", "Weekly options on the Blue or Orange outcome, one product per possible result.", "voting", "economy", "demaratus"),
  I("Syssitia (mess halls)", "Small teams of four with a shared treasury, team quests and a weekly feast payout.", "voting", "social", "archidamus"),
  I("Prediction market on Sunday", "Bet on who wins game night before it starts. Settled automatically.", "voting", "economy", "demaratus"),
  I("Ostracism", "Once a season, everyone writes one name on a shard. The most-named player sits out a week of Sunday nights.", "voting", "social", "chilon"),
  I("Minecraft speedrun season", "Monthly speedruns with a laurel for the record holder and a leaderboard on the site.", "voting", "minecraft", "brasidas"),
  I("Bounty board for builds", "Post a build (a sea lantern farm, a redstone farm), put dragons behind it, the community votes when it's done.", "voting", "minecraft", "chilon"),
  I("Card crafting", "Burn three commons of an element into one uncommon of the same element.", "idea", "economy", "kyniska"),
  I("Spirits cosmetics in Minecraft", "Show your rarest spirit as a banner or pet in game.", "idea", "minecraft", "gorgo"),
  I("Agent tournament", "A week where everyone's trading agent starts with the same budget. Best return wins.", "idea", "economy", "lysander"),
  I("Liar's Dice at the Symposium", "Five dice under a cup each. Bid or call the bluff.", "idea", "games", "agis"),
  I("Werewolf in voice", "Hidden roles, a vote every night, the site deals the roles and runs the clock.", "idea", "games", "chilon"),
  I("Weekly crossword in the Laconian", "Clues about the server's own history.", "idea", "social", "demaratus"),
  I("Ephor elections", "Five rotating moderators elected each season by the members.", "idea", "social", "archidamus"),
  I("Map of the Minecraft world", "A live map on the site with claims, farms and bounties marked.", "idea", "minecraft", "brasidas"),
  I("Daemon module hackathon", "A weekend to build modules, with locked DAEMON prizes for the best ones.", "idea", "daemon", "agis"),
  I("Achievements", "Badges for things like a Venus throw, a royal flush, or 100 days alive.", "idea", "site", "kyniska"),
  I("Birthday drops", "A Spirits pack on your Discord birthday.", "idea", "social", "gorgo"),
  I("Helot protection", "New members can't lose more than 10,000 dragons a day for their first week.", "idea", "economy", "chilon"),
  I("Radio in the Agora", "A shared music queue in the voice room, votes skip a song.", "idea", "social", "lysander"),
];

const STATUS_LABEL: Record<Status, string> = { live: "Live", building: "Building", voting: "Voting", idea: "Idea" };

export function IdeasPage() {
  const s = useStore((x) => x);
  const [status, setStatus] = useState<Status | "all">("all");
  const [sort, setSort] = useState<"top" | "new">("top");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const all: Idea[] = useMemo(() => [...s.ideas.mine.map((m) => ({ id: m.id, title: m.title, body: m.body, status: "idea" as Status, cat: "site" as Idea["cat"], by: s.name })), ...IDEAS], [s.ideas.mine, s.name]);
  const base = (i: Idea) => (hashSeed(i.id) % 40) + (i.status === "live" ? 30 : i.status === "building" ? 20 : i.status === "voting" ? 12 : 0);
  const score = (i: Idea) => base(i) + (s.ideas.votes[i.id] ?? 0);
  const list = all.filter((i) => status === "all" || i.status === status).sort((a, b) => (sort === "top" ? score(b) - score(a) : 0));

  const vote = (id: string, v: 1 | -1) =>
    requireAccount(() => {
      setState((st) => {
        const cur = st.ideas.votes[id];
        const votes = { ...st.ideas.votes };
        if (cur === v) delete votes[id];
        else votes[id] = v;
        return { ideas: { ...st.ideas, votes } };
      });
      track("idea_vote");
    });

  const submit = () =>
    requireAccount(() => {
      if (title.trim().length < 4) return toast("Give it a title", "bad");
      setState((st) => ({ ideas: { ...st.ideas, mine: [{ id: `mine-${Date.now()}`, title: title.trim(), body: body.trim(), at: Date.now() }, ...st.ideas.mine] } }));
      setTitle("");
      setBody("");
      toast("Posted. Others can vote on it now.", "good");
    });

  return (
    <div className="ideas-page">
      <header className="page-head">
        <div>
          <p className="label">{all.length} ideas · the backlog, in public</p>
          <h1 className="display page-title">Ideas</h1>
          <p className="muted">Everything the server might become. Vote for what you want next; the top of the list gets built first.</p>
        </div>
      </header>
      <div className="ideas-grid">
        <section className="ideas-main">
          <div className="ideas-bar">
            <div className="seg">
              {(["all", "live", "building", "voting", "idea"] as const).map((x) => (
                <button key={x} className={`seg-item ${status === x ? "is-on" : ""}`} onClick={() => setStatus(x)}>{x === "all" ? "All" : STATUS_LABEL[x]}</button>
              ))}
            </div>
            <div className="seg">
              {(["top", "new"] as const).map((x) => <button key={x} className={`seg-item ${sort === x ? "is-on" : ""}`} onClick={() => setSort(x)}>{x === "top" ? "Top" : "New"}</button>)}
            </div>
          </div>
          <ol className="idea-list">
            {list.map((i) => {
              const v = s.ideas.votes[i.id];
              return (
                <li key={i.id} className={`idea st-${i.status}`}>
                  <div className="votes">
                    <button className={v === 1 ? "is-on" : ""} onClick={() => vote(i.id, 1)} aria-label="Vote up">▲</button>
                    <span className="num">{score(i)}</span>
                    <button className={v === -1 ? "is-on" : ""} onClick={() => vote(i.id, -1)} aria-label="Vote down">▼</button>
                  </div>
                  <div className="idea-body">
                    <div className="idea-top">
                      <h3>{i.title}</h3>
                      <span className={`status st-${i.status}`}>{STATUS_LABEL[i.status]}</span>
                    </div>
                    {i.body && <p className="muted">{i.body}</p>}
                    <span className="faint idea-meta"><Avatar name={i.by} you={i.by === s.name} /> {i.by} · {i.cat}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <aside className="panel idea-new">
          <div className="panel-head"><h3>Add an idea</h3></div>
          <form className="panel-body" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label className="field" htmlFor="idea-title"><span className="faint">Title</span>
              <input id="idea-title" className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Chariot races on Fridays" />
            </label>
            <label className="field" htmlFor="idea-body"><span className="faint">What it is, in a sentence or two</span>
              <textarea id="idea-body" className="input textarea" rows={4} value={body} maxLength={400} onChange={(e) => setBody(e.target.value)} />
            </label>
            <button className="btn btn-primary" type="submit">Post idea</button>
            <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Good suggestions have always been rewarded. Ideas that ship pay their author.</p>
          </form>
        </aside>
      </div>
    </div>
  );
}
