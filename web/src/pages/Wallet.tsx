import { useState } from "react";
import { go } from "../app/router";
import { useStore, type LedgerEntry } from "../app/store";
import { ago } from "../app/format";
import { byId, cardValue } from "../games/spirits/catalog";
import { requireAccount } from "../app/account";
import { Daemon, Dragons, useNow } from "../ui/kit";
import { SpiritCard } from "../ui/SpiritCard";

const TAG_LABEL: Record<LedgerEntry["tag"], string> = {
  entry: "entry", prize: "prize", collect: "collect", pack: "pack", market: "market", drop: "drop", wager: "table", refund: "refund",
};

export function WalletPage() {
  const s = useStore((x) => x);
  const now = useNow(30000);
  const [filter, setFilter] = useState<"all" | LedgerEntry["tag"]>("all");
  if (!s.signedIn) {
    return (
      <div className="empty-page">
        <h1 className="display page-title">Wallet</h1>
        <p className="muted">Sign in to see your dragons, cards and everything else you hold.</p>
        <button className="btn btn-primary" onClick={() => requireAccount()}>Sign in</button>
      </div>
    );
  }
  const cardsValue = s.cards.reduce((sum, c) => sum + cardValue(c), 0);
  const rows = s.ledger.filter((l) => filter === "all" || l.tag === filter);

  return (
    <div className="wallet">
      <header className="page-head">
        <div>
          <p className="label">Wallet</p>
          <h1 className="display page-title">Everything you hold</h1>
        </div>
      </header>

      <div className="holdings">
        <div className="holding">
          <span className="label">Dragons</span>
          <Dragons value={s.dragons} className="holding-v" />
          <span className="faint">Earned by being here. Spent on entries, packs, the market.</span>
        </div>
        <div className="holding">
          <span className="label">Spirits</span>
          <span className="holding-v num">{s.cards.length} <span className="faint">cards</span></span>
          <span className="faint">Worth about <Dragons value={cardsValue} /> on the market.</span>
        </div>
        <div className="holding holding-daemon">
          <span className="label">DAEMON</span>
          <Daemon value={s.daemon} className="holding-v" />
          <span className="faint">
            Every entry buys a little from the people who run the games.{" "}
            <button className="link" onClick={() => go("daemon")}>What is it?</button>
          </span>
        </div>
      </div>

      {s.cards.length > 0 && (
        <section className="wallet-cards">
          <div className="section-title"><h2>Recent cards</h2><button className="btn btn-ghost btn-sm" onClick={() => go("spirits")}>Collection</button></div>
          <div className="card-strip">
            {s.cards.slice(0, 8).map((c) => <SpiritCard key={c.uid} card={c} size="sm" />)}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Ledger</h2>
          <select className="select ledger-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter">
            <option value="all">All activity</option>
            {Object.entries(TAG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table ledger">
            <thead><tr><th>When</th><th>What</th><th className="r">Dragons</th><th className="r">DAEMON</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="faint">Nothing yet. Collect, play, or open a pack.</td></tr>}
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className="num faint">{ago(l.at, now)}</td>
                  <td>
                    <span className="tag">{TAG_LABEL[l.tag]}</span> {l.text}
                    {l.cards && <span className="faint"> · {l.cards.map((c) => byId(c).name).join(", ")}</span>}
                  </td>
                  <td className={`r num ${l.dragons ? (l.dragons > 0 ? "pos" : "") : "faint"}`}>{l.dragons ? (l.dragons > 0 ? "+" : "−") + Math.abs(l.dragons).toLocaleString("en-US") : "·"}</td>
                  <td className={`r num ${l.daemon ? "" : "faint"}`}>{l.daemon ? (l.daemon > 0 ? "+" : "−") + Math.abs(l.daemon).toFixed(2) : "·"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
