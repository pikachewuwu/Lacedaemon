import { useEffect, useState } from "react";
import { go } from "../app/router";
import { useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { fmt } from "../app/format";
import { berlin, fmtDate, GAME_HOUR, SEASON_START } from "../app/time";
import { FACE, SELL_BACK_FEE, coupon, coverage, maturityWeek, sellBackValue, totalReturn, type BondSeries } from "../economy/bonds";
import {
  INCOME, OTHER_ORDERS, board, buyFromBoard, buyNew, cancelOrder, couponsDue, order, previewAllotment,
  seatsIn, sellBack, series, seriesById, settleBonds, thisWeek, weeklyIncome,
} from "../app/treasury";
import { Avatar, Dragons, toast } from "../ui/kit";

/**
 * The Treasury: the house's books in public, and the dragon bonds it issues
 * to pay for things worth doing ahead of time.
 */

const sundayOf = (week: number) => {
  const d = new Date(SEASON_START.getTime() + (week - 1) * 7 * 86_400_000);
  const b = { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
  return berlin(b.y, b.m, b.d, GAME_HOUR);
};
const dayOf = (week: number) => fmtDate(sundayOf(week), { day: "numeric", month: "short" });
const pct = (x: number) => `${(x * 100).toFixed(x < 0.01 ? 2 : 1)}%`;

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <span className="stepper">
      <button className="btn btn-sm" onClick={() => onChange(Math.max(1, value - 1))} aria-label="One fewer">−</button>
      <span className="num">{value}</span>
      <button className="btn btn-sm" onClick={() => onChange(Math.min(Math.max(1, max), value + 1))} aria-label="One more">+</button>
    </span>
  );
}

