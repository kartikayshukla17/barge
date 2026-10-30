import { useEffect, useMemo, useRef, useState } from "react";
import "./home.css";
import { CallControl } from "../components/CallControl";
import { LatencyPanel } from "../components/LatencyPanel";
import {
  createCallSimulator,
  type CallState,
} from "../lib/callSimulator";
import { createLatencyGenerator, type LatencySample } from "../lib/latencySimulator";
import { fetchRoomToken } from "../lib/fetchRoomToken";
import { createLiveKitRoomClient, type LiveKitRoomClient } from "../lib/liveKitRoomClient";

const RESAMPLE_INTERVAL_MS = 400;

// Public base URL of the deployed apps/agent service (Slice 1, #2 onward).
// Vite only exposes VITE_-prefixed vars to the browser bundle; falls back
// to a local-dev default when unset, matching apps/web/.env.example.
const AGENT_BASE_URL = import.meta.env.VITE_AGENT_URL ?? "http://localhost:8080";

function describeConnectionFailure(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Failed to start call";
}

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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomClientRef = useRef<LiveKitRoomClient | null>(null);

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
      // On unmount, also disconnect the real LiveKit room client — not
      // just the scripted call simulator — so no connection is left
      // dangling after the component goes away.
      roomClientRef.current?.disconnect();
      roomClientRef.current = null;
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

  async function handleStart() {
    if (isConnecting) {
      // A connection attempt is already in flight — ignore extra clicks.
      return;
    }

    // Starting a fresh call clears any previous failure's error message.
    setConnectionError(null);
    setIsConnecting(true);

    try {
      // (a) Real microphone access — the first point in the whole project
      // that requests it; Slice 0 had none at all.
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const [micTrack] = micStream.getAudioTracks();

      // (b) Ask the agent for a fresh room token.
      const { url, token } = await fetchRoomToken(AGENT_BASE_URL);

      // (c) Connect to the real LiveKit room.
      const roomClient = createLiveKitRoomClient();
      roomClient.onRemoteAudioTrack((track) => {
        const audioElement = audioRef.current;
        if (audioElement) {
          audioElement.srcObject = new MediaStream([track]);
        }
      });
      await roomClient.connect(url, token);

      // (d) Publish the microphone track so the agent can echo it back.
      await roomClient.publishMicrophoneTrack(micTrack);

      roomClientRef.current = roomClient;
      setIsConnecting(false);

      // Only once connected successfully does the existing scripted demo
      // begin — everything from here on (listening/speaking/interrupted,
      // latency numbers) is still the Slice 0 scripted flow, per issue #2.
      simulator.start();
    } catch (error) {
      setIsConnecting(false);
      setConnectionError(describeConnectionFailure(error));
      // Deliberately do NOT fall back to the scripted demo here — a real
      // connection failure must surface as a failure, never be
      // misrepresented as a successful call.
    }
  }

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">Barge — live demo</h1>
      </header>
      <div className="home__panels">
        <CallControl phase={phase} onStart={handleStart} />
        <LatencyPanel p50={latency.p50} p95={latency.p95} />
      </div>
      {connectionError && (
        <p className="home__error" role="alert">
          {connectionError}
        </p>
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- echoed
          live audio has no captions to provide */}
      <audio ref={audioRef} autoPlay hidden />
    </div>
  );
}
