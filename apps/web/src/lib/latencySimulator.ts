/**
 * Scripted, fully client-side, FAKE latency number generator for the Slice 0
 * mock demo.
 *
 * This produces believable-looking p50/p95 latency numbers (milliseconds)
 * per call phase. It is cosmetic/scripted data only: no real measurement, no
 * network calls, no React. Determinism comes from a small seeded PRNG — no
 * `Math.random()` and no `Date.now()`-based entropy anywhere in this file.
 */

import type { CallState } from "./callSimulator";

export interface LatencySample {
  p50: number;
  p95: number;
}

export interface LatencyGenerator {
  /** Produce the next (deterministic, seed-derived) sample for this phase. */
  sample(phase: CallState): LatencySample;
}

const DEFAULT_SEED = 1337;

// Baseline p50 ranges per phase, modeling a sub-second voice pipeline round
// trip. "idle" and "ended" are intentionally absent here — they are handled
// as a fixed { p50: 0, p95: 0 } special case.
const PHASE_P50_RANGES: Record<
  "connecting" | "listening" | "speaking" | "interrupted",
  { min: number; max: number }
> = {
  connecting: { min: 180, max: 260 },
  listening: { min: 320, max: 420 },
  speaking: { min: 380, max: 480 },
  interrupted: { min: 90, max: 150 },
};

// Extra jitter added on top of p50 to derive p95, in milliseconds. Kept
// within the brief's "roughly 40-240ms extra" guidance.
const P95_EXTRA_MIN = 40;
const P95_EXTRA_MAX = 240;

/**
 * mulberry32: a small, fast, seedable PRNG. Returns a function producing
 * floats in [0, 1), deterministic for a given 32-bit integer seed.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear interpolation of `rand` (expected in [0, 1)) into [min, max]. */
function randInRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function createLatencyGenerator(
  seed: number = DEFAULT_SEED,
): LatencyGenerator {
  const rand = mulberry32(seed);

  function sample(phase: CallState): LatencySample {
    if (phase === "idle" || phase === "ended") {
      return { p50: 0, p95: 0 };
    }

    const range = PHASE_P50_RANGES[phase];
    const p50 = Math.round(randInRange(rand, range.min, range.max));
    const extra = randInRange(rand, P95_EXTRA_MIN, P95_EXTRA_MAX);
    const p95 = Math.round(p50 + extra);

    return { p50, p95 };
  }

  return { sample };
}
