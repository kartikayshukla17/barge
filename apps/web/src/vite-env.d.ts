/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public base URL of the deployed apps/agent service (Slice 1, #2
   * onward). Falls back to http://localhost:8080 when unset. */
  readonly VITE_AGENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
