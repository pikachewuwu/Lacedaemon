import { useRef, useState } from "react";
import { enter, payout, useStore } from "../app/store";
import { requireAccount } from "../app/account";
import { fmt } from "../app/format";
import { Dragons, toast } from "../ui/kit";
import { KindChip } from "../ui/Entry";

/**
 * The machine (house): the server's slot machine with UnbelievaBoat's
 * published odds. Four symbols, three in a row pays. Returns 96.875%.
 */

type Say = (l: { who?: string; text: string; tone?: "win" | "loss" | "chat" | "sys" }) => void;

const SYMBOLS = [
  { id: "dragon", mult: 34, label: "Dragon" },
  { id: "sun", mult: 16, label: "Sun" },
  { id: "laurel", mult: 8, label: "Laurel" },
  { id: "wave", mult: 4, label: "Wave" },
] as const;

function Symbol({ id }: { id: (typeof SYMBOLS)[number]["id"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 40 40" className={`sym sym-${id}`} aria-label={id}>
      {id === "dragon" && <path {...common} d="M30 12c-2.6-3.6-6.6-5.6-10.8-5.6C12 6.4 6.4 12 6.4 19.2S12 31.6 19.2 31.6c5 0 9.2-3 9.2-7.4 0-3.6-2.8-6.2-6.4-6.2-3 0-5.4 2.2-5.4 5 0 2 1.6 3.6 3.6 3.6M30 12l3.6-3.2M30 12l.8 4.4" />}
      {id === "sun" && (
        <g {...common}>
          <circle cx="20" cy="20" r="7" fill="currentColor" stroke="none" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1={20 + Math.cos((a * Math.PI) / 180) * 11} y1={20 + Math.sin((a * Math.PI) / 180) * 11} x2={20 + Math.cos((a * Math.PI) / 180) * 15} y2={20 + Math.sin((a * Math.PI) / 180) * 15} />)}
        </g>
      )}
      {id === "laurel" && <path {...common} d="M20 34V14M20 30c-6-1-9-5-9-10 4 1 8 4 9 10Zm0-6c6-1 9-5 9-10-4 1-8 4-9 10Zm0-6c-4-1-6-4-6-8 3 1 5 3 6 8Zm0 0c4-1 6-4 6-8-3 1-5 3-6 8Z" />}
      {id === "wave" && <path {...common} d="M5 16c5-5 10 5 15 0s10 5 15 0M5 24c5-5 10 5 15 0s10 5 15 0" />}
    </svg>
  );
}

export function Machine({ say }: { say: Say }) {
  const name = useStore((s) => s.name);
  const [bet, setBet] = useState(1000);
  const [reels, setReels] = useState<number[]>([0, 1, 2]);
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false]);
  const [result, setResult] = useState<string | null>(null);
  const spinningRef = useRef([false, false, false]);

  const spin = () =>
    requireAccount(() => {
      if (spinning.some(Boolean)) return;
      if (!enter("slots", bet, "Slots spin")) return toast("Not enough dragons", "bad");
      const final = [0, 1, 2].map(() => Math.floor(Math.random() * 4));
      setResult(null);
      setSpinning([true, true, true]);
      const ticker = setInterval(() => setReels((r) => r.map((v, i) => (spinningRef.current[i] ? (v + 1) % 4 : v))), 70);
      final.forEach((f, i) =>
        setTimeout(() => {
          spinningRef.current[i] = false;
          setReels((r) => r.map((v, j) => (j === i ? f : v)));
          setSpinning((s) => s.map((v, j) => (j === i ? false : v)));
          if (i === 2) {
            clearInterval(ticker);
            const win = final[0] === final[1] && final[1] === final[2] ? SYMBOLS[final[0]] : null;
            if (win) {
              const amount = bet * win.mult;
              payout("slots", amount, `Slots: three ${win.label.toLowerCase()}s`, true);
              setResult(`Three ${win.label.toLowerCase()}s · ${win.mult}×`);
              say({ who: name, text: `hit three ${win.label.toLowerCase()}s +${fmt(amount)}`, tone: "win" });
            } else {
              payout("slots", 0, "", false);
              setResult("No line");
            }
          }
        }, 700 + i * 450),
      );
      spinningRef.current = [true, true, true];
    });

  return (
    <section className="panel-vase slots">
      <div className="vase-head">
        <div>
          <span className="label">Three reels · the classic odds</span>
          <h2 className="display">The machine</h2>
        </div>
        <KindChip slug="slots" />
      </div>
      <div className="slots-body">
        <div className="reels">
          {reels.map((s, i) => (
            <div key={i} className={`reel ${spinning[i] ? "is-spinning" : ""}`}><Symbol id={SYMBOLS[s].id} /></div>
          ))}
        </div>
        <p className={`slots-result ${result && result !== "No line" ? "is-win" : ""}`}>{result ?? "Three in a row pays."}</p>
        <div className="paytable">
          {SYMBOLS.map((s) => (
            <span key={s.id}><Symbol id={s.id} /><b className="num">{s.mult}×</b></span>
          ))}
        </div>
        <div className="slots-controls">
          <div className="presets">
            {[500, 1000, 5000].map((v) => <button key={v} className={`btn btn-sm ${bet === v ? "is-on" : ""}`} onClick={() => setBet(v)}>{fmt(v)}</button>)}
          </div>
          <button className="btn btn-primary" onClick={spin} disabled={spinning.some(Boolean)}>Spin · <Dragons value={bet} /></button>
        </div>
        <p className="faint mono" style={{ fontSize: 11 }}>Three of a kind 1 in 16 · returns 96.875% · house game</p>
      </div>
    </section>
  );
}
