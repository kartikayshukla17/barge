import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HomeRoute } from "./home";
import { fetchRoomToken } from "../lib/fetchRoomToken";
import { createLiveKitRoomClient } from "../lib/liveKitRoomClient";

vi.mock("../lib/fetchRoomToken");
vi.mock("../lib/liveKitRoomClient");

const mockedFetchRoomToken = fetchRoomToken as unknown as ReturnType<typeof vi.fn>;
const mockedCreateLiveKitRoomClient = createLiveKitRoomClient as unknown as ReturnType<
  typeof vi.fn
>;

const VALID_JOIN_ROOM_RESPONSE = {
  url: "wss://example.livekit.cloud",
  token: "a-token",
  roomName: "room-1",
  participantIdentity: "visitor-1",
};

function makeFakeMicTrack(): MediaStreamTrack {
  return { kind: "audio", id: "fake-mic-track" } as unknown as MediaStreamTrack;
}

function makeFakeRoomClient() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    publishMicrophoneTrack: vi.fn().mockResolvedValue(undefined),
    onRemoteAudioTrack: vi.fn(),
    onConnectionStateChange: vi.fn(),
  };
}

function stubGetUserMedia(impl: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: impl },
    configurable: true,
  });
}

// jsdom doesn't implement WebRTC media APIs at all, so the global
// `MediaStream` constructor the component uses to wrap a remote audio
// track for `<audio>.srcObject` doesn't exist in the test environment.
// Stand in a minimal fake shaped like what the component actually does
// with it (hold the tracks it was given) — never a real browser API.
class FakeMediaStream {
  tracks: MediaStreamTrack[];
  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = tracks;
  }
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

