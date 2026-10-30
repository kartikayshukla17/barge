import { describe, expect, it, vi } from "vitest";
import { createLiveKitRoomClient } from "./liveKitRoomClient";

/**
 * A minimal fake shaped like the slice of `livekit-client`'s `Room` this
 * adapter actually uses: `connect`/`disconnect`, an `on(event, handler)`
 * registration the test can trigger by calling the captured handler
 * directly, and `localParticipant.publishTrack`. This file never imports
 * or constructs a real `livekit-client` `Room`.
 */
function createFakeRoom() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};

  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler;
    }),
    localParticipant: {
      publishTrack: vi.fn().mockResolvedValue(undefined),
    },
    // Test-only helper to fire a previously-registered handler, standing in
    // for the real Room emitting an event.
    __emit(event: string, ...args: unknown[]) {
      handlers[event]?.(...args);
    },
    __handlers: handlers,
  };
}

function makeFakeAudioTrack(): MediaStreamTrack {
  return { kind: "audio", id: "fake-remote-audio-track" } as unknown as MediaStreamTrack;
}

describe("createLiveKitRoomClient", () => {
  it("calls the underlying room's connect with the exact url/token", async () => {
    const fakeRoom = createFakeRoom();
    const client = createLiveKitRoomClient({ createRoom: () => fakeRoom });

    await client.connect("wss://example.livekit.cloud", "a-token");

    expect(fakeRoom.connect).toHaveBeenCalledWith(
      "wss://example.livekit.cloud",
      "a-token",
    );
  });

  it("surfaces a connection-state event from the fake room through onConnectionStateChange, correctly mapped", () => {
    const fakeRoom = createFakeRoom();
    const client = createLiveKitRoomClient({ createRoom: () => fakeRoom });

    const handler = vi.fn();
    client.onConnectionStateChange(handler);

    fakeRoom.__emit("connectionStateChanged", "connected");
    expect(handler).toHaveBeenCalledWith("connected");

    fakeRoom.__emit("connectionStateChanged", "connecting");
    expect(handler).toHaveBeenCalledWith("connecting");

    fakeRoom.__emit("connectionStateChanged", "disconnected");
    expect(handler).toHaveBeenCalledWith("disconnected");
  });

  it("surfaces a track-subscribed audio track through onRemoteAudioTrack", () => {
    const fakeRoom = createFakeRoom();
    const client = createLiveKitRoomClient({ createRoom: () => fakeRoom });

    const handler = vi.fn();
    client.onRemoteAudioTrack(handler);

    const fakeTrack = makeFakeAudioTrack();
    const fakePublication = {};
    const fakeParticipant = {};
    fakeRoom.__emit(
      "trackSubscribed",
      { kind: "audio", mediaStreamTrack: fakeTrack },
      fakePublication,
      fakeParticipant,
    );

    expect(handler).toHaveBeenCalledWith(fakeTrack);
  });

  it("ignores a track-subscribed event for a non-audio track", () => {
    const fakeRoom = createFakeRoom();
    const client = createLiveKitRoomClient({ createRoom: () => fakeRoom });

    const handler = vi.fn();
    client.onRemoteAudioTrack(handler);

    fakeRoom.__emit(
      "trackSubscribed",
      { kind: "video", mediaStreamTrack: {} as MediaStreamTrack },
      {},
      {},
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it("publishMicrophoneTrack calls the underlying room's publish method with that track", async () => {
    const fakeRoom = createFakeRoom();
    const client = createLiveKitRoomClient({ createRoom: () => fakeRoom });

    const track = { id: "mic-track" } as unknown as MediaStreamTrack;
    await client.publishMicrophoneTrack(track);

    expect(fakeRoom.localParticipant.publishTrack).toHaveBeenCalledWith(track);
  });

  it("disconnect calls the underlying room's disconnect", async () => {
    const fakeRoom = createFakeRoom();
    const client = createLiveKitRoomClient({ createRoom: () => fakeRoom });

    await client.disconnect();

    expect(fakeRoom.disconnect).toHaveBeenCalledTimes(1);
  });
});
