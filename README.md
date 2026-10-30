# Barge

Sub-second-latency voice-in/voice-out WebRTC demo agent.

## Monorepo layout

- `apps/web` — React Router v8 frontend (Vercel).
- `apps/agent` — Node backend agent runtime (Render). Stub until Slice 1.
- `packages/shared` — Shared types/Zod schemas. Stub until later slices.

## Status

- **Slice 0 (Mock UI):** done. Fully scripted client-side demo, no real
  mic/backend. See `apps/web`.
- **Slice 1+:** blocked on external provider credentials (LiveKit Cloud,
  Render, Deepgram, Groq, Cartesia/ElevenLabs, Upstash, Cloudflare
  Turnstile, Neon, AWS). Not started.

## Development

```bash
corepack enable
pnpm install
pnpm dev     # apps/web dev server
pnpm test    # run all tests
pnpm build   # build all apps
```
