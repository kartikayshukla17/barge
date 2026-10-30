import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { JoinRoomResponseSchema } from "@barge/shared";
import { createApp, type ServerDeps } from "./server";
import { createRoomToken } from "./livekitToken";
import { generateEphemeralRoom } from "./roomNaming";
import type { AgentEnv } from "./env";

const fakeEnv: AgentEnv = {
  port: 8080,
  livekitUrl: "wss://example.livekit.cloud",
  livekitApiKey: "test-api-key-id",
  livekitApiSecret: "test-api-secret-at-least-32-characters-long",
};

function buildDeps(
  overrides: Partial<ServerDeps> = {},
): ServerDeps {
  return {
    env: fakeEnv,
    createRoomToken,
    generateEphemeralRoom,
    joinEchoParticipant: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("createApp", () => {
  it("GET /health returns 200 with exact body", async () => {
    const app = createApp(buildDeps());
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("POST /rooms/join with empty body returns 200 with a response matching JoinRoomResponseSchema, and calls joinEchoParticipant once with the roomName", async () => {
    const joinEchoParticipant = vi.fn(async () => {});
    const deps = buildDeps({ joinEchoParticipant });
    const app = createApp(deps);

    const res = await request(app).post("/rooms/join").send({});

    expect(res.status).toBe(200);
    const parsed = JoinRoomResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    expect(res.body.url).toBe(fakeEnv.livekitUrl);
    expect(joinEchoParticipant).toHaveBeenCalledTimes(1);
    expect(joinEchoParticipant).toHaveBeenCalledWith(res.body.roomName);
  });

  it("POST /rooms/join with absent body (no content-type/body at all) returns 200", async () => {
    const app = createApp(buildDeps());
    const res = await request(app).post("/rooms/join");
    expect(res.status).toBe(200);
    expect(JoinRoomResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it("POST /rooms/join with a non-empty JSON body returns 400", async () => {
    const app = createApp(buildDeps());
    const res = await request(app)
      .post("/rooms/join")
      .send({ foo: "bar" });
    expect(res.status).toBe(400);
  });

  it("two consecutive POST /rooms/join calls produce two different roomNames", async () => {
    const app = createApp(buildDeps());
    const res1 = await request(app).post("/rooms/join").send({});
    const res2 = await request(app).post("/rooms/join").send({});
    expect(res1.body.roomName).not.toBe(res2.body.roomName);
  });

  it("joinEchoParticipant rejecting still results in a 200 response to the visitor", async () => {
    const joinEchoParticipant = vi.fn(async () => {
      throw new Error("network boom");
    });
    const deps = buildDeps({ joinEchoParticipant });
    const app = createApp(deps);

    const res = await request(app).post("/rooms/join").send({});

    expect(res.status).toBe(200);
    expect(JoinRoomResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it("responds 500 with a minimal error body if token minting throws", async () => {
    const throwingCreateRoomToken = vi.fn(async () => {
      throw new Error("signing exploded with sensitive internals");
    });
    const deps = buildDeps({
      createRoomToken: throwingCreateRoomToken as unknown as ServerDeps["createRoomToken"],
    });
    const app = createApp(deps);

    const res = await request(app).post("/rooms/join").send({});

    expect(res.status).toBe(500);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error).not.toContain("sensitive internals");
  });
});
