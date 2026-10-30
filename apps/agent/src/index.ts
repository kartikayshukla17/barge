/**
 * Real composition root. This is the ONLY file in this app that imports or
 * constructs a real `@livekit/rtc-node` `Room` — everywhere else depends on
 * the injectable `RoomLike`/`ServerDeps` interfaces instead, so unit tests
 * never make a real network connection. Not unit-tested (pure
 * composition/startup); every piece it wires together already has its own
 * tests. If `loadEnv` throws (missing credentials), let it crash loudly on
 * startup — that's correct behavior.
 */
import {
  Room,
  RoomEvent,
  TrackKind,
  TrackPublishOptions,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "@livekit/rtc-node";
import { loadEnv } from "./env";
import { createRoomToken } from "./livekitToken";
import { generateEphemeralRoom } from "./roomNaming";
import {
  EchoParticipant,
  type RemoteTrackEvent,
  type RoomLike,
} from "./echoParticipant";
import { createApp } from "./server";

const env = loadEnv(process.env);

/** Adapts a real `@livekit/rtc-node` `Room` to the `RoomLike` interface that
 * `EchoParticipant` depends on. */
function adaptRealRoom(): RoomLike {
  const room = new Room();

  return {
    connect: (url, token) => room.connect(url, token),
    disconnect: () => room.disconnect(),
    on: (_event: "trackSubscribed", handler: (e: RemoteTrackEvent) => void) => {
      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _publication: RemoteTrackPublication,
          participant: RemoteParticipant,
        ) => {
          handler({
            kind: track.kind === TrackKind.KIND_AUDIO ? "audio" : "video",
            track,
            participantIdentity: participant.identity,
          });
        },
      );
    },
    get localParticipant() {
      if (!room.localParticipant) {
        throw new Error(
          "localParticipant is unavailable before connect() resolves",
        );
      }
      const localParticipant = room.localParticipant;
      return {
        publishTrack: (track: unknown) =>
          localParticipant.publishTrack(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            track as any,
            new TrackPublishOptions({}),
          ),
      };
    },
  };
}

async function joinEchoParticipant(roomName: string): Promise<void> {
  const agentIdentity = `agent-${roomName}`;
  const token = await createRoomToken({
    apiKey: env.livekitApiKey,
    apiSecret: env.livekitApiSecret,
    roomName,
    participantIdentity: agentIdentity,
  });
  const echo = new EchoParticipant({ createRoom: adaptRealRoom });
  await echo.join(env.livekitUrl, token);
}

const app = createApp({
  env,
  createRoomToken,
  generateEphemeralRoom,
  joinEchoParticipant,
});

app.listen(env.port, () => {
  console.log(`barge-agent listening on port ${env.port}`);
});
