import { describe, expect, it } from "vitest";
import { generateEphemeralRoom } from "./roomNaming";

const URL_SAFE = /^[a-zA-Z0-9_-]+$/;

describe("generateEphemeralRoom", () => {
  it("returns a roomName and participantIdentity", () => {
    const { roomName, participantIdentity } = generateEphemeralRoom();
    expect(typeof roomName).toBe("string");
    expect(typeof participantIdentity).toBe("string");
    expect(roomName.length).toBeGreaterThan(0);
    expect(participantIdentity.length).toBeGreaterThan(0);
  });

  it("produces URL-safe roomName and participantIdentity", () => {
    const { roomName, participantIdentity } = generateEphemeralRoom();
    expect(roomName).toMatch(URL_SAFE);
    expect(participantIdentity).toMatch(URL_SAFE);
  });

  it("produces reasonably short/readable values with a prefix", () => {
    const { roomName, participantIdentity } = generateEphemeralRoom();
    expect(roomName.length).toBeLessThan(80);
    expect(participantIdentity.length).toBeLessThan(80);
    expect(roomName).toMatch(/^room-/);
    expect(participantIdentity).toMatch(/^visitor-/);
  });

  it("produces 100 distinct roomNames and 100 distinct participantIdentities across calls", () => {
    const roomNames = new Set<string>();
    const identities = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const { roomName, participantIdentity } = generateEphemeralRoom();
      roomNames.add(roomName);
      identities.add(participantIdentity);
    }
    expect(roomNames.size).toBe(100);
    expect(identities.size).toBe(100);
  });
});
