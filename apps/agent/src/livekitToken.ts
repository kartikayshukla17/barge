import { AccessToken } from "livekit-server-sdk";

export interface CreateRoomTokenParams {
  apiKey: string;
  apiSecret: string;
  roomName: string;
  participantIdentity: string;
  ttlSeconds?: number;
  canPublish?: boolean;
  canSubscribe?: boolean;
}

const DEFAULT_TTL_SECONDS = 600;

export async function createRoomToken(
  params: CreateRoomTokenParams,
): Promise<string> {
  const {
    apiKey,
    apiSecret,
    roomName,
    participantIdentity,
    ttlSeconds = DEFAULT_TTL_SECONDS,
    canPublish = true,
    canSubscribe = true,
  } = params;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    ttl: ttlSeconds,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe,
  });

  return token.toJwt();
}
