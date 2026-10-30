import { describe, expect, it } from "vitest";
import { createLatencyGenerator } from "./latencySimulator";
import type { CallState } from "./callSimulator";

const PHASE_RANGES: Record<
  "connecting" | "listening" | "speaking" | "interrupted",
  { min: number; max: number }
> = {
  connecting: { min: 180, max: 260 },
  listening: { min: 320, max: 420 },
  speaking: { min: 380, max: 480 },
  interrupted: { min: 90, max: 150 },
};

const NON_ZERO_PHASES = Object.keys(PHASE_RANGES) as Array<
  keyof typeof PHASE_RANGES
>;

describe("createLatencyGenerator", () => {
  it("is deterministic: same seed + same call sequence => identical sequences", () => {
    const sequence: CallState[] = [
      "connecting",
      "listening",
      "listening",
      "speaking",
    ];

    const genA = createLatencyGenerator(42);
    const genB = createLatencyGenerator(42);

    const samplesA = sequence.map((phase) => genA.sample(phase));
    const samplesB = sequence.map((phase) => genB.sample(phase));

    expect(samplesA).toEqual(samplesB);
  });

  it("is deterministic across a longer, mixed sequence including idle/ended", () => {
    const sequence: CallState[] = [
      "idle",
      "connecting",
      "listening",
      "speaking",
      "interrupted",
      "listening",
      "speaking",
      "ended",
    ];

    const genA = createLatencyGenerator(7);
    const genB = createLatencyGenerator(7);

    const samplesA = sequence.map((phase) => genA.sample(phase));
    const samplesB = sequence.map((phase) => genB.sample(phase));

    expect(samplesA).toEqual(samplesB);
  });

  it("produces different sequences for different seeds", () => {
    const sequence: CallState[] = [
      "connecting",
      "listening",
      "listening",
      "speaking",
      "interrupted",
    ];

    const genA = createLatencyGenerator(1);
    const genB = createLatencyGenerator(2);

    const samplesA = sequence.map((phase) => genA.sample(phase));
    const samplesB = sequence.map((phase) => genB.sample(phase));

    expect(samplesA).not.toEqual(samplesB);
  });

  it('"idle" always returns {p50: 0, p95: 0}, regardless of how many times sampled', () => {
    const gen = createLatencyGenerator(99);
    for (let i = 0; i < 25; i++) {
      expect(gen.sample("idle")).toEqual({ p50: 0, p95: 0 });
    }
  });

  it('"ended" always returns {p50: 0, p95: 0}, regardless of how many times sampled', () => {
    const gen = createLatencyGenerator(123);
    for (let i = 0; i < 25; i++) {
      expect(gen.sample("ended")).toEqual({ p50: 0, p95: 0 });
    }
  });

  for (const phase of NON_ZERO_PHASES) {
    const { min, max } = PHASE_RANGES[phase];

    it(`"${phase}": sampling 50+ times keeps p50 in [${min}, ${max}], p95 > p50, varies across samples, and all values are non-negative integers`, () => {
      const gen = createLatencyGenerator(2024);
      const samples = Array.from({ length: 60 }, () => gen.sample(phase));

      for (const { p50, p95 } of samples) {
        expect(Number.isInteger(p50)).toBe(true);
        expect(Number.isInteger(p95)).toBe(true);
        expect(p50).toBeGreaterThanOrEqual(0);
        expect(p95).toBeGreaterThanOrEqual(0);

        expect(p50).toBeGreaterThanOrEqual(min);
        expect(p50).toBeLessThanOrEqual(max);

        expect(p95).toBeGreaterThan(p50);
      }

      const uniqueP50s = new Set(samples.map((s) => s.p50));
      expect(uniqueP50s.size).toBeGreaterThan(1);
    });
  }

  it("p95 >= p50 always, including for idle/ended where both are 0", () => {
    const gen = createLatencyGenerator(5);
    const allPhases: CallState[] = [
      "idle",
      "connecting",
      "listening",
      "speaking",
      "interrupted",
      "ended",
    ];

    for (let i = 0; i < 10; i++) {
      for (const phase of allPhases) {
        const { p50, p95 } = gen.sample(phase);
        expect(p95).toBeGreaterThanOrEqual(p50);
      }
    }
  });

  it("defaults to a fixed seed when none is provided, producing a deterministic sequence", () => {
    const genA = createLatencyGenerator();
    const genB = createLatencyGenerator();

    const sequence: CallState[] = ["connecting", "listening", "speaking"];
    const samplesA = sequence.map((phase) => genA.sample(phase));
    const samplesB = sequence.map((phase) => genB.sample(phase));

    expect(samplesA).toEqual(samplesB);
  });
});
