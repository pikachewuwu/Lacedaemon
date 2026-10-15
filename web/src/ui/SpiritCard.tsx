import { useMemo, useRef, type PointerEvent } from "react";
import { byId, type CardInstance, type Element, type Spirit } from "../games/spirits/catalog";
import { hashSeed, seeded } from "../games/rng";

const PALETTE: Record<Element, { a: string; b: string; body: string; glow: string; line: string }> = {
  water: { a: "#0d1c2e", b: "#1d4769", body: "#82bdf0", glow: "#d6ecff", line: "#9fd0ff" },
  fire: { a: "#2a0f08", b: "#6e2a10", body: "#f59c55", glow: "#ffdcae", line: "#ffb27a" },
  grass: { a: "#0f2014", b: "#284f2e", body: "#92d18a", glow: "#e3f6cc", line: "#b4e6a4" },
  aether: { a: "#17141b", b: "#3a3142", body: "#ecdfca", glow: "#fff4df", line: "#f4e2c0" },
};

function superformula(m: number, n1: number, n2: number, n3: number, r: number, cx: number, cy: number, rot: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const phi = (i / 120) * Math.PI * 2;
    const t1 = Math.abs(Math.cos((m * phi) / 4)) ** n2;
    const t2 = Math.abs(Math.sin((m * phi) / 4)) ** n3;
    const rr = (t1 + t2) ** (-1 / n1);
    const k = Math.min(rr, 1.6) * r;
    pts.push(`${(cx + Math.cos(phi + rot) * k).toFixed(1)},${(cy + Math.sin(phi + rot) * k * 0.92).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** Procedural creature: an elemental backdrop, element features (flames, fins, leaves, a halo), a body, eyes and a mouth. */
export function SpiritArt({ spirit }: { spirit: Spirit }) {
  const art = useMemo(() => {
    const r = seeded(hashSeed(spirit.id + ":art"));
    const pal = PALETTE[spirit.element];
    const m = [3, 4, 5, 6, 7, 8][Math.floor(r() * 6)];
    const size = { common: 26, uncommon: 29, rare: 32, mythic: 35, exalted: 37 }[spirit.rarity];
    const body = superformula(m, 1.2 + r() * 5, 0.6 + r() * 6, 0.6 + r() * 6, size, 50, 52, r() * Math.PI);
    const inner = superformula(m + 2, 2 + r() * 4, 1 + r() * 4, 1 + r() * 4, size * 0.42, 50, 56, r() * Math.PI);
    const eyeY = 46 + r() * 5;
    const eyeDx = 6 + r() * 5;
    const eyeStyle = Math.floor(r() * 3); // 0 round, 1 sleepy, 2 one eye
    const mouthW = 2 + r() * 4;
    const top = 52 - size * 0.86;
    const motif: string[] = [];
    for (let i = 0; i < 9; i++) {
      const y = 10 + i * 10 + r() * 4;
      if (spirit.element === "water") motif.push(`M0 ${y} Q 12.5 ${y - 3} 25 ${y} T 50 ${y} T 75 ${y} T 100 ${y}`);
      else if (spirit.element === "grass") {
        const x = r() * 100;
        motif.push(`M${x} ${y + 6} q ${3 + r() * 4} -6 0 -12 q ${-3 - r() * 4} 6 0 12`);
      }
    }
    const embers = Array.from({ length: 16 }, () => [r() * 100, r() * 100, 0.4 + r() * 1.3]);
    // Element features, drawn behind the body.
    const features: string[] = [];
    if (spirit.element === "fire") {
      const n = 3 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const x = 50 + (i - (n - 1) / 2) * (6 + r() * 3);
        const h = 10 + r() * 10 + (i === Math.floor(n / 2) ? 6 : 0);
        features.push(`M${x - 5} ${top + 8} Q ${x - 4} ${top - h * 0.4} ${x} ${top - h} Q ${x + 4} ${top - h * 0.4} ${x + 5} ${top + 8} Z`);
      }
    } else if (spirit.element === "water") {
      features.push(`M${50 - 4} ${top + 6} Q ${54 + r() * 6} ${top - 16 - r() * 8} ${60 + r() * 8} ${top - 4} Q ${58} ${top + 4} ${56} ${top + 8} Z`);
      features.push(`M${50 - size * 0.9} ${56} q -10 ${-4 - r() * 6} -12 ${6} q 6 2 12 2 Z`, `M${50 + size * 0.9} ${56} q 10 ${-4 - r() * 6} 12 ${6} q -6 2 -12 2 Z`);
    } else if (spirit.element === "grass") {
      const tilt = 6 + r() * 8;
      features.push(`M50 ${top + 6} C ${50 - tilt} ${top - 4}, ${50 - tilt - 10} ${top - 14}, ${50 - tilt - 14} ${top - 18} C ${50 - tilt + 2} ${top - 18}, ${50 - 2} ${top - 8}, 50 ${top + 6} Z`);
      features.push(`M50 ${top + 6} C ${50 + tilt} ${top - 6}, ${50 + tilt + 8} ${top - 12}, ${50 + tilt + 12} ${top - 20} C ${50 + tilt - 4} ${top - 18}, ${50 + 2} ${top - 10}, 50 ${top + 6} Z`);
    }
    return { pal, body, inner, eyeY, eyeDx, eyeStyle, mouthW, top, features, motif, embers };
  }, [spirit]);
  const { pal } = art;
  const gid = `g-${spirit.id}`;
  const eye = (cx: number) =>
    art.eyeStyle === 1 ? (
      <g key={cx}>
        <ellipse cx={cx} cy={art.eyeY} rx="2.8" ry="1.7" fill={pal.a} />
        <path d={`M${cx - 3.2} ${art.eyeY - 0.6} q 3.2 -2.4 6.4 0`} fill="none" stroke={pal.a} strokeWidth=".8" />
      </g>
    ) : (
      <g key={cx}>
        <ellipse cx={cx} cy={art.eyeY} rx={art.eyeStyle === 2 ? 4.2 : 2.6} ry={art.eyeStyle === 2 ? 4.6 : 3.2} fill={pal.a} />
        <circle cx={cx + 0.9} cy={art.eyeY - 1.2} r={art.eyeStyle === 2 ? 1.4 : 0.8} fill={pal.glow} />
      </g>
    );
  return (
    <svg viewBox="0 0 100 100" className="spirit-art" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor={pal.b} />
          <stop offset="1" stopColor={pal.a} />
        </radialGradient>
        <radialGradient id={`${gid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={pal.glow} stopOpacity=".55" />
          <stop offset="1" stopColor={pal.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      {spirit.element === "aether" &&
        [14, 24, 34, 44].map((rr) => <circle key={rr} cx="50" cy="52" r={rr} fill="none" stroke={pal.line} strokeOpacity=".16" strokeDasharray="1 3" />)}
      {art.motif.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={pal.line} strokeOpacity=".14" strokeWidth=".8" />
      ))}
      {spirit.element === "fire" &&
        art.embers.map(([x, y, s], i) => <circle key={i} cx={x} cy={y} r={s} fill={pal.line} opacity=".35" />)}
      <circle cx="50" cy="52" r="40" fill={`url(#${gid}-glow)`} />
      {spirit.element === "aether" && <ellipse cx="50" cy={art.top - 6} rx="13" ry="3.2" fill="none" stroke={pal.glow} strokeWidth="1.2" opacity=".85" />}
      {art.features.map((d, i) => <path key={i} d={d} fill={pal.line} opacity=".9" />)}
      <path d={art.body} fill={pal.body} />
      <path d={art.inner} fill={pal.glow} opacity=".2" />
      {art.eyeStyle === 2 ? eye(50) : [eye(50 - art.eyeDx), eye(50 + art.eyeDx)]}
      <path d={`M${50 - art.mouthW} ${art.eyeY + 7} q ${art.mouthW} ${2 + art.mouthW * 0.3} ${art.mouthW * 2} 0`} fill="none" stroke={pal.a} strokeWidth=".9" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export const ELEMENT_LABEL: Record<Element, string> = { water: "Water", fire: "Fire", grass: "Grass", aether: "Aether" };

export function SpiritCard({
  card,
  spiritId,
  size = "md",
  faceDown = false,
  onClick,
  selected = false,
}: {
  card?: CardInstance;
  spiritId?: string;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) {
  const spirit = byId(card?.spirit ?? spiritId!);
  const ref = useRef<HTMLDivElement>(null);
  const foil = card?.foil || spirit.rarity === "exalted";

  const onMove = (e: PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width;
    const y = (e.clientY - b.top) / b.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`spirit-card sc-${size} r-${spirit.rarity} e-${spirit.element} ${foil ? "is-foil" : ""} ${faceDown ? "is-down" : ""} ${selected ? "is-selected" : ""}`}
      onClick={onClick}
      type={onClick ? "button" : undefined}
      aria-label={faceDown ? "Unopened card" : `${spirit.name}, ${spirit.rarity}${card?.foil ? ", foil" : ""}`}
    >
      <div className="sc-inner" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="sc-front">
          <div className="sc-top">
            <span className="sc-name">{spirit.name}</span>
            <span className="sc-power num">{spirit.power}</span>
          </div>
          <div className="sc-window">
            <SpiritArt spirit={spirit} />
            {card?.laurel && <span className="sc-laurel">Laurel · {card.laurel.game}</span>}
          </div>
          {size !== "sm" && (
            <div className="sc-text">
              <p className="sc-move"><span className={`pip pip-${spirit.element}`} />{spirit.move}</p>
              {size === "lg" && <p className="sc-line">{spirit.line}</p>}
            </div>
          )}
          <div className="sc-foot num">
            <span>{String(spirit.no).padStart(2, "0")}/24</span>
            <span>{card ? `#${String(card.serial).padStart(4, "0")}` : ELEMENT_LABEL[spirit.element]}</span>
          </div>
          {foil && <div className="sc-holo" />}
        </div>
        <div className="sc-back" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="34%"><circle cx="16" cy="7" r="2.3" fill="currentColor" /><path d="M10.4 30.5c.3-6.6-.9-11.5-3.1-15.6-.9-1.7-.6-3.4.6-4 1.3-.7 2.6.3 3.3 1.7l1.6 3.3M21.6 30.5c-.3-6.6.9-11.5 3.1-15.6.9-1.7.6-3.4-.6-4-1.3-.7-2.6.3-3.3 1.7l-1.6 3.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </div>
      </div>
    </Tag>
  );
}
