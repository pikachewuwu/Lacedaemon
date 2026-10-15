import { useMemo, type ReactNode } from "react";
import { berlinNow } from "../app/time";

/**
 * The sky over Lacedaemon, coloured by the hour in Berlin. Two arms rise
 * from the bottom toward the light. The light is always the accent: at
 * noon it is the sun, at night it is a fire.
 */
const KEYS: [number, string, string][] = [
  [0, "#06070d", "#121626"],
  [5, "#0c0d1a", "#271d2e"],
  [7, "#2a2142", "#c47a52"],
  [9, "#1b3550", "#5f8fb4"],
  [16, "#1a3956", "#6b9cc0"],
  [18.5, "#2b2340", "#d07446"],
  [20.5, "#100f1d", "#3a2433"],
  [24, "#06070d", "#121626"],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};

export function skyAt(hour: number) {
  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1][0]) i++;
  const [h0, t0, b0] = KEYS[i];
  const [h1, t1, b1] = KEYS[i + 1];
  const t = (hour - h0) / (h1 - h0);
  return { top: mix(t0, t1, t), bottom: mix(b0, b1, t), night: hour < 6 || hour >= 20.5 };
}

export function SkyBand({ children, now }: { children: ReactNode; now: number }) {
  const b = berlinNow(new Date(now));
  const hour = b.hour + b.minute / 60;
  const sky = skyAt(hour);
  const stars = useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({ x: (i * 73.13) % 100, y: (i * 37.7) % 62, s: ((i * 7) % 3) * 0.4 + 0.5, o: ((i * 13) % 10) / 14 + 0.2 })),
    [],
  );
  return (
    <section className="sky" style={{ ["--sky-top" as string]: sky.top, ["--sky-bottom" as string]: sky.bottom }}>
      {sky.night && (
        <svg className="sky-stars" viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true">
          {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s * 0.12} fill="#f3e9dc" opacity={s.o} />)}
        </svg>
      )}
      <svg className="sky-offering" viewBox="0 0 400 440" aria-hidden="true">
        <defs>
          <radialGradient id="sky-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset=".18" stopColor="var(--accent)" />
            <stop offset=".42" stopColor="var(--accent)" stopOpacity=".32" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="sky-sun" cx="200" cy="104" r="120" fill="url(#sky-sun)" />
        <g className="sky-arms">
          <path d="M128 446 C 124 380 112 296 100 216 C 95 190 99 160 114 142 C 124 130 138 122 150 113" />
          <path d="M152 446 C 148 384 134 298 123 222 C 121 208 125 196 133 188 C 140 181 148 174 155 162" />
          <path className="fingers" d="M114 142 C 112 128 118 112 128 104 M122 135 C 124 120 132 108 142 104 M131 128 C 136 116 144 108 152 107" />
          <path d="M 272 446 C 276 380 288 296 300 216 C 305 190 301 160 286 142 C 276 130 262 122 250 113" />
          <path d="M 248 446 C 252 384 266 298 277 222 C 279 208 275 196 267 188 C 260 181 252 174 245 162" />
          <path className="fingers" d="M 286 142 C 288 128 282 112 272 104 M 278 135 C 276 120 268 108 258 104 M 269 128 C 264 116 256 108 248 107" />
        </g>
      </svg>
      <div className="sky-grain" aria-hidden="true" />
      <div className="sky-content">{children}</div>
    </section>
  );
}
