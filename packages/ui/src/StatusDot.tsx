import "./StatusDot.css";

export type StatusTone = "ok" | "warn" | "bad" | "neutral";

export interface StatusDotProps {
  tone: StatusTone;
  /** Accessible label, e.g. "Connected" — the dot is otherwise decorative. */
  label?: string;
}

export function StatusDot({ tone, label }: StatusDotProps) {
  return (
    <span
      className={`status-dot status-dot--${tone}`}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}
