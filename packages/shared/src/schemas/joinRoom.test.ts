import { describe, expect, it } from "vitest";
import { JoinRoomResponseSchema } from "./joinRoom";

describe("JoinRoomResponseSchema", () => {
  const valid = {
    url: "wss://example.livekit.cloud",
    token: "signed.jwt.token",
    roomName: "visitor-abc123",
    participantIdentity: "visitor-abc123",
  };

  it("accepts a fully valid response", () => {
    expect(JoinRoomResponseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-URL `url`", () => {
    const result = JoinRoomResponseSchema.safeParse({
      ...valid,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty `token`", () => {
    const result = JoinRoomResponseSchema.safeParse({ ...valid, token: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty `roomName`", () => {
    const result = JoinRoomResponseSchema.safeParse({
      ...valid,
      roomName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty `participantIdentity`", () => {
    const result = JoinRoomResponseSchema.safeParse({
      ...valid,
      participantIdentity: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response missing a required field", () => {
    const { token: _omit, ...withoutToken } = valid;
    const result = JoinRoomResponseSchema.safeParse(withoutToken);
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown fields (strict contract)", () => {
    const result = JoinRoomResponseSchema.safeParse({
      ...valid,
      extra: "nope",
    });
    expect(result.success).toBe(false);
  });
});
