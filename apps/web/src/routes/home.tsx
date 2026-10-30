import { useEffect, useMemo, useState } from "react";
import "./home.css";
import { CallControl } from "../components/CallControl";
import { LatencyPanel } from "../components/LatencyPanel";
import {
  createCallSimulator,
  type CallState,
} from "../lib/callSimulator";
import { createLatencyGenerator, type LatencySample } from "../lib/latencySimulator";

const RESAMPLE_INTERVAL_MS = 400;

function isActivePhase(phase: CallState): boolean {
  return (
    phase === "connecting" ||
    phase === "listening" ||
    phase === "speaking" ||
    phase === "interrupted"
  );
}

export function HomeRoute() {
  const [phase, setPhase] = useState<CallState>("idle");
  const [latency, setLatency] = useState<LatencySample>({ p50: 0, p95: 0 });

  const latencyGenerator = useMemo(() => createLatencyGenerator(), []);

  const simulator = useMemo(
    () =>
      createCallSimulator((nextPhase) => {
        setPhase(nextPhase);
        setLatency(latencyGenerator.sample(nextPhase));
      }),
    [latencyGenerator],
  );

  useEffect(() => {
    return () => {
      simulator.stop();
    };
  }, [simulator]);

  useEffect(() => {
    if (!isActivePhase(phase)) {
      return;
    }

    const interval = setInterval(() => {
      setLatency(latencyGenerator.sample(phase));
    }, RESAMPLE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [phase, latencyGenerator]);

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">Barge — live demo</h1>
      </header>
      <div className="home__panels">
        <CallControl phase={phase} onStart={() => simulator.start()} />
        <LatencyPanel p50={latency.p50} p95={latency.p95} />
      </div>
    </div>
  );
}
