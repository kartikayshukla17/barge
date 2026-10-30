import { JoinRoomResponseSchema, type JoinRoomResponse } from "@barge/shared";

/**
 * Thrown whenever `fetchRoomToken` cannot hand back a usable, validated
 * `JoinRoomResponse` — either the HTTP request itself failed (non-2xx) or
 * the agent's response body didn't match the shared contract.
 */
export class RoomTokenFetchError extends Error {}

/**
 * Requests a fresh LiveKit room token from the agent's `POST /rooms/join`
 * endpoint and validates the response against the shared Zod contract
 * before handing it back.
 */
export async function fetchRoomToken(agentBaseUrl: string): Promise<JoinRoomResponse> {
  const response = await fetch(`${agentBaseUrl}/rooms/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new RoomTokenFetchError(
      `Room token request failed with status ${response.status}`,
    );
  }

  const body = await response.json();
  const parsed = JoinRoomResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new RoomTokenFetchError(
      `Room token response failed validation: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
