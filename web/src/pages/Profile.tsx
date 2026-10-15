import { setState, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { go } from "../app/router";
import { level } from "../app/quests";
import { fmt, fmtD } from "../app/format";
import { cardValue } from "../games/spirits/catalog";
import { itemById } from "../games/minecraft/items";
import { Avatar, Dragons } from "../ui/kit";
import { SpiritCard } from "../ui/SpiritCard";
import { ItemSprite, McHead } from "../ui/Pixel";

const ROLES = [
  { name: "Soul", color: "#c9a4ff", note: "17,000 every 777 min" },
  { name: "OG", color: "#f4a35f", note: "here since the start" },
  { name: "Real human being (and a real hero)", color: "#86c27f", note: "30 min in voice today" },
  { name: "Truth Seeker", color: "#6fa9e6", note: "reads the logs" },
];

export function ProfilePage() {
  const s = useStore((x) => x);
  if (!s.signedIn) {
    return (
      <div className="empty-page">
        <h1 className="display page-title">Profile</h1>
        <p className="muted">Sign in to see your profile: roles, titles, cards and records.</p>
        <button className="btn btn-primary" onClick={() => requireAccount()}>Sign in</button>
      </div>
    );
  }
  const best = [...s.cards].sort((a, b) => cardValue(b) - cardValue(a));
  const showcase = s.showcase.length ? s.showcase.map((u) => s.cards.find((c) => c.uid === u)).filter(Boolean) : best.slice(0, 4);
  const games = Object.entries(s.stats);
  const vault = Object.entries(s.mc.vault).filter(([, q]) => q > 0);
  const worth = vault.reduce((sum, [id, q]) => sum + itemById(id).ref * q, 0);

  return (
    <div className="profile">
      <section className="profile-banner">
        <div className="pb-sky" />
        <div className="pb-row">
          <Avatar name={s.name} you size="lg" />
          <div className="pb-who">
            <h1 className="display">{s.name}</h1>
            <span className="pb-title">{s.title ?? "No title"} · season level {level(s.xp)}</span>
          </div>
          <div className="pb-stats">
            <div><span className="label">Dragons</span><Dragons value={s.dragons} /></div>
            <div><span className="label">Spirits</span><span className="num">{s.cards.length}</span></div>
            <div><span className="label">Arena</span><span className="num">{s.arena.rating}</span></div>
            {s.daemon > 0 && <div><span className="label">DAEMON</span><span className="num">{fmtD(s.daemon)}</span></div>}
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <section className="panel">
          <div className="panel-head"><h2>Roles</h2><span className="faint mono">from Discord</span></div>
          <ul className="roles">
            {ROLES.map((r) => (
              <li key={r.name}><i style={{ background: r.color }} /><span>{r.name}</span><span className="faint">{r.note}</span></li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Title</h2></div>
          <div className="panel-body titles">
            {s.titles.map((t) => (
              <button key={t} className={`chip ${s.title === t ? "chip-accent" : ""}`} onClick={() => setState({ title: t })}>{t}</button>
            ))}
            <p className="faint" style={{ fontSize: "var(--t-xs)" }}>Earn more on the season track in Quests.</p>
          </div>
        </section>

        <section className="panel profile-show">
          <div className="panel-head"><h2>Showcase</h2><button className="btn btn-ghost btn-sm" onClick={() => go("spirits")}>Collection</button></div>
          <div className="panel-body showcase">
            {showcase.length === 0 && <p className="faint">Open a pack to have something to show.</p>}
            {showcase.map((c) => c && <SpiritCard key={c.uid} card={c} size="md" />)}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Minecraft</h2>{s.mc.linked ? <span className="chip chip-live">linked</span> : <button className="btn btn-sm" onClick={() => go("minecraft")}>Link</button>}</div>
          <div className="panel-body mc-mini">
            <McHead name={s.mc.linked ?? s.name} size={40} />
            <div>
              <p>{s.mc.linked ? <b>{s.mc.linked}</b> : <span className="faint">Not linked yet</span>}</p>
              <p className="faint">Vault worth about <Dragons value={worth} /></p>
            </div>
            <div className="mc-mini-items">
              {vault.slice(0, 6).map(([id, q]) => <span key={id} title={itemById(id).name}><ItemSprite id={id} size={22} /><b className="num">{q}</b></span>)}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Records</h2></div>
          <table className="table">
            <tbody>
              {games.length === 0 && <tr><td className="faint">Play something and it shows up here.</td></tr>}
              {games.map(([g, st]) => (
                <tr key={g}><td>{g}</td><td className="r num">{st.won}/{st.played} won</td><td className={`r num ${st.net >= 0 ? "pos" : ""}`}>{st.net >= 0 ? "+" : ""}{fmt(st.net)}</td></tr>
              ))}
              <tr><td>arena</td><td className="r num">{s.arena.wins}–{s.arena.losses}</td><td className="r num">{s.arena.rating}</td></tr>
              <tr><td>blue or orange</td><td className="r num">streak {s.booStreak}</td><td /></tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
