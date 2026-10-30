import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCallSimulator,
  DEFAULT_CALL_SCRIPT,
  type CallScriptStep,
  type CallState,
} from "./callSimulator";

describe("createCallSimulator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call the callback until start() is invoked", () => {
    const cb = vi.fn();
    createCallSimulator(cb);
    expect(cb).not.toHaveBeenCalled();
  });

  it("fires the first step's state synchronously on start(), before any timer advances", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith("connecting");
  });

  it("fires each subsequent state in exact script order as time advances, using a custom script", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "listening", durationMs: 500 },
      { state: "speaking", durationMs: 300 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();

    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting"]);

    vi.advanceTimersByTime(1000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "listening"]);

    vi.advanceTimersByTime(500);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([
      "connecting",
      "listening",
      "speaking",
    ]);

    vi.advanceTimersByTime(300);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([
      "connecting",
      "listening",
      "speaking",
      "ended",
    ]);
  });

  it("observes the full DEFAULT_CALL_SCRIPT sequence end to end with a real, non-mocked simulator", () => {
    const observed: CallState[] = [];
    const sim = createCallSimulator((state) => observed.push(state));
    sim.start();

    for (const step of DEFAULT_CALL_SCRIPT) {
      vi.advanceTimersByTime(step.durationMs);
    }

    expect(observed).toEqual([
      "connecting",
      "listening",
      "speaking",
      "interrupted",
      "listening",
      "speaking",
      "ended",
    ]);
  });

  it("does not fire any more callbacks after the final step, even if time keeps advancing", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10_000);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("calling start() a second time mid-script does not reset progress or double-fire", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "listening", durationMs: 500 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting"]);

    // Calling start() again mid-script should be a no-op.
    sim.start();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting"]);

    vi.advanceTimersByTime(1000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "listening"]);

    // Still a no-op mid-script.
    sim.start();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "listening"]);

    vi.advanceTimersByTime(500);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([
      "connecting",
      "listening",
      "ended",
    ]);
  });

  it("calling start() again after the script fully completes restarts from the first step", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    vi.advanceTimersByTime(1000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "ended"]);

    sim.start();
    expect(cb.mock.calls.map((c) => c[0])).toEqual([
      "connecting",
      "ended",
      "connecting",
    ]);

    vi.advanceTimersByTime(1000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([
      "connecting",
      "ended",
      "connecting",
      "ended",
    ]);
  });

  it("stop() mid-script clears the pending timer and fires cb('idle') exactly once", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "listening", durationMs: 500 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    vi.advanceTimersByTime(1000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "listening"]);

    sim.stop();
    expect(cb.mock.calls.map((c) => c[0])).toEqual([
      "connecting",
      "listening",
      "idle",
    ]);

    // Advancing time after stop() should produce no further callbacks.
    vi.advanceTimersByTime(10_000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([
      "connecting",
      "listening",
      "idle",
    ]);
  });

  it("stop() called when never started does nothing", () => {
    const cb = vi.fn();
    const sim = createCallSimulator(cb);
    sim.stop();
    expect(cb).not.toHaveBeenCalled();
  });

  it("stop() called twice in a row only fires 'idle' once", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    sim.stop();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "idle"]);

    sim.stop();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "idle"]);
  });

  it("stop() after the script has already fully completed does not fire 'idle' again", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "connecting", durationMs: 1000 },
      { state: "ended", durationMs: 0 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    vi.advanceTimersByTime(1000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "ended"]);

    sim.stop();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["connecting", "ended"]);
  });

  it("honors a custom single-step script instead of the default", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [{ state: "speaking", durationMs: 50 }];
    const sim = createCallSimulator(cb, script);
    sim.start();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["speaking"]);

    vi.advanceTimersByTime(50);
    // No second step exists, so nothing further fires.
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["speaking"]);

    vi.advanceTimersByTime(10_000);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["speaking"]);
  });

  it("honors a custom two-step script that does not end in 'ended'", () => {
    const cb = vi.fn();
    const script: CallScriptStep[] = [
      { state: "listening", durationMs: 200 },
      { state: "speaking", durationMs: 300 },
    ];
    const sim = createCallSimulator(cb, script);
    sim.start();
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["listening"]);

    vi.advanceTimersByTime(200);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["listening", "speaking"]);

    vi.advanceTimersByTime(300);
    expect(cb.mock.calls.map((c) => c[0])).toEqual(["listening", "speaking"]);
  });
});
