/**
 * Kottabos: flick the last drops of wine from your cup at a small bronze
 * disc balanced on a stand. Knock it down and it rings.
 *
 * The throw is two timed presses: power, then angle. Both meters swing back
 * and forth; you stop each one. The wine follows a ballistic arc.
 */

export const G = 9.8;
export const STAND = { x: 6.2, top: 2.1, disc: 0.32 };
export const CUP = { x: 0, y: 0.9 };

export interface Shot {
  power: number; // 0..1
  angle: number; // 0..1
}

const speedOf = (p: number) => 5.2 + p * 5.6; // m/s
const angleOf = (a: number) => (18 + a * 52) * (Math.PI / 180);

/** Position of the wine t seconds after release. */
export function pathAt(shot: Shot, t: number) {
  const v = speedOf(shot.power);
  const th = angleOf(shot.angle);
  return { x: CUP.x + v * Math.cos(th) * t, y: CUP.y + v * Math.sin(th) * t - (G * t * t) / 2 };
}

/** Where the arc crosses the stand, and whether that's on the disc. */
export function resolve(shot: Shot): { hit: boolean; miss: number; t: number } {
  const v = speedOf(shot.power);
  const th = angleOf(shot.angle);
  const t = (STAND.x - CUP.x) / (v * Math.cos(th));
  const y = CUP.y + v * Math.sin(th) * t - (G * t * t) / 2;
  const miss = y - STAND.top;
  return { hit: Math.abs(miss) <= STAND.disc && y > 0, miss, t };
}

/** A meter swinging 0→1→0 with the given period (ms). */
export const meter = (ms: number, period: number) => {
  const phase = (ms % period) / period;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
};
