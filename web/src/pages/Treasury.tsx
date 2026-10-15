import { useState } from "react";
import { go } from "../app/router";
import { useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { MAX_RUNWAY_MONTHS, couponsPaid, issuing, monthlyCost, nextCoupon, room, runway, type Issue } from "../economy/bonds";
import { BALANCE, COSTS, EACH_COUPON, EVERY_BOND, ISSUES, WALL, balanceNow, holdBond, issueById } from "../app/treasury";
import { Avatar, Modal, toast } from "../ui/kit";

/**
 * The Treasury: what the server costs in real money, who pays for it, and
 * the server bonds that do. Bonds are donations with a certificate and a
 * yearly laurel; nothing is paid back in money and nothing turns into dragons.
 */

const eur = (n: number) => `€${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const monthYear = (t: number) => new Date(t).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
const roman = (id: string) => ({ lights: "I", arbiter: "II", consol: "III" })[id] ?? "";
const termLabel = (i: Issue) => (i.term === null ? "Perpetual" : `${i.term} years`);

function Certificate({ issue, onHold }: { issue: Issue; onHold: (amount: number) => void }) {
  const all = useStore((s) => s.bonds.held);
  const held = all.filter((b) => b.issue === issue.id);
  const [amount, setAmount] = useState(issue.suggested[1] ?? issue.min);
  const raised = issue.raised + held.reduce((s, b) => s + b.amount, 0);
  const open = issuing(balanceNow(), COSTS);
  return (
    <article className={`cert ${issue.term === null ? "cert-perpetual" : ""}`}>
      <div className="cert-guilloche" aria-hidden="true" />
      <header className="cert-head">
        <span className="label">Server bond · series {roman(issue.id)}</span>
        <span className={`cert-status ${open ? "st-open" : "st-placed"}`}>{open ? "open" : "paused"}</span>
      </header>
      <h2 className="display cert-name">{issue.name}</h2>
      <p className="cert-funds">{issue.funds}</p>
      <dl className="cert-terms">
        <div><dt>Term</dt><dd>{termLabel(issue)}</dd></div>
        <div><dt>Coupons</dt><dd>{issue.term === null ? "every year, for good" : `${issue.term}, one a year`}</dd></div>
        <div><dt>From</dt><dd className="num">{eur(issue.min)}</dd></div>
        <div><dt>Held by</dt><dd className="num">{issue.holders + held.length} · {eur(raised)}</dd></div>
      </dl>
      {issue.extra && <p className="cert-pays"><b>This series also:</b> {issue.extra}</p>}
      <footer className="cert-foot">
        <div className="seg cert-amounts" role="group" aria-label="Amount">
          {issue.suggested.map((a) => (
            <button key={a} className={`seg-item ${amount === a ? "is-on" : ""}`} onClick={() => setAmount(a)}>{eur(a)}</button>
          ))}
          <input
            className="input cert-custom num"
            type="number"
            min={issue.min}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Math.round(+e.target.value || 0)))}
            aria-label="Other amount in euros"
          />
        </div>
        <button className="btn btn-primary" disabled={!open || amount < issue.min} onClick={() => requireAccount(() => onHold(amount))}>
          Hold a bond · {eur(amount)}
        </button>
        {held.length > 0 && <span className="cert-held mono">you hold {held.length}</span>}
      </footer>
    </article>
  );
}

function Stamps({ term, paid }: { term: number | null; paid: number }) {
  const n = term ?? Math.max(10, paid + 3);
  return (
    <span className="stamps" aria-label={`${paid} of ${term ?? "unlimited"} coupons`}>
      {Array.from({ length: n }, (_, i) => <i key={i} className={i < paid ? "is-paid" : ""} />)}
      {term === null && <span className="faint">…</span>}
    </span>
  );
}

export function TreasuryPage() {
  const held = useStore((s) => s.bonds.held);
  const [pending, setPending] = useState<{ issue: Issue; amount: number } | null>(null);
  const now = Date.now();
  const balance = balanceNow();
  const monthly = monthlyCost(COSTS);
  const months = runway(balance, COSTS);
  const fundedTo = new Date(now);
  fundedTo.setMonth(fundedTo.getMonth() + months);
  const raisedAll = ISSUES.reduce((s, i) => s + i.raised, 0) + held.reduce((s, b) => s + b.amount, 0);
  const bondsAll = ISSUES.reduce((s, i) => s + i.holders, 0) + held.length;

  return (
    <div className="treasury">
      <header className="page-head">
        <div>
          <p className="label">Open books</p>
          <h1 className="display page-title">Treasury</h1>
          <p className="muted">What it costs to keep Lacedaemon running, and the server bonds that pay for it. A bond is a donation you hold for years: nothing is paid back in money, and every year it brings a small thank-you.</p>
        </div>
      </header>

      <section className="t-stats">
        <div><span className="label">Costs a month</span><b className="num">{eur(monthly)}</b></div>
        <div><span className="label">In the Treasury</span><b className="num">{eur(balance)}</b></div>
        <div><span className="label">Funded until</span><b className="num t-cover">{monthYear(fundedTo.getTime())}</b><span className="faint mono">{months} months</span></div>
        <div><span className="label">Held so far</span><b className="num">{eur(raisedAll)}</b><span className="faint mono">{bondsAll} bonds</span></div>
      </section>

      <section className="runway panel">
        <div className="panel-head"><h3>Runway</h3><span className="faint mono">{issuing(balance, COSTS) ? `${eur(room(balance, COSTS))} until bonds pause` : "bonds paused"}</span></div>
        <div className="runway-track" aria-label={`${months} of ${MAX_RUNWAY_MONTHS} months funded`}>
          {Array.from({ length: MAX_RUNWAY_MONTHS }, (_, i) => (
            <i key={i} className={i < months ? "is-funded" : ""} title={monthYear(new Date(now).setMonth(new Date(now).getMonth() + i))} />
          ))}
        </div>
        <p className="faint runway-note">Each block is a month of every bill paid. The server never raises more than {MAX_RUNWAY_MONTHS} months ahead; when the track is full, new bonds pause until it isn't.</p>
      </section>

      <div className="certs">
        {ISSUES.map((i) => <Certificate key={i.id} issue={i} onHold={(amount) => setPending({ issue: i, amount })} />)}
      </div>

      <div className="t-grid">
        <section className="panel">
          <div className="panel-head"><h3>Where the money goes</h3><span className="mono faint">a month</span></div>
          <ul className="t-income">
            {COSTS.map((c) => (
              <li key={c.id}>
                <div><b>{c.item}</b><div className="faint">{c.note}</div></div>
                <span className="t-income-bar"><i style={{ width: `${(c.perMonth / monthly) * 100}%` }} /></span>
                <span className="num">{eur(c.perMonth)}</span>
              </li>
            ))}
          </ul>
          <p className="panel-body faint t-note">Every euro in and out is listed once a month in The Laconian. <button className="link" onClick={() => go("news")}>Read it</button></p>
        </section>

        <section className="panel t-how">
          <div className="panel-head"><h3>What a bond brings</h3></div>
          <div className="t-perks">
            <span className="label">Every bond</span>
            <ul>{EVERY_BOND.map((x) => <li key={x}>{x}</li>)}</ul>
            <span className="label">Every year, on its anniversary</span>
            <ul>{EACH_COUPON.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <p className="faint t-note">No dragons, no DAEMON, nothing that can be cashed out or spent at a table. That keeps bonds a gift and keeps real money out of the games.</p>
        </section>
      </div>

      <div className="t-grid">
        <section className="panel">
          <div className="panel-head"><h3>Your bonds</h3></div>
          {held.length === 0 ? (
            <p className="panel-body faint">None yet. Any series above, from {eur(Math.min(...ISSUES.map((i) => i.min)))}.</p>
          ) : (
            <ul className="t-mine">
              {held.map((b) => {
                const i = issueById(b.issue);
                const paid = couponsPaid(b.at, i.term, now);
                const next = nextCoupon(b.at, i.term, now);
                return (
                  <li key={b.id}>
                    <div className="t-mine-cert">
                      <span className="label">No. {String(b.serial).padStart(3, "0")}</span>
                      <b className="display">{i.name}</b>
                      <span className="faint mono">{eur(b.amount)} · since {monthYear(b.at)}</span>
                    </div>
                    <div className="t-mine-side">
                      <Stamps term={i.term} paid={paid} />
                      <span className="faint mono">{next ? `next laurel ${monthYear(next)}` : "term complete"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>The wall</h3><span className="faint">everyone who keeps the lights on</span></div>
          <ul className="t-wall">
            {WALL.map((w) => (
              <li key={w.name}><Avatar name={w.name} /><span>{w.name}</span><span className="faint mono">{issueById(w.issue).name} · {w.since}</span></li>
            ))}
            {held.length > 0 && <li className="is-you"><Avatar name="you" you /><span>you</span><span className="faint mono">{issueById(held[0].issue).name} · {monthYear(held[0].at)}</span></li>}
          </ul>
        </section>
      </div>

      <section className="panel t-how t-rules">
        <div className="panel-head"><h3>How server bonds work</h3></div>
        <ol>
          <li><b>A gift you hold.</b> You give once, in real money. Nothing is ever paid back in money; the bond is a certificate and a thank-you that lasts its term.</li>
          <li><b>Long by design.</b> Three years, ten years, or perpetual. The coupon comes once a year, on the bond's anniversary.</li>
          <li><b>Nothing to cash out.</b> Rewards are cosmetic and yours alone. They can't be traded, staked or turned into dragons.</li>
          <li><b>Never more than two years ahead.</b> When the runway reaches {MAX_RUNWAY_MONTHS} months, new bonds pause.</li>
          <li><b>If the server ever closes,</b> whatever is left in the Treasury goes back to holders in proportion to what they gave.</li>
        </ol>
      </section>

      <Modal open={!!pending} onClose={() => setPending(null)} label="Hold a bond">
        {pending && (
          <div className="t-confirm">
            <span className="label">Server bond · series {roman(pending.issue.id)}</span>
            <h2 className="display">{pending.issue.name} · {eur(pending.amount)}</h2>
            <p className="muted">A donation to Lacedaemon, held as a {termLabel(pending.issue).toLowerCase()} bond. It is not repaid in money. Each year it brings a laurel and a cosmetic of your choice.</p>
            <p className="t-mock">This is the mockup: no payment page is connected and no money moves. Confirming only shows what holding a bond looks like. The Treasury currently holds {eur(BALANCE)}.</p>
            <div className="t-confirm-actions">
              <button className="btn" onClick={() => setPending(null)}>Not now</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const err = holdBond(pending.issue.id, pending.amount);
                  err ? toast(err, "bad") : toast("Thank you. The Gilded design is yours.", "good");
                  setPending(null);
                }}
              >
                Hold it (mockup)
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
