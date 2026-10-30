import "./CallControl.css";
import type { CallState } from "../lib/callSimulator";

export interface CallControlProps {
  phase: CallState;
  onStart: () => void;
}

const STATUS_TEXT: Record<CallState, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  listening: "Listening…",
  speaking: "Speaking…",
  interrupted: "Interrupted",
  ended: "Ended",
};

function isCallActive(phase: CallState): boolean {
  return (
    phase === "connecting" ||
    phase === "listening" ||
    phase === "speaking" ||
    phase === "interrupted"
  );
}

export function CallControl({ phase, onStart }: CallControlProps) {
  const active = isCallActive(phase);

  return (
    <div className="call-control">
      <div className="call-control__row">
        <span className="call-control__mic" aria-hidden="true">
          🎙️
        </span>
        <span className="call-control__status">Status: {STATUS_TEXT[phase]}</span>
      </div>
      <button
        type="button"
        className="call-control__button"
        disabled={active}
        onClick={onStart}
      >
        {active ? "Call in progress…" : "Start Call"}
      </button>
    </div>
  );
}