// Fake timers replace setTimeout/setInterval but never touch the microtask
// queue, so chained `await`s inside handleStart (getUserMedia ->
// fetchRoomToken -> connect -> publishMicrophoneTrack) still need their
// promises drained before we can observe the scripted phase that follows.
// `advanceTimersByTimeAsync(0)` advances no simulated time but awaits a
// tick after each (zero) timer, which is enough to flush pending
// microtasks between each `await` in the real-connection sequence.
async function flushConnectionSteps() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("HomeRoute", () => {
  let fakeMicTrack: MediaStreamTrack;
  let fakeRoomClient: ReturnType<typeof makeFakeRoomClient>;
  let getUserMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("MediaStream", FakeMediaStream);

    fakeMicTrack = makeFakeMicTrack();
    getUserMediaMock = vi.fn().mockResolvedValue({
      getAudioTracks: () => [fakeMicTrack],
    });
    stubGetUserMedia(getUserMediaMock);

    fakeRoomClient = makeFakeRoomClient();
    mockedCreateLiveKitRoomClient.mockReturnValue(fakeRoomClient);
    mockedFetchRoomToken.mockResolvedValue(VALID_JOIN_ROOM_RESPONSE);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders CallControl and LatencyPanel together, starting idle at 0 ms", () => {
    render(<HomeRoute />);
    expect(screen.getByRole("button", { name: "Start Call" })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/idle/i);
    expect(document.body.textContent).toContain("0 ms");
  });

  it("requests mic access, fetches a token, connects, and publishes the mic track before the scripted phase progression begins (Slice 1: first real mic access in the project, replacing Slice 0's none-at-all)", async () => {
    render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));

    await flushConnectionSteps();

    expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true });
    expect(mockedFetchRoomToken).toHaveBeenCalledWith("http://localhost:8080");
    expect(fakeRoomClient.connect).toHaveBeenCalledWith(
      VALID_JOIN_ROOM_RESPONSE.url,
      VALID_JOIN_ROOM_RESPONSE.token,
    );
    expect(fakeRoomClient.publishMicrophoneTrack).toHaveBeenCalledWith(fakeMicTrack);

    // Only once the real connect steps resolve does the scripted phase
    // progression begin.
    expect(document.body.textContent).toMatch(/connecting/i);
  });

  it("walks the full DEFAULT_CALL_SCRIPT end to end and returns to an enabled Start Call button, gated behind the real connect steps", async () => {
    render(<HomeRoute />);

    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    await flushConnectionSteps();
    expect(document.body.textContent).toMatch(/connecting/i);

    advance(1200);
    expect(document.body.textContent).toMatch(/listening/i);

    // At some point during an active phase, latency numbers should be
    // non-zero (real-looking numbers appeared).
    expect(document.body.textContent).not.toMatch(/\b0 ms\b.*\b0 ms\b/);

    advance(2500);
    expect(document.body.textContent).toMatch(/speaking/i);

    advance(2200);
    expect(document.body.textContent).toMatch(/interrupted/i);

    advance(900);
    expect(document.body.textContent).toMatch(/listening/i);

    advance(2200);
    expect(document.body.textContent).toMatch(/speaking/i);

    advance(2000);
    expect(document.body.textContent).toMatch(/ended/i);

    const button = screen.getByRole("button", { name: "Start Call" });
    expect(button).toBeEnabled();
  });

  it("re-samples latency every 400ms during an active phase without crashing", async () => {
    render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    await flushConnectionSteps();
    expect(document.body.textContent).toMatch(/connecting/i);

    // Advance within the "connecting" phase (1200ms long) in 400ms ticks —
    // this should trigger the interval resample at least twice without
    // advancing past the phase boundary.
    advance(400);
    advance(400);
    expect(document.body.textContent).toMatch(/connecting/i);
  });

  it("clears the resample interval once phase returns to idle/ended and on unmount, leaving no leaked timers", async () => {
    const { unmount } = render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    await flushConnectionSteps();

    advance(1200 + 2500 + 2200 + 900 + 2200 + 2000);
    expect(document.body.textContent).toMatch(/ended/i);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears pending timers on unmount mid-call", async () => {
    const { unmount } = render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    await flushConnectionSteps();
    advance(400);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disconnects the LiveKit room client on unmount, not just the call simulator", async () => {
    const { unmount } = render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    await flushConnectionSteps();

    unmount();
    expect(fakeRoomClient.disconnect).toHaveBeenCalledTimes(1);
  });

  it("attaches the echoed remote audio track to the hidden audio element's srcObject", async () => {
    render(<HomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
    await flushConnectionSteps();

    expect(fakeRoomClient.onRemoteAudioTrack).toHaveBeenCalledTimes(1);
    const remoteAudioHandler = fakeRoomClient.onRemoteAudioTrack.mock.calls[0][0] as (
      track: MediaStreamTrack,
    ) => void;

    const remoteTrack = { kind: "audio", id: "remote-audio-track" } as unknown as MediaStreamTrack;
    act(() => {
      remoteAudioHandler(remoteTrack);
    });

    const audioElement = document.querySelector("audio");
    expect(audioElement).not.toBeNull();
    const srcObject = (audioElement as HTMLAudioElement).srcObject as unknown as {
      tracks?: MediaStreamTrack[];
    } | null;
    expect(srcObject).not.toBeNull();
    expect(srcObject?.tracks).toContain(remoteTrack);
  });

  describe("real connection failures", () => {
    it("shows a visible error and leaves Start Call enabled when mic permission is denied, without ever starting the scripted call", async () => {
      getUserMediaMock.mockRejectedValue(new Error("Permission denied"));

      render(<HomeRoute />);
      fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
      await flushConnectionSteps();

      expect(mockedFetchRoomToken).not.toHaveBeenCalled();
      expect(fakeRoomClient.connect).not.toHaveBeenCalled();

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toMatch(/permission denied/i);

      const button = screen.getByRole("button", { name: "Start Call" });
      expect(button).toBeEnabled();

      // The scripted flow never started: status stays out of the
      // scripted-phase vocabulary.
      expect(document.body.textContent).not.toMatch(/connecting|listening|speaking/i);
    });

    it("shows a visible error and leaves Start Call enabled when the token fetch fails, without ever starting the scripted call", async () => {
      mockedFetchRoomToken.mockRejectedValue(new Error("Room token request failed with status 500"));

      render(<HomeRoute />);
      fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
      await flushConnectionSteps();

      expect(fakeRoomClient.connect).not.toHaveBeenCalled();

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toMatch(/500/);

      const button = screen.getByRole("button", { name: "Start Call" });
      expect(button).toBeEnabled();
      expect(document.body.textContent).not.toMatch(/connecting|listening|speaking/i);
    });

    it("shows a visible error and leaves Start Call enabled when the LiveKit connect step fails, without ever starting the scripted call", async () => {
      fakeRoomClient.connect.mockRejectedValue(new Error("LiveKit connect failed"));

      render(<HomeRoute />);
      fireEvent.click(screen.getByRole("button", { name: "Start Call" }));
      await flushConnectionSteps();

      expect(fakeRoomClient.publishMicrophoneTrack).not.toHaveBeenCalled();

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toMatch(/livekit connect failed/i);

      const button = screen.getByRole("button", { name: "Start Call" });
      expect(button).toBeEnabled();
      expect(document.body.textContent).not.toMatch(/connecting|listening|speaking/i);
    });
  });
});
