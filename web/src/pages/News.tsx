import { useEffect, useMemo } from "react";
import { setState, track, useStore } from "../app/store";
import { go } from "../app/router";
import { dateKey, fmtDate, nextSunday } from "../app/time";
import { sundayInfo } from "../app/sunday";
import { MEMBERS } from "../app/members";
import { fmt } from "../app/format";
import { useWire, hnLink } from "../app/wire";
import { bookOf, INSTRUMENTS } from "../economy/trade";
import { epochNumber, mintedBy } from "../economy/emission";
import { COLOURS, resolve, simulateField } from "../games/boo/round";
import { hashSeed, seeded } from "../games/rng";

/**
 * The Laconian: the server's paper. Every section is written from what
 * actually happened on the site (example data in the mockup). Subscribe to
 * the sections you want; get it on the site, in a DM, or in #news.
 */

const SECTIONS = [
  { id: "front", name: "Front page" },
  { id: "sunday", name: "Game night" },
  { id: "markets", name: "Markets" },
  { id: "minecraft", name: "Minecraft" },
  { id: "wire", name: "The Wire" },
  { id: "daemon", name: "Daemon dispatch" },
  { id: "archive", name: "From the archive" },
  { id: "oracle", name: "The Oracle" },
];

const ARCHIVE = [
  { when: "June 2022", text: "Dragons launch. “We intend to never reset the economy. Those who stick around will be rewarded most.”" },
  { when: "June 2022", text: "The casino moves behind a role after members blow up their balances within minutes." },
  { when: "May 2025", text: "Soul pays 17,000 every 777 minutes. Chat money: 100 to 300 every five seconds." },
  { when: "June 2025", text: "Nuclear Nations playtest concludes. 50,000 dragons go to the final shareholders." },
  { when: "June 2025", text: "A new currency is announced: tied to Blue or Orange, limited supply, code never edited except to fix bugs." },
  { when: "September 2025", text: "70,000 dragons for an efficient sea lantern farm. The vote passes 2–0." },
  { when: "January 2026", text: "Community Bonus vote ties 4–4 and fails. Every voter still gets 10,000." },
  { when: "February 2026", text: "Minecraft speedrun: the winner finishes in 2:29:35." },
  { when: "April 2026", text: "Diamonds and netherite get order books. The first ask: 400 dragons a diamond." },
];

const ORACLE: Record<string, string[]> = {
  Water: ["Patience. The tide brings your price to you.", "Do not lend Okeanyx to a friend this week.", "A green pool is larger than it looks."],
  Fire: ["Burn bright, let go early.", "Your next pack hides something warm.", "Avoid the river. Trust the forge."],
  Grass: ["Grow slowly, win on Sunday.", "Someone drinks from your well. Let them.", "The olive outlasts the flame."],
  Aether: ["You stand outside the cycle. Enjoy it while it lasts.", "A Venus throw is closer than you think.", "Read the ledger. Then read it again."],
};

