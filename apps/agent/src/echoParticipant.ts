export interface RemoteTrackEvent {
  kind: "audio" | "video";
  track: unknown; // opaque — never inspect its internals in this file
  participantIdentity: string;
}

export interface RoomLike {
  connect(url: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  on(event: "trackSubscribed", handler: (e: RemoteTrackEvent) => void): void;
  localParticipant: {
    publishTrack(track: unknown): Promise<unknown>;
  };
}

export interface EchoParticipantDeps {
  /** Defaults, in production (src/index.ts only — never in this file's
   * own default export), to a real `@livekit/rtc-node` `Room` instance
   * adapted to this interface. This file itself must not import or
   * construct a real `Room` — it only depends on `RoomLike`, supplied by
   * the caller. */
  createRoom: () => RoomLike;
}

export class EchoParticipant {
  private deps: EchoParticipantDeps;
  private room: RoomLike | undefined;

  constructor(deps: EchoParticipantDeps) {
    this.deps = deps;
  }

  async join(url: string, token: string): Promise<void> {
    const room = this.deps.createRoom();
    room.on("trackSubscribed", (event) => {
      if (event.kind === "audio") {
        void room.localParticipant.publishTrack(event.track);
      }
    });
    await room.connect(url, token);
    this.room = room;
  }

  async leave(): Promise<void> {
    if (!this.room) {
      return;
    }
    await this.room.disconnect();
    this.room = undefined;
  }
}
