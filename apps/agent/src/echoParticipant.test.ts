import { describe, expect, it, vi } from "vitest";
import {
  EchoParticipant,
  type RemoteTrackEvent,
  type RoomLike,
} from "./echoParticipant";

/**
 * Tiny hand-rolled fake RoomLike with its own on/emit mechanism. No real
 * `@livekit/rtc-node` import here — this file never touches the network.
 */
class FakeRoom implements RoomLike {
  connect = vi.fn(async (_url: string, _token: string) => {});
  disconnect = vi.fn(async () => {});
  private handlers: Array<(e: RemoteTrackEvent) => void> = [];
  localParticipant = {
    publishTrack: vi.fn(async (_track: unknown) => undefined),
  };

  on(event: "trackSubscribed", handler: (e: RemoteTrackEvent) => void): void {
    expect(event).toBe("trackSubscribed");
    this.handlers.push(handler);
  }

  emit(e: RemoteTrackEvent): void {
    for (const handler of this.handlers) {
      handler(e);
    }
  }
}

describe("EchoParticipant", () => {
  it("join() creates a room via deps.createRoom() and calls connect with the exact url/token", async () => {
    const fakeRoom = new FakeRoom();
    const createRoom = vi.fn(() => fakeRoom);
    const echo = new EchoParticipant({ createRoom });

    await echo.join("wss://fake.example", "fake-token");

    expect(createRoom).toHaveBeenCalledTimes(1);
    expect(fakeRoom.connect).toHaveBeenCalledWith(
      "wss://fake.example",
      "fake-token",
    );
  });

  it("republishes an audio track unchanged on trackSubscribed", async () => {
    const fakeRoom = new FakeRoom();
    const createRoom = vi.fn(() => fakeRoom);
    const echo = new EchoParticipant({ createRoom });
    await echo.join("wss://fake.example", "fake-token");

    const track = { id: "the-exact-track" };
    fakeRoom.emit({
      kind: "audio",
      track,
      participantIdentity: "visitor-1",
    });

    expect(fakeRoom.localParticipant.publishTrack).toHaveBeenCalledTimes(1);
    expect(fakeRoom.localParticipant.publishTrack).toHaveBeenCalledWith(
      track,
    );
  });

  it("does not publish a video track", async () => {
    const fakeRoom = new FakeRoom();
    const createRoom = vi.fn(() => fakeRoom);
    const echo = new EchoParticipant({ createRoom });
    await echo.join("wss://fake.example", "fake-token");

    fakeRoom.emit({
      kind: "video",
      track: { id: "video-track" },
      participantIdentity: "visitor-1",
    });

    expect(fakeRoom.localParticipant.publishTrack).not.toHaveBeenCalled();
  });

  it("leave() calls disconnect() on the current room", async () => {
    const fakeRoom = new FakeRoom();
    const createRoom = vi.fn(() => fakeRoom);
    const echo = new EchoParticipant({ createRoom });
    await echo.join("wss://fake.example", "fake-token");

    await echo.leave();

    expect(fakeRoom.disconnect).toHaveBeenCalledTimes(1);
  });

  it("leave() before any join() is a safe no-op", async () => {
    const createRoom = vi.fn(() => new FakeRoom());
    const echo = new EchoParticipant({ createRoom });

    await expect(echo.leave()).resolves.toBeUndefined();
    expect(createRoom).not.toHaveBeenCalled();
  });
});
