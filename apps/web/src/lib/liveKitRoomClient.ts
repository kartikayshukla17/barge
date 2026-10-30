import { Room, RoomEvent, Track } from "livekit-client";
import type { RemoteTrack } from "livekit-client";

/**
 * Our own small connection-state vocabulary, decoupled from
 * `livekit-client`'s `ConnectionState` enum so the rest of the app never
 * has to depend on the SDK's exact shape. `"failed"` has no 1:1 SDK
 * equivalent — it's reserved for callers to report a connect() rejection;
 * the SDK's own states map onto the other three.
 */
export type ConnectionState = "connecting" | "connected" | "disconnected" | "failed";

export interface LiveKitRoomClient {
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  /** Attach the given HTMLAudioElement to play whatever remote audio
   * track arrives (the echoed audio in Slice 1). */
  onRemoteAudioTrack(handler: (track: MediaStreamTrack) => void): void;
  onConnectionStateChange(handler: (state: ConnectionState) => void): void;
  /** Publish the given local microphone track so the agent can echo it. */
  publishMicrophoneTrack(track: MediaStreamTrack): Promise<void>;
}

/**
 * The slice of `livekit-client`'s `Room` (or a test fake shaped like it)
 * that this adapter actually calls. Keeping this narrow — rather than
 * typing against the real `Room` class directly — is what lets tests
 * supply a plain object instead of a real SDK instance.
 */
export interface RoomLike {
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  on(event: string, handler: (...args: never[]) => void): unknown;
  localParticipant: {
    publishTrack(track: MediaStreamTrack): Promise<unknown>;
  };
}

export interface CreateLiveKitRoomClientDeps {
  /** Defaults to a real `livekit-client` `Room` instance adapted to this
   * interface — tests always override this with a fake. */
  createRoom?: () => unknown;
}

function createRealRoom(): RoomLike {
  return new Room() as unknown as RoomLike;
}

/** Maps a raw connection-state string (as emitted by a real or fake Room)
 * onto our own `ConnectionState` vocabulary. */
function mapConnectionState(state: string): ConnectionState {
  switch (state) {
    case "connected":
      return "connected";
    case "connecting":
    case "reconnecting":
    case "signalReconnecting":
      return "connecting";
    case "disconnected":
      return "disconnected";
    default:
      return "failed";
  }
}

export function createLiveKitRoomClient(
  deps: CreateLiveKitRoomClientDeps = {},
): LiveKitRoomClient {
  const createRoom = deps.createRoom ?? createRealRoom;
  const room = createRoom() as RoomLike;

  let connectionStateHandler: ((state: ConnectionState) => void) | undefined;
  let remoteAudioTrackHandler: ((track: MediaStreamTrack) => void) | undefined;

  room.on(RoomEvent.ConnectionStateChanged, ((state: string) => {
    connectionStateHandler?.(mapConnectionState(state));
  }) as never);

  room.on(RoomEvent.TrackSubscribed, ((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Audio) {
      remoteAudioTrackHandler?.(track.mediaStreamTrack);
    }
  }) as never);

  return {
    connect(url: string, token: string) {
      return room.connect(url, token);
    },
    disconnect() {
      return room.disconnect();
    },
    onRemoteAudioTrack(handler) {
      remoteAudioTrackHandler = handler;
    },
    onConnectionStateChange(handler) {
      connectionStateHandler = handler;
    },
    async publishMicrophoneTrack(track: MediaStreamTrack) {
      await room.localParticipant.publishTrack(track);
    },
  };
}
