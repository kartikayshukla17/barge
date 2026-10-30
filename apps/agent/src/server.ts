import express from "express";
import { JoinRoomRequestSchema, JoinRoomResponseSchema } from "@barge/shared";
import type { AgentEnv } from "./env";
import type { createRoomToken } from "./livekitToken";
import type { generateEphemeralRoom } from "./roomNaming";

export interface ServerDeps {
  env: AgentEnv;
  createRoomToken: typeof createRoomToken;
  generateEphemeralRoom: typeof generateEphemeralRoom;
  /** Called (fire-and-forget is fine — don't let its failure break the
   * visitor's response) after minting the visitor's token, to have the
   * agent's own echo participant join the same room. Injected so route
   * tests never trigger a real room connection. */
  joinEchoParticipant: (roomName: string) => Promise<void>;
}

export function createApp(deps: ServerDeps): express.Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.post("/rooms/join", (req, res) => {
    const parsedRequest = JoinRoomRequestSchema.safeParse(req.body ?? {});
    if (!parsedRequest.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { roomName, participantIdentity } = deps.generateEphemeralRoom();

    deps
      .createRoomToken({
        apiKey: deps.env.livekitApiKey,
        apiSecret: deps.env.livekitApiSecret,
        roomName,
        participantIdentity,
      })
      .then((token) => {
        // Fire-and-forget: the agent's own echo participant joins the same
        // room, but its failure must never block or fail the visitor's
        // response — this is the real network-touching operation, injected
        // so route tests exercise orchestration without a live connection.
        deps.joinEchoParticipant(roomName).catch((err: unknown) => {
          console.error("joinEchoParticipant failed", err);
        });

        const response = JoinRoomResponseSchema.parse({
          url: deps.env.livekitUrl,
          token,
          roomName,
          participantIdentity,
        });
        res.status(200).json(response);
      })
      .catch((err: unknown) => {
        console.error("token minting failed", err);
        res.status(500).json({ error: "Failed to mint room token" });
      });
  });

  return app;
}
