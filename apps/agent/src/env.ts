export interface AgentEnv {
  port: number;
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
}

export class MissingEnvVarError extends Error {}

const REQUIRED_VARS = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] as const;

const DEFAULT_PORT = 8080;

function isPresent(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AgentEnv {
  const missing = REQUIRED_VARS.filter((key) => !isPresent(source[key]));
  if (missing.length > 0) {
    throw new MissingEnvVarError(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  const rawPort = source.PORT;
  let port = DEFAULT_PORT;
  if (isPresent(rawPort)) {
    if (!/^\d+$/.test(rawPort) || Number(rawPort) <= 0) {
      throw new MissingEnvVarError(
        `Invalid PORT: "${rawPort}" is not a valid positive integer`,
      );
    }
    port = Number(rawPort);
  }

  return {
    port,
    livekitUrl: source.LIVEKIT_URL as string,
    livekitApiKey: source.LIVEKIT_API_KEY as string,
    livekitApiSecret: source.LIVEKIT_API_SECRET as string,
  };
}
