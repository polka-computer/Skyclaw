/**
 * Embedded Durable Streams Server
 *
 * Starts a DurableStreamTestServer with FileBackedStreamStore.
 * Stores stream data in data/streams/.
 */

import {
  DurableStreamTestServer,
  FileBackedStreamStore,
} from "@durable-streams/server";
import { STREAMS_DIR, DS_PORT } from "./config.js";

// ── Store + Server ──────────────────────────────────────────

const store = new FileBackedStreamStore({ dataDir: STREAMS_DIR });
const server = new DurableStreamTestServer({
  dataDir: STREAMS_DIR,
  port: DS_PORT,
  host: "127.0.0.1",
});

// ── Public API ──────────────────────────────────────────────

/** Start the embedded DS server on the configured port */
export async function startDSServer(): Promise<void> {
  const url = await server.start();
  console.log(`[ds] Durable Streams server listening at ${url}`);
}

/** Get the DS server base URL for internal appends */
export function getDSBaseUrl(): string {
  return `http://localhost:${DS_PORT}`;
}

