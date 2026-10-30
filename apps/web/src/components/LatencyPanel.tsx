import "./LatencyPanel.css";

export interface LatencyPanelProps {
  p50: number;
  p95: number;
}

export function LatencyPanel({ p50, p95 }: LatencyPanelProps) {
  return (
    <div className="latency-panel">
      <div className="latency-metric">
        <span className="latency-metric__label">P50</span>
        <span className="latency-metric__value">{p50} ms</span>
      </div>
      <div className="latency-metric">
        <span className="latency-metric__label">P95</span>
        <span className="latency-metric__value">{p95} ms</span>
      </div>
    </div>
  );
}
