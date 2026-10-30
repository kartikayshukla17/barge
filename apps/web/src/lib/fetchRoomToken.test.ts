import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRoomToken, RoomTokenFetchError } from "./fetchRoomToken";

const AGENT_BASE_URL = "http://localhost:8080";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchRoomToken", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the validated, typed JoinRoomResponse on a valid 2xx body", async () => {
    const validBody = {
      url: "wss://example.livekit.cloud",
      token: "a-token",
      roomName: "room-123",
      participantIdentity: "visitor-abc",
    };
    fetchMock.mockResolvedValue(jsonResponse(200, validBody));

    const result = await fetchRoomToken(AGENT_BASE_URL);

    expect(result).toEqual(validBody);
  });

  it("POSTs to the exact expected URL with an empty JSON body", async () => {
    const validBody = {
      url: "wss://example.livekit.cloud",
      token: "a-token",
      roomName: "room-123",
      participantIdentity: "visitor-abc",
    };
    fetchMock.mockResolvedValue(jsonResponse(200, validBody));

    await fetchRoomToken(AGENT_BASE_URL);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${AGENT_BASE_URL}/rooms/join`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it("throws RoomTokenFetchError with the status code on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: "boom" }));

    await expect(fetchRoomToken(AGENT_BASE_URL)).rejects.toThrow(RoomTokenFetchError);
    await expect(fetchRoomToken(AGENT_BASE_URL)).rejects.toThrow(/500/);
  });

  it("throws RoomTokenFetchError mentioning validation failure on a 2xx body missing a required field", async () => {
    const malformedBody = {
      url: "wss://example.livekit.cloud",
      token: "a-token",
      // roomName missing
      participantIdentity: "visitor-abc",
    };
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, malformedBody)));

    await expect(fetchRoomToken(AGENT_BASE_URL)).rejects.toThrow(RoomTokenFetchError);
    await expect(fetchRoomToken(AGENT_BASE_URL)).rejects.toThrow(/validation/i);
  });
});
