import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addCards, earn, enter, getState, moveDaemon, payout, removeCards, spend, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { MEMBERS } from "../app/members";
import { fmt, fmtD } from "../app/format";
import { programBySlug, splitEntry } from "../economy/modules";
import { botDecision, botStake, emptyStake, isEmpty, mergeStakes, stakeValue, type SeatStake, type StakeItems } from "../economy/wager";
import { byId, rollDrop, cardValue, type CardInstance } from "../games/spirits/catalog";
import { defaultRand } from "../games/rng";
import { Avatar, Daemon, Dragons, toast } from "../ui/kit";
import { EntryModal, ModuleLine } from "../ui/Entry";
import { PokerTableView, type Player } from "../ui/PokerTableView";
import { SpiritCard } from "../ui/SpiritCard";

const SNG_ENTRY = 2500;
const TABLE_FEE = 500;

type Mode = "menu" | "sng" | "private";

function Results({ standings, prize, drop, onAgain, children }: { standings: string[]; prize: number; drop: CardInstance | null; onAgain: () => void; children?: ReactNode }) {
  const name = useStore((s) => s.name);
  const place = standings.indexOf(name) + 1;
  return (
    <div className="results panel">
      <div className="results-head">
        <span className="label">Final standings</span>
        <h2 className="display">{place === 1 ? "You take the table." : `You finished ${place}${["th", "st", "nd", "rd"][place] ?? "th"}.`}</h2>
        {place === 1 && prize > 0 && <p>Prize: <Dragons value={prize} className="pos" /></p>}
      </div>
      <ol className="standings">
        {standings.map((n, i) => (
          <li key={n} className={n === name ? "is-you" : ""}><span className="num faint">{i + 1}</span><Avatar name={n} you={n === name} /> {n}</li>
        ))}
      </ol>
      {children}
      {drop && (
        <div className="drop">
          <SpiritCard card={drop} size="sm" />
          <p>A card dropped: <b>{byId(drop.spirit).name}</b>. Find it in your collection.</p>
        </div>
      )}
      <button className="btn btn-primary" onClick={onAgain}>Back to the poker room</button>
    </div>
  );
}

// ---- Sit & go --------------------------------------------------------------

function SitAndGo({ onExit }: { onExit: () => void }) {
  const name = useStore((s) => s.name);
  const players: Player[] = useMemo(() => {
    const bots = [...MEMBERS].sort(() => Math.random() - 0.5).slice(0, 5);
    return [{ id: "you", name, human: true }, ...bots.map((b) => ({ id: b.id, name: b.name, human: false }))].sort(() => Math.random() - 0.5);
  }, [name]);
  const prize = splitEntry(programBySlug("poker"), SNG_ENTRY).pot * players.length;
  const [done, setDone] = useState<{ standings: string[]; drop: CardInstance | null } | null>(null);

  if (done) return <Results standings={done.standings} prize={prize} drop={done.drop} onAgain={onExit} />;
  return (
    <PokerTableView
      title={`Sit & go · prize ${fmt(prize)}`}
      players={players}
      startingStack={3000}
      handsPerLevel={6}
      onFinish={(standings) => {
        const won = standings[0] === name;
        payout("poker", won ? prize : 0, "Won a poker sit & go", won);
        const drop = rollDrop(defaultRand, "Poker sit & go");
        if (drop) addCards([drop], "Card drop after a game", "drop");
        setDone({ standings, drop });
      }}
    />
  );
}

// ---- Private table -----------------------------------------------------------

function StakeView({ items }: { items: StakeItems }) {
  if (isEmpty(items)) return <span className="faint">nothing yet</span>;
  return (
    <div className="stake-items">
      {items.dragons > 0 && <Dragons value={items.dragons} />}
      {items.daemon > 0 && <Daemon value={items.daemon} />}
      {items.cards.map((c) => <SpiritCard key={c.uid} card={c} size="sm" />)}
    </div>
  );
}

