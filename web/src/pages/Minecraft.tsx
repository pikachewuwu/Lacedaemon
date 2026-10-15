import { useEffect, useMemo, useRef, useState } from "react";
import { notify, post, setState, spend, track, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { go } from "../app/router";
import { dateKey } from "../app/time";
import { fmt } from "../app/format";
import { bookOf, history } from "../economy/trade";
import { ITEMS, itemById } from "../games/minecraft/items";
import { hashSeed } from "../games/rng";
import { Dragons, toast } from "../ui/kit";
import { ItemSprite, McHead } from "../ui/Pixel";
import { Spark } from "./Trade";

/**
 * Minecraft: the server, from the website. Daylight sky, the chat bridged
 * both ways, your vault, item prices, bounties, the days-alive board.
 */

interface McLine {
  id: number;
  who: string;
  text: string;
  from: "game" | "web" | "server";
}

const PLAYERS = [
  { mc: "Brasidas_", discord: "brasidas", alive: 412, x: -812, z: 1490 },
  { mc: "gorgoMC", discord: "gorgo", alive: 388, x: 120, z: -64 },
  { mc: "xX_helot_Xx", discord: "agis", alive: 97, x: 2201, z: 340 },
];
const OFFLINE = [
  { mc: "Kyniska", alive: 301 },
  { mc: "chilon_the_wise", alive: 244 },
  { mc: "Demaratus", alive: 60 },
];

const GAME_LINES = [
  "anyone have spare iron?", "sea lantern farm is running", "who reset the nether portal", "creeper took my roof",
  "trading 16 obsidian for 2 diamonds", "found a stronghold at 2200 / 340", "brb, dinner", "bounty on me? who did this",
];

let lid = 0;

function Clouds() {
  return (
    <div className="day" aria-hidden="true">
      <div className="day-sun" />
      <div className="day-cloud c1" /><div className="day-cloud c2" /><div className="day-cloud c3" /><div className="day-cloud c4" />
    </div>
  );
}

export function MinecraftPage() {
  const s = useStore((x) => x);
  const [lines, setLines] = useState<McLine[]>(() => [
    { id: lid++, who: "Server", text: "Brasidas_ joined the game", from: "server" },
    { id: lid++, who: "Brasidas_", text: "anyone want to help with the sea lantern farm", from: "game" },
    { id: lid++, who: "gorgo", text: "omw, bring prismarine", from: "web" },
    { id: lid++, who: "xX_helot_Xx", text: "placed a 2,000 dragon bounty on Brasidas_ lol", from: "game" },
  ]);
  const [say, setSay] = useState("");
  const [code, setCode] = useState("");
  const [bountyOn, setBountyOn] = useState("Brasidas_");
  const [bountyAmt, setBountyAmt] = useState(2000);
  const [bounties, setBounties] = useState([
    { target: "Brasidas_", amount: 2000, by: "xX_helot_Xx" },
    { target: "gorgoMC", amount: 7500, by: "Kyniska" },
  ]);
  const box = useRef<HTMLOListElement>(null);
  const day = dateKey();
  const books = useMemo(() => Object.fromEntries(ITEMS.map((i) => [i.id, bookOf(`item:${i.id}`, day)])), [day]);
  const overlord = "Brasidas_";

  useEffect(() => {
    const t = setInterval(() => {
      const p = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
      setLines((l) => [...l.slice(-60), { id: lid++, who: p.mc, text: GAME_LINES[Math.floor(Math.random() * GAME_LINES.length)], from: "game" }]);
    }, 9000 + Math.random() * 6000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [lines]);

  const send = () =>
    requireAccount(() => {
      const t = say.trim();
      if (!t) return;
      setLines((l) => [...l, { id: lid++, who: s.mc.linked ?? s.name, text: t, from: "web" }]);
      post("minecraft", t);
      track("mc_chat");
      setSay("");
    });

  const link = () =>
    requireAccount(() => {
      if (!/^\d{6}$/.test(code)) return toast("Codes are six digits. Type /discord in game to get one.", "bad");
      const name = s.name === "you" ? "you_on_mc" : s.name;
      setState((st) => ({ mc: { ...st.mc, linked: name } }));
      notify("Minecraft account linked. Your vault is now on the website.", "minecraft");
      toast("Linked", "good");
    });

  const placeBounty = () =>
    requireAccount(() => {
      if (!spend(bountyAmt, `Bounty on ${bountyOn}`, "minecraft")) return toast("Not enough dragons", "bad");
      setBounties((b) => [{ target: bountyOn, amount: bountyAmt, by: s.mc.linked ?? s.name }, ...b]);
      setLines((l) => [...l, { id: lid++, who: "Server", text: `${s.mc.linked ?? s.name} placed a ${fmt(bountyAmt)} dragon bounty on ${bountyOn}`, from: "server" }]);
    });

  const vault = Object.entries(s.mc.vault).filter(([, q]) => q > 0);
  const vaultValue = vault.reduce((sum, [id, q]) => sum + (books[id]?.last ?? itemById(id).ref) * q, 0);

  return (
    <div className="mc">
      <Clouds />
      <div className="mc-inner">
        <header className="mc-head">
          <div className="mc-title">
            <span className="mc-kicker">Lacedaemon SMP · Java 1.21</span>
            <h1 className="mc-name">The server</h1>
          </div>
          <div className="mc-status">
            <span className="mc-pill"><i className="on" /> online · {PLAYERS.length}/20</span>
            <span className="mc-pill">day 1,844</span>
            <span className="mc-pill">20.0 tps</span>
            <button className="mc-pill mc-copy" onClick={() => { navigator.clipboard?.writeText("mc.lacedaemon.gg").then(() => toast("Address copied"), () => toast("mc.lacedaemon.gg")); }}>mc.lacedaemon.gg</button>
          </div>
        </header>

        <div className="mc-grid">
          <section className="glass mc-chat">
            <div className="glass-head"><h2>Server chat</h2><span className="mc-sub">bridged with #minecraft</span></div>
            <ol ref={box} className="mc-lines">
              {lines.map((l) => (
                <li key={l.id} className={`mcl mcl-${l.from}`}>
                  {l.from === "server" ? <span className="mcl-server">{l.text}</span> : (
                    <>
                      <McHead name={l.who} size={20} />
                      <span className="mcl-who">{l.who}</span>
                      {l.from === "web" && <span className="mcl-tag">web</span>}
                      <span className="mcl-text">{l.text}</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
            <form className="mc-say" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input id="mc-say" placeholder="Say something in game" value={say} onChange={(e) => setSay(e.target.value)} maxLength={200} />
              <button type="submit">Send</button>
            </form>
          </section>

          <section className="glass mc-online">
            <div className="glass-head"><h2>Online now</h2></div>
            <ul>
              {PLAYERS.map((p) => (
                <li key={p.mc}>
                  <McHead name={p.mc} size={32} />
                  <div><b>{p.mc}{p.mc === overlord && <span className="overlord" title="Top netherite holder">Netherite Overlord</span>}</b><span className="mc-sub">{p.discord} · {p.x}, {p.z}</span></div>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass mc-vault">
            <div className="glass-head">
              <h2>Your vault</h2>
              {s.mc.linked ? <span className="mc-sub">linked as {s.mc.linked} · worth <Dragons value={vaultValue} /></span> : <span className="mc-sub">example vault · link to see yours</span>}
            </div>
            <div className="slots">
              {vault.map(([id, q]) => (
                <button key={id} className="slot" title={itemById(id).name} onClick={() => go("trade")}>
                  <ItemSprite id={id} size={34} />
                  <span className="slot-q">{q}</span>
                </button>
              ))}
              {Array.from({ length: Math.max(0, 9 - vault.length) }, (_, i) => <span key={i} className="slot is-empty" />)}
            </div>
            <p className="mc-sub">In game: <code>/deposit diamond 10</code>, <code>/withdraw diamond 5</code>. Everything in the vault can be traded on the site, staked at a private poker table, or sent to a friend.</p>
            <div className="mc-actions">
              <button onClick={() => go("trade")}>Trade items</button>
              <button onClick={() => go("poker")}>Stake at poker</button>
            </div>
          </section>

          {!s.mc.linked && (
            <section className="glass mc-link">
              <div className="glass-head"><h2>Link your account</h2></div>
              <ol className="steps">
                <li>Join <b>mc.lacedaemon.gg</b></li>
                <li>Type <code>/discord</code> in chat. You get a six-digit code.</li>
                <li>Enter it here.</li>
              </ol>
              <form className="mc-say" onSubmit={(e) => { e.preventDefault(); link(); }}>
                <input id="mc-code" inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <button type="submit">Link</button>
              </form>
            </section>
          )}

          <section className="glass mc-prices">
            <div className="glass-head"><h2>Item prices</h2><button className="mc-linkbtn" onClick={() => go("trade")}>Open the market →</button></div>
            <table>
              <tbody>
                {ITEMS.map((i) => {
                  const b = books[i.id];
                  return (
                    <tr key={i.id} onClick={() => go("trade")}>
                      <td><ItemSprite id={i.id} size={22} /></td>
                      <td>{i.name}</td>
                      <td className="r">{fmt(b.last)}</td>
                      <td className={`r ${b.change >= 0 ? "up" : "down"}`}>{b.change >= 0 ? "+" : ""}{b.change.toFixed(1)}%</td>
                      <td className="r"><Spark data={history(`item:${i.id}`, 20)} w={64} h={18} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="glass mc-bounties">
            <div className="glass-head"><h2>Bounties</h2><span className="mc-sub">paid when the target dies to a player</span></div>
            <ul>
              {bounties.map((b, i) => (
                <li key={i}><McHead name={b.target} size={24} /><b>{b.target}</b><span className="mc-sub">by {b.by}</span><span className="bounty">{fmt(b.amount)}</span></li>
              ))}
            </ul>
            <form className="mc-say" onSubmit={(e) => { e.preventDefault(); placeBounty(); }}>
              <select id="bounty-on" value={bountyOn} onChange={(e) => setBountyOn(e.target.value)}>
                {[...PLAYERS.map((p) => p.mc), ...OFFLINE.map((p) => p.mc)].map((n) => <option key={n}>{n}</option>)}
              </select>
              <input id="bounty-amt" type="number" min={500} step={500} value={bountyAmt} onChange={(e) => setBountyAmt(Math.max(500, +e.target.value || 500))} />
              <button type="submit">Place</button>
            </form>
          </section>

          <section className="glass mc-alive">
            <div className="glass-head"><h2>Days alive</h2><span className="mc-sub">/alive in game</span></div>
            <ol>
              {[...PLAYERS, ...OFFLINE].sort((a, b) => b.alive - a.alive).map((p, i) => (
                <li key={p.mc}><span className="num">{i + 1}</span><McHead name={p.mc} size={20} />{p.mc}<b>{p.alive}</b></li>
              ))}
            </ol>
          </section>

          <section className="glass mc-events">
            <div className="glass-head"><h2>On the server</h2></div>
            <ul>
              <li><b>Saturday speedrun</b><span className="mc-sub">20:00 · last record 2:29:35</span></li>
              <li><b>Sea lantern farm bounty</b><span className="mc-sub">70,000 dragons · passed 2–0</span></li>
              <li><b>Redstone farm bounty</b><span className="mc-sub">70,000 dragons · passed 3–1</span></li>
              <li><b>Server seed</b><span className="mc-sub">{hashSeed("lacedaemon smp")}</span></li>
            </ul>
            <button className="mc-linkbtn" onClick={() => requireAccount(() => { notify("You're signed up for Saturday's speedrun.", "minecraft"); toast("Signed up for Saturday"); })}>Sign up for Saturday →</button>
          </section>
        </div>
      </div>
    </div>
  );
}
