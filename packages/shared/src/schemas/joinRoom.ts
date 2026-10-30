import { z } from "zod";

/**
 * Contract for `POST /rooms/join` on apps/agent: a visitor requests their
 * own private, ephemeral LiveKit room and gets back a token to connect
 * with. No request body fields are required — identity and room naming
 * are generated server-side (public, unauthenticated demo).
 */
export const JoinRoomRequestSchema = z.object({}).strict();
export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>;

export const JoinRoomResponseSchema = z
  .object({
    url: z.string().url(),
    token: z.string().min(1),
    roomName: z.string().min(1),
    participantIdentity: z.string().min(1),
  })
  .strict();
export type JoinRoomResponse = z.infer<typeof JoinRoomResponseSchema>;
