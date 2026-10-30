import { describe, expect, it } from "vitest";
import { loadEnv, MissingEnvVarError } from "./env";

const validSource = {
  LIVEKIT_URL: "wss://example.livekit.cloud",
  LIVEKIT_API_KEY: "test-api-key-id",
  LIVEKIT_API_SECRET: "test-api-secret-at-least-32-characters-long",
};

describe("loadEnv", () => {
  it("returns a correct AgentEnv when all required vars are present", () => {
    const env = loadEnv(validSource);
    expect(env).toEqual({
      port: 8080,
      livekitUrl: "wss://example.livekit.cloud",
      livekitApiKey: "test-api-key-id",
      livekitApiSecret: "test-api-secret-at-least-32-characters-long",
    });
  });

  it("defaults PORT to 8080 when omitted", () => {
    const env = loadEnv(validSource);
    expect(env.port).toBe(8080);
  });

  it("parses PORT when provided as a numeric string", () => {
    const env = loadEnv({ ...validSource, PORT: "3000" });
    expect(env.port).toBe(3000);
  });

  it("throws MissingEnvVarError when PORT is not a valid positive integer", () => {
    expect(() => loadEnv({ ...validSource, PORT: "not-a-number" })).toThrow();
  });

  it("throws MissingEnvVarError when PORT is zero or negative", () => {
    expect(() => loadEnv({ ...validSource, PORT: "0" })).toThrow();
    expect(() => loadEnv({ ...validSource, PORT: "-5" })).toThrow();
  });

  it("throws MissingEnvVarError naming LIVEKIT_URL when it is missing", () => {
    const { LIVEKIT_URL: _omit, ...rest } = validSource;
    try {
      loadEnv(rest);
      throw new Error("expected loadEnv to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      expect((err as Error).message).toContain("LIVEKIT_URL");
    }
  });

  it("throws MissingEnvVarError naming LIVEKIT_API_KEY when it is missing", () => {
    const { LIVEKIT_API_KEY: _omit, ...rest } = validSource;
    try {
      loadEnv(rest);
      throw new Error("expected loadEnv to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      expect((err as Error).message).toContain("LIVEKIT_API_KEY");
    }
  });

  it("throws MissingEnvVarError naming LIVEKIT_API_SECRET when it is missing", () => {
    const { LIVEKIT_API_SECRET: _omit, ...rest } = validSource;
    try {
      loadEnv(rest);
      throw new Error("expected loadEnv to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      expect((err as Error).message).toContain("LIVEKIT_API_SECRET");
    }
  });

  it("throws MissingEnvVarError naming all three when all are missing", () => {
    try {
      loadEnv({});
      throw new Error("expected loadEnv to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      const message = (err as Error).message;
      expect(message).toContain("LIVEKIT_URL");
      expect(message).toContain("LIVEKIT_API_KEY");
      expect(message).toContain("LIVEKIT_API_SECRET");
    }
  });

  it("treats empty-string required vars as missing", () => {
    try {
      loadEnv({ ...validSource, LIVEKIT_URL: "" });
      throw new Error("expected loadEnv to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvVarError);
      expect((err as Error).message).toContain("LIVEKIT_URL");
    }
  });
});
