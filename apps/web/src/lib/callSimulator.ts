/**
 * Scripted, fully client-side, FAKE call-state state machine for the Slice 0
 * mock demo.
 *
 * This is pure simulation logic: no WebRTC, no `navigator.mediaDevices`, no
 * network calls, no React. It only uses `setTimeout`/`clearTimeout` to walk
 * through a scripted sequence of states and report them via a callback.
 */

export type CallState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "interrupted"
  | "ended";

export interface CallScriptStep {
  state: CallState;
  durationMs: number;
}

// The scripted sequence driving the demo. Order matters: issue #1 requires
// "connecting -> listening -> speaking -> interrupted" to be observable: a
// believable demo then recovers from the interruption and wraps up.
export const DEFAULT_CALL_SCRIPT: CallScriptStep[] = [
  { state: "connecting", durationMs: 1200 },
  { state: "listening", durationMs: 2500 },
  { state: "speaking", durationMs: 2200 },
  { state: "interrupted", durationMs: 900 },
  { state: "listening", durationMs: 2200 },
  { state: "speaking", durationMs: 2000 },
  { state: "ended", durationMs: 0 },
];

export interface CallSimulator {
  start(): void;
  stop(): void;
}

export function createCallSimulator(
  onStateChange: (state: CallState) => void,
  script: CallScriptStep[] = DEFAULT_CALL_SCRIPT,
): CallSimulator {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Whether a run is currently in progress (started, and not yet fully
  // completed or stopped).
  let active = false;
  let stepIndex = 0;

  function clearPendingTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNextStep(): void {
    // No further step to schedule — the script has fully completed.
    if (stepIndex >= script.length) {
      active = false;
      return;
    }

    const step = script[stepIndex];
    stepIndex += 1;

    if (stepIndex >= script.length) {
      // This was the last step: fire it, then stop scheduling entirely.
      onStateChange(step.state);
      active = false;
      return;
    }

    onStateChange(step.state);
    timer = setTimeout(() => {
      timer = null;
      scheduleNextStep();
    }, step.durationMs);
  }

  function start(): void {
    if (active) {
      // A run is already in progress — no-op.
      return;
    }

    active = true;
    stepIndex = 0;
    scheduleNextStep();
  }

  function stop(): void {
    const wasActive = active;
    clearPendingTimer();
    active = false;

    if (wasActive) {
      onStateChange("idle");
    }
  }

  return { start, stop };
}