function Certificate({ s }: { s: BondSeries }) {
  const st = useStore((x) => x);
  const [qty, setQty] = useState(1);
  const held = st.bonds.lots.filter((l) => l.series === s.id).reduce((n, l) => n + l.qty, 0);
  const ordered = st.bonds.orders[s.id] ?? 0;
  const room = Math.max(0, s.cap - held - ordered);
  const sold = s.sold + held;
  const sub = s.status === "subscribing";
  const preview = sub ? previewAllotment(s.id) : null;
  const orders = sub ? [...(OTHER_ORDERS[s.id] ?? []), ...(ordered ? [{ name: st.name, qty: ordered }] : [])] : [];
  const act = (fn: () => string | null, ok: string) =>
    requireAccount(() => {
      const err = fn();
      err ? toast(err, "bad") : toast(ok, "good");
    });

  return (
    <article className={`cert cert-${s.status}`}>
      <div className="cert-guilloche" aria-hidden="true" />
      <header className="cert-head">
        <span className="label">Dragon bond · series {s.id === "final" ? "I" : s.id === "lighthouse" ? "II" : "III"}</span>
        <span className={`cert-status st-${s.status}`}>
          {s.status === "open" ? "on sale" : s.status === "subscribing" ? `orders · ${dayOf(s.issueWeek)}` : s.status === "placed" ? "sold out" : "matured"}
        </span>
      </header>
      <h2 className="display cert-name">{s.name}</h2>
      <p className="cert-funds">{s.funds}</p>

      <dl className="cert-terms">
        <div><dt>Face</dt><dd><Dragons value={FACE} /></dd></div>
        <div><dt>Coupon</dt><dd className="num">{pct(s.base)}{s.perSeat > 0 && <small> + {pct(s.perSeat)} a seat past {s.seatsFrom}</small>}</dd></div>
        <div><dt>Term</dt><dd className="num">{s.term} Sundays</dd></div>
        <div><dt>Matures</dt><dd className="num">{dayOf(maturityWeek(s))}</dd></div>
      </dl>

      <div className="cert-fill">
        <span className="cert-bar"><i style={{ width: `${Math.min(100, ((sub ? orders.reduce((n, o) => n + Math.min(o.qty, s.cap), 0) : sold) / s.size) * 100)}%` }} /></span>
        <span className="mono faint">
          {sub ? `${orders.reduce((n, o) => n + Math.min(o.qty, s.cap), 0)} ordered of ${s.size}` : `${sold} of ${s.size} placed`} · cap {s.cap} a member
        </span>
      </div>

      <p className="cert-pays">
        One bond pays about <Dragons value={coupon(s, 7)} /> every game night and <Dragons value={FACE} /> back at the end:{" "}
        <b className="pos">+{pct(totalReturn(s, 7))}</b> over {s.term} weeks at seven seats.
      </p>

      {sub && preview && (
        <div className="cert-book">
          <span className="label">The order book · smallest filled first</span>
          <ul>
            {orders
              .slice()
              .sort((a, b) => Math.min(a.qty, s.cap) - Math.min(b.qty, s.cap))
              .map((o) => (
                <li key={o.name} className={o.name === st.name ? "is-you" : ""}>
                  <Avatar name={o.name} you={o.name === st.name} />
                  <span>{o.name === st.name ? "you" : o.name}</span>
                  <span className="num faint">{o.qty > s.cap ? <><s>{o.qty}</s> {s.cap}</> : o.qty}</span>
                  <span className="num">→ {preview.all[o.name] ?? 0}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <footer className="cert-foot">
        {s.status === "open" && (
          <>
            <Stepper value={qty} max={Math.min(room, s.size - sold)} onChange={setQty} />
            <button className="btn btn-primary" disabled={room === 0 || sold >= s.size} onClick={() => act(() => buyNew(s.id, qty), `Bought ${qty} ${s.name} bond${qty > 1 ? "s" : ""}.`)}>
              Buy · <Dragons value={qty * FACE} />
            </button>
          </>
        )}
        {sub && (
          <>
            <Stepper value={qty} max={room} onChange={setQty} />
            <button className="btn btn-primary" disabled={room === 0} onClick={() => act(() => order(s.id, qty), `Ordered ${qty}. Filled at game night, smallest orders first.`)}>
              Order · <Dragons value={qty * FACE} />
            </button>
            {ordered > 0 && <button className="btn btn-ghost" onClick={() => cancelOrder(s.id)}>Cancel my {ordered}</button>}
          </>
        )}
        {s.status === "placed" && <span className="faint">Sold out. Members sometimes sell theirs on the board below.</span>}
        {held > 0 && <span className="cert-held mono">you hold {held}</span>}
      </footer>
    </article>
  );
}

export function TreasuryPage() {
  const st = useStore((x) => x);
  useEffect(() => { settleBonds(); }, [st.signedIn]);
  const all = series();
  const wk = thisWeek();
  const income = weeklyIncome();
  const due = couponsDue();
  const cover = coverage(income, due);
  const onLoan = all.filter((s) => s.status !== "matured" && s.status !== "subscribing").reduce((n, s) => n + s.sold * FACE, 0) + st.bonds.lots.reduce((n, l) => n + l.qty * FACE, 0);
  const asks = board();

  return (
    <div className="treasury">
      <header className="page-head">
        <div>
          <p className="label">The house's books, in public</p>
          <h1 className="display page-title">Treasury</h1>
          <p className="muted">The server borrows dragons from its members for things worth doing ahead of time, and pays them back at game night. Dragons only: a bond is a promise of dragons, never of money.</p>
        </div>
      </header>

      <section className="t-stats">
        <div><span className="label">Earned this week</span><Dragons value={income} /></div>
        <div><span className="label">Coupons due {dayOf(wk)}</span><Dragons value={due} /></div>
        <div><span className="label">Coverage</span><b className="num t-cover">{cover === Infinity ? "∞" : `${cover.toFixed(1)}×`}</b></div>
        <div><span className="label">On loan from members</span><Dragons value={onLoan} /></div>
      </section>

      <div className="certs">{all.filter((s) => s.status !== "matured").map((s) => <Certificate key={s.id} s={s} />)}</div>

      <div className="t-grid">
        <section className="panel">
          <div className="panel-head"><h3>Your bonds</h3>{st.bonds.earned > 0 && <span className="mono pos">coupons so far {fmt(st.bonds.earned)}</span>}</div>
          {st.bonds.lots.length === 0 ? (
            <p className="panel-body faint">None yet. Buy a few above, or take some off a member on the board.</p>
          ) : (
            <table className="t-table">
              <thead><tr><th>Series</th><th>Serials</th><th>Next coupon</th><th>Matures</th><th /></tr></thead>
              <tbody>
                {st.bonds.lots.map((l) => {
                  const s = seriesById(l.series);
                  const back = sellBackValue(s, wk - 1) * l.qty;
                  const started = wk > s.issueWeek;
                  return (
                    <tr key={l.id}>
                      <td><b>{s.name}</b><div className="faint mono">{l.qty} × {fmt(FACE)}</div></td>
                      <td className="mono">{String(l.serial).padStart(4, "0")}{l.qty > 1 ? `–${String(l.serial + l.qty - 1).padStart(4, "0")}` : ""}</td>
                      <td>{started ? <><Dragons value={l.qty * coupon(s, seatsIn(wk))} /> <span className="faint mono">{dayOf(wk)}</span></> : <span className="faint">from {dayOf(s.issueWeek + 1)}</span>}</td>
                      <td className="mono">{dayOf(maturityWeek(s))}</td>
                      <td><button className="btn btn-sm" onClick={() => { sellBack(l.id); toast(<>Sold back for <Dragons value={back} /></>, "good"); }}>Sell back · {fmt(back)}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>The board</h3><span className="faint">members selling early</span></div>
          <ul className="t-board">
            {asks.map((a) => {
              const s = seriesById(a.series);
              const left = maturityWeek(s) - (wk - 1);
              const ytm = (left * coupon(s, 7) + FACE - a.price) / a.price;
              return (
                <li key={a.id}>
                  <Avatar name={a.name} />
                  <div><b>{a.qty} × {s.name}</b><div className="faint mono">{a.name} · {left} Sundays left · {ytm >= 0 ? "+" : ""}{pct(ytm)} to maturity</div></div>
                  <button className="btn btn-sm" onClick={() => requireAccount(() => { const e = buyFromBoard(a); e ? toast(e, "bad") : toast("Bought from " + a.name, "good"); })}>
                    {fmt(a.price)} each
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="t-grid">
        <section className="panel">
          <div className="panel-head"><h3>Where the coupons come from</h3><span className="mono faint">a week</span></div>
          <ul className="t-income">
            {INCOME.map((i) => (
              <li key={i.source}>
                <div><b>{i.source}</b><div className="faint">{i.note}</div></div>
                <span className="t-income-bar"><i style={{ width: `${(i.amount / income) * 100}%` }} /></span>
                <Dragons value={i.amount} />
              </li>
            ))}
          </ul>
          <p className="panel-body faint t-note">House games still send every entry dragon to the prize. The Treasury lives on edges and fees, not on the tables.</p>
        </section>

        <section className="panel t-how">
          <div className="panel-head"><h3>How dragon bonds work</h3></div>
          <ol>
            <li><b>Paid at game night.</b> Terms run in Sundays; coupons land with the prize.</li>
            <li><b>Full tables pay more.</b> Most series add to the coupon for every seat filled past six, so holders want people at the table.</li>
            <li><b>Small orders first.</b> New series fill the smallest orders first, and nobody can hold more than the cap.</li>
            <li><b>Nothing defaults.</b> If the Treasury comes up short, the coupon rolls to next Sunday and is paid first.</li>
            <li><b>Always a way out.</b> Sell back to the Treasury any time for a fee that starts at {pct(SELL_BACK_FEE)} and shrinks to nothing, or sell to a member on the board.</li>
          </ol>
          <p className="faint t-note">The DAEMON layer has its own version of this: locking behind a module. <button className="link" onClick={() => go("daemon")}>See underneath</button></p>
        </section>
      </div>
    </div>
  );
}
