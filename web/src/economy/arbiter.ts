import { activity, conviction, type ModuleProgram } from "./modules";

/**
 * The Arbiter (Module 0) splits each day's emission between modules.
 * The live version asks a pinned open-weights model. This file is the
 * deterministic fallback it must agree with on bounds, and the formula
 * that runs whenever the model fails or breaks a bound:
 *
 *   raw weight = sqrt(activity share) × sqrt(conviction share)
 *   then: cap each module at MAX_SHARE, redistribute the excess, normalise.
 */

export const MAX_SHARE = 0.5;
export const MIN_SHARE = 0.02;

export interface ArbiterRow {
  id: string;
  name: string;
  activity: number;
  conviction: number;
  weight: number;
  daemon: number;
}

export function fallbackWeights(modules: ModuleProgram[], emission: number): ArbiterRow[] {
  const acts = modules.map(activity);
  const convs = modules.map(conviction);
  const aSum = acts.reduce((a, b) => a + b, 0) || 1;
  const cSum = convs.reduce((a, b) => a + b, 0) || 1;
  let w = modules.map((_, i) => Math.sqrt(acts[i] / aSum) * Math.sqrt(convs[i] / cSum));
  w = bound(w);
  return modules.map((m, i) => ({
    id: m.id,
    name: m.name,
    activity: acts[i] / Math.max(...acts),
    conviction: convs[i] / Math.max(...convs),
    weight: w[i],
    daemon: Math.round(w[i] * emission * 100) / 100,
  }));
}

/** Normalise, then clamp to [MIN_SHARE, MAX_SHARE] while keeping the sum at 1. */
export function bound(weights: number[]): number[] {
  let w = normalise(weights);
  for (let pass = 0; pass < 20; pass++) {
    const fixed = w.map((x) => x > MAX_SHARE || x < MIN_SHARE);
    if (!fixed.some(Boolean)) break;
    const clamped = w.map((x) => Math.min(MAX_SHARE, Math.max(MIN_SHARE, x)));
    const fixedSum = clamped.reduce((s, x, i) => s + (fixed[i] ? x : 0), 0);
    const freeSum = w.reduce((s, x, i) => s + (fixed[i] ? 0 : x), 0);
    if (freeSum === 0) return normalise(clamped);
    w = clamped.map((x, i) => (fixed[i] ? x : (x / freeSum) * (1 - fixedSum)));
  }
  return w;
}

const normalise = (w: number[]) => {
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x) => x / s);
};
