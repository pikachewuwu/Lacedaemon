import { programBySlug, splitEntry } from "../economy/modules";
import { enter, useStore, type Receipt } from "../app/store";
import { requireAccount } from "../app/account";
import { Avatar, Daemon, DaemonSign, Dragons, Modal, toast } from "./kit";
import { fmtD } from "../app/format";

/** The breakdown of one entry, shown before paying. */
export function EntryBreakdown({ slug, amount }: { slug: string; amount: number }) {
  const m = programBySlug(slug);
  const s = splitEntry(m, amount);
  const isModule = m.kind === "module";
  return (
    <div className="breakdown">
      <div className="bd-row bd-total">
        <span>Entry</span>
        <Dragons value={amount} />
      </div>
      {s.pot > 0 && (
        <div className="bd-row">
          <span className="bd-arrow">{isModule ? "to the game's prize pot" : "to the prize, all of it"}</span>
          <Dragons value={s.pot} />
        </div>
      )}
      {s.sunday > 0 && (
        <div className="bd-row">
          <span className="bd-arrow">to Sunday's prize pot</span>
          <Dragons value={s.sunday} />
        </div>
      )}
      {s.owner > 0 && (
        <div className="bd-row">
          <span className="bd-arrow">kept by <Avatar name={m.owner} /> {m.owner}, who built it</span>
          <Dragons value={s.owner} />
        </div>
      )}
      {isModule ? (
        <>
          <div className="bd-row bd-daemon">
            <span>You also receive</span>
            <Daemon value={s.daemon} />
          </div>
          <p className="bd-note">
            {m.name} is a Daemon module built by {m.owner}. Your entry buys DAEMON from them at {m.price.toLocaleString("en-US")} dragons each. It's yours whether you win or lose.
          </p>
        </>
      ) : (
        <p className="bd-note">A house game. Dragons only, nothing kept back.</p>
      )}
    </div>
  );
}

export function EntryModal({
  open,
  onClose,
  slug,
  amount,
  title,
  detail,
  confirmLabel = "Enter",
  onEntered,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  amount: number;
  title: string;
  detail?: string;
  confirmLabel?: string;
  onEntered: (r: Receipt) => void;
}) {
  const balance = useStore((s) => s.dragons);
  const m = programBySlug(slug);
  const short = balance < amount;
  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="modal-head">
        <span className="label">{m.kind === "module" ? `${m.name} · module ${m.id}` : `${m.name} · house game`}</span>
        <h2 className="display" style={{ fontSize: "var(--t-xl)" }}>{title}</h2>
        {detail && <p className="muted">{detail}</p>}
      </div>
      <div className="modal-body">
        <EntryBreakdown slug={slug} amount={amount} />
        {short && <p className="neg" style={{ fontSize: "var(--t-sm)" }}>You have {balance.toLocaleString("en-US")} dragons. Collect, or win something first.</p>}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Not now</button>
        <button
          className="btn btn-primary"
          disabled={short}
          onClick={() =>
            requireAccount(() => {
              const r = enter(slug, amount, title);
              if (!r) return;
              onClose();
              toast(r.daemon > 0 ? <>Entered. +{fmtD(r.daemon)} DAEMON received</> : "Entered");
              onEntered(r);
            })
          }
        >
          {confirmLabel} · <Dragons value={amount} />
        </button>
      </div>
    </Modal>
  );
}

/** The line under a game's title that says what kind of game it is. */
export function ModuleLine({ slug }: { slug: string }) {
  const m = programBySlug(slug);
  if (m.kind === "house")
    return (
      <div className="module-line">
        <span className="label">house game</span>
        <span className="ml-sep" />
        <span>dragons only · every entry to the prize</span>
      </div>
    );
  const back = Math.round(((m.routes.pot ?? 0) + (m.routes.sunday ?? 0)) * 100);
  return (
    <div className="module-line is-module">
      <span className="label ml-mod"><DaemonSign size={11} /> module {m.id}</span>
      <span className="ml-sep" />
      <span className="ml-owner"><Avatar name={m.owner} /> built by {m.owner}</span>
      <span className="ml-sep" />
      <span>{back}% back to players</span>
    </div>
  );
}

/** Small mark for game tiles: Daemon module or house game. */
export function KindChip({ slug }: { slug: string }) {
  const m = programBySlug(slug);
  return m.kind === "module" ? (
    <span className="kind kind-module" title={`Daemon module ${m.id}, built by ${m.owner}`}><DaemonSign size={10} /> by {m.owner}</span>
  ) : (
    <span className="kind">house</span>
  );
}
