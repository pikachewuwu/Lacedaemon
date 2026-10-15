import { useState } from "react";
import { go } from "../app/router";
import { setState, useStore } from "../app/store";
import { sundayInfo, SUNDAY_ENTRY } from "../app/sunday";
import { berlin, berlinNow, fmtDate, nextSunday, sundayGame, sundayIndex, SEASON_START } from "../app/time";
import { MEMBERS } from "../app/members";
import { hashSeed, seeded } from "../games/rng";
import { SPIRITS } from "../games/spirits/catalog";
import { programBySlug } from "../economy/modules";
import { Avatar, Dragons, useNow } from "../ui/kit";
import { EntryModal, ModuleLine } from "../ui/Entry";
import { SpiritCard } from "../ui/SpiritCard";
import { SundayEntrants } from "./Lobby";

const GAME_NAME = { poker: "Poker", monopoly: "Monopoly" } as const;

function pastNights(now: Date) {
  const out: { date: Date; week: number; game: "poker" | "monopoly"; winner: string; pot: number; laurel: string }[] = [];
  let d = new Date(SEASON_START);
  while (d.getTime() < now.getTime() - 3600_000 * 3) {
    const week = sundayIndex(d);
    const r = seeded(hashSeed(`night:${week}`));
    const mythics = SPIRITS.filter((s) => s.rarity === "mythic");
    out.push({
      date: d,
      week,
      game: sundayGame(d),
      winner: MEMBERS[Math.floor(r() * MEMBERS.length)].name,
      pot: Math.round((60000 + r() * 50000) / 1000) * 1000,
      laurel: mythics[Math.floor(r() * mythics.length)].id,
    });
    d = new Date(d.getTime() + 7 * 86_400_000);
  }
  return out.reverse();
}

function PastNights({ past }: { past: ReturnType<typeof pastNights> }) {
  return (
        <section className="panel">
          <div className="panel-head"><h2>Past nights</h2><span className="label">example results</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Week</th><th>Date</th><th>Game</th><th>Winner</th><th className="r">Prize</th></tr></thead>
              <tbody>
                {past.length === 0 && <tr><td colSpan={5} className="faint">The first night hasn't happened yet.</td></tr>}
                {past.map((p) => (
                  <tr key={p.week}>
                    <td className="num faint">W{p.week}</td>
                    <td>{fmtDate(p.date, { day: "numeric", month: "short" })}</td>
                    <td>{GAME_NAME[p.game]}</td>
                    <td><span className="who"><Avatar name={p.winner} /> {p.winner}</span></td>
                    <td className="r"><Dragons value={p.pot} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
  );
}

export function SundayPage() {
  const now = useNow(1000);
  const s = useStore((x) => x);
  const info = sundayInfo(s, new Date(now));
  const [open, setOpen] = useState(false);
  const m = programBySlug(info.game);
  const past = pastNights(new Date(now));
  const upcoming = Array.from({ length: 4 }, (_, i) => {
    const b = berlinNow(nextSunday(new Date(now)));
    const dd = berlin(b.year, b.month, b.day + i * 7, 16);
    return { date: dd, game: sundayGame(dd), week: sundayIndex(dd) };
  });

  return (
    <div className="sunday-page">
      <header className="page-head">
        <div>
          <p className="label">Game night · week {info.week} · season 1</p>
          <h1 className="display page-title">Sunday, {GAME_NAME[info.game]}</h1>
          <p className="muted">{fmtDate(info.date, { weekday: "long", day: "numeric", month: "long" })} at 16:00 Berlin. One table, everyone together in voice. Winner takes the pot and the laurel.</p>
        </div>
        <ModuleLine slug={info.game} />
      </header>

      <div className="sunday-grid">
        <div className="sunday-col">
        <section className="panel sunday-main">
          <div className="panel-head"><h2>The table</h2><span className="label">{info.entrants.length}/{info.seats} seated</span></div>
          <div className="panel-body sunday-table">
            <SundayEntrants entrants={info.entrants} seats={info.seats} />
            <ul className="entrant-list">
              {info.entrants.map((e) => (
                <li key={e}><Avatar name={e} you={e === s.name} /> {e}{e === s.name && <span className="chip chip-accent">you</span>}</li>
              ))}
            </ul>
            {info.registered ? (
              <div className="seated-note">
                <p>You're seated. We'll ping you in Discord an hour before.</p>
                <button className="btn" onClick={() => go(info.game)}>Warm up with a practice game</button>
              </div>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)}>Take a seat · <Dragons value={SUNDAY_ENTRY} /></button>
            )}
          </div>
        </section>
        <PastNights past={past} />
        </div>

        <div className="sunday-col">
        <section className="panel">
          <div className="panel-head"><h2>Where the prize comes from</h2></div>
          <div className="panel-body pot-flow">
            <div className="pf-row"><span>{info.entrants.length} entries × {Math.round((m.routes.pot ?? 0) * 100)}% of <Dragons value={SUNDAY_ENTRY} /></span><Dragons value={info.fromEntries} /></div>
            <div className="pf-row"><span>Spirits packs this week (40% of each pack)</span><Dragons value={info.fromModules} /></div>
            <div className="pf-row pf-total"><span>Prize</span><Dragons value={info.pot} /></div>
            <div className="pf-laurel">
              <SpiritCard card={{ uid: "laurel", spirit: "orthia", foil: true, serial: info.week, origin: "Game night", laurel: { week: String(info.week), game: GAME_NAME[info.game] } }} size="sm" />
              <p className="muted">The winner also gets this week's laurel: an Orthia card stamped with the week and the game. Only one is ever minted per Sunday.</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Coming up</h2></div>
          <ol className="upcoming">
            {upcoming.map((u) => (
              <li key={u.week}>
                <span className="num faint">W{u.week}</span>
                <span>{fmtDate(u.date, { day: "numeric", month: "short" })}</span>
                <span className="upcoming-game">{GAME_NAME[u.game]}</span>
              </li>
            ))}
          </ol>
          <p className="panel-note faint">Poker on odd weeks, Monopoly on even weeks. New games join the rotation by vote.</p>
        </section>

        </div>
      </div>

      <EntryModal
        open={open}
        onClose={() => setOpen(false)}
        slug={info.game}
        amount={SUNDAY_ENTRY}
        title={`Game night · ${GAME_NAME[info.game]}`}
        confirmLabel="Take a seat"
        onEntered={() => setState({ sundayWeek: String(info.week) })}
      />
    </div>
  );
}
