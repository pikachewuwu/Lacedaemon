import { itemById } from "../games/minecraft/items";

/** Renders an 8×8 item sprite as crisp SVG pixels. */
export function ItemSprite({ id, size = 24 }: { id: string; size?: number }) {
  const item = itemById(id);
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-label={item.name} className="pixel">
      {item.sprite.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={item.palette[ch]} />)),
      )}
    </svg>
  );
}

/** A Minecraft-style head for a player name: a deterministic 8×8 face. */
export function McHead({ name, size = 28 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const skin = ["#c69c6d", "#e0b48a", "#8d5a3b", "#f1c9a5", "#a8754f"][h % 5];
  const hair = ["#3b2a1a", "#d9b25b", "#151012", "#7a3d1c", "#e6e1d8", "#2e3a63"][(h >> 3) % 6];
  const eye = ["#3a6fd8", "#2f8f4f", "#5b3a1f", "#222"][(h >> 6) % 4];
  const fringe = h & 1 ? "hssssssh" : "hhssssss";
  const rows = ["hhhhhhhh", "hhhhhhhh", fringe, "ssssssss", "swessews", "ssssssss", "ssmmmmss", "ssssssss"];
  const pal: Record<string, string> = { h: hair, s: skin, w: "#ffffff", e: eye, m: "#6b3b2a" };
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" className="pixel mc-head">
      {rows.flatMap((row, y) => [...row].map((ch, x) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={pal[ch] ?? skin} />))}
    </svg>
  );
}
