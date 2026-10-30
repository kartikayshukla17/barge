import { randomUUID } from "node:crypto";

export function generateEphemeralRoom(): {
  roomName: string;
  participantIdentity: string;
} {
  return {
    roomName: `room-${randomUUID()}`,
    participantIdentity: `visitor-${randomUUID()}`,
  };
}