export function NewsPage() {
  const s = useStore((x) => x);
  const subs = s.news.subs;
  const day = dateKey();
  const wire = useWire();
  const r = useMemo(() => seeded(hashSeed("paper:" + day)), [day]);
  const issue = epochNumber(Date.now());
  const sunday = sundayInfo(s);

  useEffect(() => {
    if (!s.signedIn || s.news.read.includes(day)) return;
    setState((st) => ({ news: { ...st.news, read: [...st.news.read, day].slice(-30) } }));
    track("news_read");
  }, [day, s.signedIn, s.news.read]);

  const movers = useMemo(() => INSTRUMENTS.map((i) => ({ i, b: bookOf(i.id, day) })).sort((a, b) => Math.abs(b.b.change) - Math.abs(a.b.change)).slice(0, 6), [day]);
  const boo = useMemo(() => {
    const res = resolve(simulateField(seeded(hashSeed("field:" + day)), 9, Date.now()), 0.95);
    return res;
  }, [day]);
  const yesterdayWinner = boo.void ? null : boo.underdog ?? boo.fight?.winner;
  const toggle = (id: string) => setState((st) => ({ news: { ...st.news, subs: st.news.subs.includes(id) ? st.news.subs.filter((x) => x !== id) : [...st.news.subs, id] } }));
  const on = (id: string) => subs.includes(id);
  const lead = movers[0];

  return (
    <div className="paper">
      <header className="masthead">
        <div className="mast-top mono">
          <span>No. {issue}</span>
          <span>{fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <span>Free to members</span>
        </div>
        <h1 className="mast-name">The Laconian</h1>
        <p className="mast-motto">All the news, in as few words as possible.</p>
        <nav className="mast-sections">
          {SECTIONS.map((x) => (
            <a key={x.id} href={`#${x.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${x.id}`)?.scrollIntoView({ behavior: "smooth" }); }} className={on(x.id) ? "" : "is-off"}>{x.name}</a>
          ))}
        </nav>
      </header>

      <div className="paper-grid">
        <div className="paper-main">
          {on("front") && (
            <article id="sec-front" className="lead-story">
              <span className="kicker">Front page</span>
              <h2 className="headline">{sunday.game === "poker" ? "Poker returns Sunday" : "Monopoly takes the table Sunday"}; {sunday.entrants.length} of {sunday.seats} seats already gone</h2>
              <p className="dek">The pot stands at {fmt(sunday.pot)} dragons, {fmt(sunday.fromModules)} of it from Spirits packs. The winner also takes the week's laurel.</p>
              <div className="cols">
                <p>Game night returns {fmtDate(nextSunday(), { weekday: "long", day: "numeric", month: "long" })} at 16:00 Berlin time. {sunday.entrants.slice(0, 3).join(", ")} have taken seats{sunday.registered ? ", and so have you" : ""}. Seats cost 10,000 dragons and every one of them goes to the prize.</p>
                <p>In the markets, {lead.i.name} {lead.b.change >= 0 ? "rose" : "fell"} {Math.abs(lead.b.change).toFixed(1)}% to {fmt(lead.b.last)} dragons. {yesterdayWinner ? `In Blue or Orange, ${yesterdayWinner} took the day.` : "Blue or Orange was void: only one colour was backed."}</p>
                <p>The Symposium kept late hours. Rumours that the kottabos disc is glued down remain unconfirmed.</p>
              </div>
              <button className="paper-link" onClick={() => go("sunday")}>Take a seat →</button>
            </article>
          )}

          {on("sunday") && (
            <article id="sec-sunday" className="story">
              <span className="kicker">Game night</span>
              <h3>Week {sunday.week}: who sits down</h3>
              <ul className="paper-list">
                {sunday.entrants.map((e) => <li key={e}>{e}</li>)}
                {Array.from({ length: sunday.seats - sunday.entrants.length }, (_, i) => <li key={i} className="faint">an empty seat</li>)}
              </ul>
            </article>
          )}

          {on("markets") && (
            <article id="sec-markets" className="story">
              <span className="kicker">Markets</span>
              <h3>Today's movers</h3>
              <table className="paper-table">
                <tbody>
                  {movers.map(({ i, b }) => (
                    <tr key={i.id} onClick={() => go("trade")}>
                      <td>{i.name}</td>
                      <td className="r num">{fmt(b.last)}</td>
                      <td className={`r num ${b.change >= 0 ? "pos" : "neg"}`}>{b.change >= 0 ? "▲" : "▼"} {Math.abs(b.change).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small">Blue or Orange pools today: {COLOURS.map((c) => `${c} ${fmt(boo.pools[c])}`).join(", ")}.</p>
            </article>
          )}

          {on("minecraft") && (
            <article id="sec-minecraft" className="story">
              <span className="kicker">Minecraft</span>
              <h3>Sea lantern farm runs at last</h3>
              <p>Brasidas_ and gorgoMC finished the long-promised farm. The 70,000-dragon bounty voted in last September is expected to pay out once the players agree it is “very efficient”. Diamonds trade near {fmt(bookOf("item:diamond", day).last)} dragons.</p>
              <button className="paper-link" onClick={() => go("minecraft")}>To the server →</button>
            </article>
          )}

          {on("daemon") && (
            <article id="sec-daemon" className="story story-daemon">
              <span className="kicker">Daemon dispatch</span>
              <h3>Epoch {issue}: {fmt(7200)} minted, {fmt(mintedBy(Date.now()))} in all</h3>
              <p>Proposal P-08, pinning the Arbiter to an open-weights model at temperature 0, sits at 48% of a 66% threshold. Blue or Orange still leads module activity.</p>
              <button className="paper-link" onClick={() => go("daemon")}>Go underneath →</button>
            </article>
          )}
        </div>

        <aside className="paper-side">
          {on("wire") && (
            <section id="sec-wire" className="wire">
              <span className="kicker">The Wire · Hacker News</span>
              {wire.loading && <p className="faint">Fetching…</p>}
              <ol>
                {wire.stories.slice(0, 8).map((st) => (
                  <li key={st.id}>
                    <a href={st.url ?? hnLink(st)} target="_blank" rel="noreferrer">{st.title}</a>
                    <a className="wire-meta mono" href={hnLink(st)} target="_blank" rel="noreferrer">{st.score} pts · {st.comments} comments</a>
                  </li>
                ))}
              </ol>
              {!wire.loading && !wire.live && <p className="small faint">Sample headlines. The live front page of Hacker News loads here on the real site.</p>}
            </section>
          )}

          {on("oracle") && (
            <section id="sec-oracle" className="oracle">
              <span className="kicker">The Oracle</span>
              {Object.entries(ORACLE).map(([el, lines]) => (
                <p key={el}><b>{el}.</b> {lines[Math.floor(r() * lines.length)]}</p>
              ))}
            </section>
          )}

          {on("archive") && (
            <section id="sec-archive" className="archive">
              <span className="kicker">From the archive</span>
              {ARCHIVE.slice(0, 5).map((a, i) => (
                <p key={i}><span className="mono">{a.when}.</span> {a.text}</p>
              ))}
            </section>
          )}

          <section className="subs">
            <span className="kicker">Your subscription</span>
            <ul>
              {SECTIONS.map((x) => (
                <li key={x.id}>
                  <label className="sub-toggle">
                    <input id={`sub-${x.id}`} type="checkbox" checked={on(x.id)} onChange={() => toggle(x.id)} />
                    <span>{x.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="delivery">
              {(["site", "dm"] as const).map((d) => (
                <button key={d} className={`seg-item ${s.news.delivery === d ? "is-on" : ""}`} onClick={() => setState((st) => ({ news: { ...st.news, delivery: d } }))}>
                  {d === "site" ? "On the site" : "Discord DM, mornings"}
                </button>
              ))}
            </div>
            <p className="small faint">Every issue is also posted in #news. Written from site data; nothing here is paid for.</p>
          </section>

          <section className="paper-ads">
            <span className="kicker">Classifieds</span>
            <p><b>WTB</b> 2 netherite, 8,600 each. Ask {MEMBERS[6].name}.</p>
            <p><b>Lost:</b> one Okeanyx, foil. Last seen at a private table.</p>
            <p><b>Wanted:</b> a fourth for Monopoly, Thursday evening.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
