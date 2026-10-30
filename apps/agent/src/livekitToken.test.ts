import { describe, expect, it } from "vitest";
import { createRoomToken } from "./livekitToken";

const apiKey = "test-api-key-id";
const apiSecret = "test-api-secret-at-least-32-characters-long";

/**
 * Decode a JWT's payload segment without any third-party JWT library —
 * manual, dependency-free base64url decode of the middle `.`-delimited
 * segment. This is test-only code exercising the real token produced by
 * the real `AccessToken` (livekit-server-sdk), so we need to read its
 * real claims, not assume them.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  expect(parts).toHaveLength(3);
  const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(payloadJson) as Record<string, unknown>;
}

describe("createRoomToken", () => {
  it("produces a real JWT (three dot-separated segments)", async () => {
    const token = await createRoomToken({
      apiKey,
      apiSecret,
      roomName: "room-abc",
      participantIdentity: "visitor-abc",
    });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("encodes the room name and participant identity in the claims", async () => {
    const token = await createRoomToken({
      apiKey,
      apiSecret,
      roomName: "room-xyz",
      participantIdentity: "visitor-xyz",
    });
    const payload = decodeJwtPayload(token);
    expect(payload.sub).toBe("visitor-xyz");
    expect((payload.video as Record<string, unknown>).room).toBe("room-xyz");
  });

  it("sets an expiry roughly ttlSeconds in the future when given explicitly", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createRoomToken({
      apiKey,
      apiSecret,
      roomName: "room-ttl",
      participantIdentity: "visitor-ttl",
      ttlSeconds: 120,
    });
    const payload = decodeJwtPayload(token);
    const exp = payload.exp as number;
    expect(exp).toBeGreaterThanOrEqual(before + 120 - 5);
    expect(exp).toBeLessThanOrEqual(before + 120 + 5);
  });

  it("defaults ttlSeconds to ~600s when omitted", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createRoomToken({
      apiKey,
      apiSecret,
      roomName: "room-default-ttl",
      participantIdentity: "visitor-default-ttl",
    });
    const payload = decodeJwtPayload(token);
    const exp = payload.exp as number;
    expect(exp).toBeGreaterThanOrEqual(before + 600 - 5);
    expect(exp).toBeLessThanOrEqual(before + 600 + 5);
  });

  it("defaults canPublish and canSubscribe to true when omitted", async () => {
    const token = await createRoomToken({
      apiKey,
      apiSecret,
      roomName: "room-default-grants",
      participantIdentity: "visitor-default-grants",
    });
    const payload = decodeJwtPayload(token);
    const video = payload.video as Record<string, unknown>;
    expect(video.canPublish).toBe(true);
    expect(video.canSubscribe).toBe(true);
    expect(video.roomJoin).toBe(true);
  });

  it("honors explicit canPublish: false / canSubscribe: false", async () => {
    const token = await createRoomToken({
      apiKey,
      apiSecret,
      roomName: "room-explicit-grants",
      participantIdentity: "visitor-explicit-grants",
      canPublish: false,
      canSubscribe: false,
    });
    const payload = decodeJwtPayload(token);
    const video = payload.video as Record<string, unknown>;
    expect(video.canPublish).toBe(false);
    expect(video.canSubscribe).toBe(false);
  });

  it("sets the issuer claim to the given apiKey", async () => {
    const token = await createRoomToken({
      apiKey,
      apiSecret,
      roomName: "room-iss",
      participantIdentity: "visitor-iss",
    });
    const payload = decodeJwtPayload(token);
    expect(payload.iss).toBe(apiKey);
  });
});