function PrivateTable({ onExit }: { onExit: () => void }) {
  const s = useStore((x) => x);
  const [step, setStep] = useState<"setup" | "negotiate" | "play" | "done">("setup");
  const [invited, setInvited] = useState<string[]>(["brasidas", "kyniska"]);
  const [mine, setMine] = useState<StakeItems>({ dragons: 10000, daemon: 0, cards: [] });
  const [seats, setSeats] = useState<SeatStake[]>([]);
  const [standings, setStandings] = useState<string[]>([]);

  const toggleCard = (c: CardInstance) =>
    setMine((m) => ({ ...m, cards: m.cards.some((x) => x.uid === c.uid) ? m.cards.filter((x) => x.uid !== c.uid) : [...m.cards, c] }));

  // Bots answer one by one: first their stake, then their decision.
  useEffect(() => {
    if (step !== "negotiate") return;
    const pending = seats.findIndex((x) => x.status === "waiting");
    if (pending < 0) return;
    const seat = seats[pending];
    const t = setTimeout(() => {
      if (isEmpty(seat.items)) {
        const items = botStake(seat.player, stakeValue(mine), defaultRand);
        setSeats((all) => all.map((x, i) => (i === pending ? { ...x, items, note: "Puts up a stake." } : x)));
      } else {
        const others = [mine, ...seats.filter((_, i) => i !== pending).map((x) => x.items)];
        const d = botDecision(seat.items, others, defaultRand);
        setSeats((all) => all.map((x, i) => (i === pending ? { ...x, status: d.accept ? "accepted" : "declined", note: d.note } : x)));
      }
    }, 900 + Math.random() * 900);
    return () => clearTimeout(t);
  }, [step, seats, mine]);

  const accepted = seats.filter((x) => x.status === "accepted");
  const allAnswered = seats.length > 0 && seats.every((x) => x.status !== "waiting");
  const pot = mergeStakes([mine, ...accepted.map((x) => x.items)]);

  const propose = () =>
    requireAccount(() => {
      if (isEmpty(mine)) return toast("Put something on the table first", "bad");
      if (mine.dragons + TABLE_FEE > getState().dragons) return toast("Not enough dragons for that stake", "bad");
      if (mine.daemon > getState().daemon) return toast("You don't hold that much DAEMON", "bad");
      setSeats(invited.map((p) => ({ player: p, items: emptyStake(), status: "waiting" })));
      setStep("negotiate");
    });

  const deal = () => {
    // Escrow: everything on the table leaves the wallets now.
    const fee = enter("poker", TABLE_FEE, "Private table fee");
    if (!fee) return toast("Not enough dragons for the table fee", "bad");
    if (mine.dragons > 0) spend(mine.dragons, "Stake into escrow", "wager");
    if (mine.daemon > 0) moveDaemon(-mine.daemon, "Stake into escrow", "wager");
    if (mine.cards.length) removeCards(mine.cards.map((c) => c.uid));
    setStep("play");
  };

  const players: Player[] = useMemo(
    () => [{ id: "you", name: s.name, human: true }, ...accepted.map((x) => ({ id: x.player, name: x.player, human: false }))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step === "play"],
  );

  const settle = (order: string[]) => {
    setStandings(order);
    setStep("done");
    const won = order[0] === s.name;
    if (won) {
      if (pot.dragons) earn(pot.dragons, "Won a private table", "wager");
      if (pot.daemon) moveDaemon(pot.daemon, "Won a private table", "wager");
      if (pot.cards.length) addCards(pot.cards.map((c) => ({ ...c, origin: "Won at a private table" })), "Won cards at a private table", "wager");
    }
    payout("poker", 0, "", won);
  };

  if (step === "play")
    return <PokerTableView title={`Private table · ${fmt(stakeValue(pot))} on the table`} players={players} startingStack={5000} handsPerLevel={5} onFinish={settle} />;

  if (step === "done")
    return (
      <Results standings={standings} prize={0} drop={null} onAgain={onExit}>
        <div className="won-pot">
          <span className="label">{standings[0] === s.name ? "You take" : `${standings[0]} takes`}</span>
          <StakeView items={pot} />
        </div>
      </Results>
    );

  return (
    <div className="private">
      <section className="panel">
        <div className="panel-head"><h2>Who's playing</h2><span className="label">{invited.length + 1} seats</span></div>
        <div className="panel-body invite">
          {MEMBERS.filter((m) => m.online).map((m) => (
            <label key={m.id} className={`invitee ${invited.includes(m.name) ? "is-on" : ""}`}>
              <input id={`inv-${m.id}`} type="checkbox" disabled={step !== "setup"} checked={invited.includes(m.name)} onChange={(e) => setInvited((l) => (e.target.checked ? [...l, m.name].slice(0, 5) : l.filter((x) => x !== m.name)))} />
              <Avatar name={m.name} /> {m.name}
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Your stake</h2><span className="faint mono">worth ≈ {fmt(stakeValue(mine))}</span></div>
        <div className="panel-body stake-form">
          <label className="field" htmlFor="stake-dragons">
            <span className="faint">Dragons</span>
            <input id="stake-dragons" className="input num" type="number" min={0} step={500} value={mine.dragons} disabled={step !== "setup"} onChange={(e) => setMine((m) => ({ ...m, dragons: Math.max(0, +e.target.value || 0) }))} />
          </label>
          <label className="field" htmlFor="stake-daemon">
            <span className="faint">DAEMON <span className="mono">(you hold {fmtD(s.daemon)})</span></span>
            <input id="stake-daemon" className="input num" type="number" min={0} step={0.5} max={s.daemon} value={mine.daemon} disabled={step !== "setup" || s.daemon <= 0} onChange={(e) => setMine((m) => ({ ...m, daemon: Math.max(0, Math.min(s.daemon, +e.target.value || 0)) }))} />
          </label>
          <div className="field">
            <span className="faint">Cards {s.cards.length === 0 && "· open a pack to have some"}</span>
            <div className="stake-cards">
              {s.cards.slice(0, 12).map((c) => (
                <SpiritCard key={c.uid} card={c} size="sm" selected={mine.cards.some((x) => x.uid === c.uid)} onClick={step === "setup" ? () => toggleCard(c) : undefined} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel table-negotiation">
        <div className="panel-head"><h2>The table</h2><span className="faint mono">fee {fmt(TABLE_FEE)} · winner takes everything</span></div>
        <div className="panel-body">
          <ul className="nego">
            <li className="nego-row is-accepted">
              <span className="nego-who"><Avatar name={s.name} you /> {s.name}</span>
              <StakeView items={mine} />
              <span className="chip chip-accent">{step === "setup" ? "proposing" : "accepted"}</span>
            </li>
            {seats.map((x) => (
              <li key={x.player} className={`nego-row is-${x.status}`}>
                <span className="nego-who"><Avatar name={x.player} /> {x.player}</span>
                <StakeView items={x.items} />
                <span className="nego-status">
                  <span className={`chip ${x.status === "accepted" ? "chip-live" : ""}`}>{x.status === "waiting" ? (isEmpty(x.items) ? "thinking" : "deciding") : x.status}</span>
                  {x.note && <span className="faint nego-note">“{x.note}”</span>}
                </span>
              </li>
            ))}
          </ul>
          {step === "setup" ? (
            <button className="btn btn-primary btn-lg" onClick={propose} disabled={invited.length === 0}>Propose the table</button>
          ) : (
            <div className="nego-foot">
              <p className="muted">
                {!allAnswered ? "Everyone sees every stake before anything is dealt." : accepted.length === 0 ? "Nobody accepted. Change your stake and try again." : <>On the table: <b className="num">≈ {fmt(stakeValue(pot))}</b> in value, {pot.cards.length} cards.</>}
              </p>
              <div className="nego-actions">
                <button className="btn" onClick={() => { setSeats([]); setStep("setup"); }}>Change stakes</button>
                <button className="btn btn-primary" disabled={!allAnswered || accepted.length === 0} onClick={deal}>Deal · fee <Dragons value={TABLE_FEE} /></button>
              </div>
            </div>
          )}
        </div>
      </section>
      <p className="panel-note faint">Cards are valued at market reference ({pot.cards.map((c) => `${byId(c.spirit).name} ${fmt(cardValue(c))}`).join(", ") || "none on the table yet"}). DAEMON at 2,000.</p>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------

export function PokerPage() {
  const [mode, setMode] = useState<Mode>("menu");
  const [entry, setEntry] = useState(false);
  const m = programBySlug("poker");
  return (
    <div className="poker-page">
      <header className="page-head">
        <div>
          <p className="label">No-limit Texas hold'em</p>
          <h1 className="display page-title">Poker</h1>
          {mode === "menu" && <p className="muted">Everyone starts with the same stack. Blinds rise. The last player with chips wins.</p>}
        </div>
        {mode === "menu" ? <ModuleLine slug="poker" /> : <button className="btn" onClick={() => setMode("menu")}>Leave table</button>}
      </header>

      {mode === "menu" && (
        <div className="rooms">
          <button className="room" onClick={() => requireAccount(() => setEntry(true))}>
            <span className="label">Sit & go</span>
            <h2>Six seats, starts when full</h2>
            <p className="muted">3,000 chips each, blinds up every six hands. Winner takes {Math.round((m.routes.pot ?? 0) * 100)}% of all entries.</p>
            <span className="room-foot"><Dragons value={SNG_ENTRY} /> entry <span className="room-cta">Sit down →</span></span>
          </button>
          <button className="room room-private" onClick={() => requireAccount(() => setMode("private"))}>
            <span className="label">Private table</span>
            <h2>Put anything on the table</h2>
            <p className="muted">Dragons, DAEMON, your cards. Every player sees every stake and has to accept before the deal. Winner takes all of it.</p>
            <span className="room-foot"><Dragons value={TABLE_FEE} /> table fee <span className="room-cta">Set up →</span></span>
          </button>
          <div className="room room-sunday">
            <span className="label">Game night</span>
            <h2>Sunday, 16:00</h2>
            <p className="muted">One table for the whole server on poker weeks. Take a seat from the lobby or the Sunday page.</p>
          </div>
        </div>
      )}
      {mode === "sng" && <SitAndGo onExit={() => setMode("menu")} />}
      {mode === "private" && <PrivateTable onExit={() => setMode("menu")} />}

      <EntryModal
        open={entry}
        onClose={() => setEntry(false)}
        slug="poker"
        amount={SNG_ENTRY}
        title="Sit & go"
        detail="Six players. Winner takes the pot."
        confirmLabel="Sit down"
        onEntered={() => setMode("sng")}
      />
    </div>
  );
}
