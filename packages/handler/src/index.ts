#!/usr/bin/env bun
/**
 * Skyclaw Handler — Sprite Entry Point
 *
 * Load config -> Read DS inbox -> Process messages via MCP -> Save offset -> Exit
 */

import { loadConfig } from "./config.js";
import { readPendingMessages, createOffsetStore } from "./ds-reader.js";
import { processMessages } from "./agent.js";
import { initSkyclawDirs } from "@skyclaw/agent";

async function main(): Promise<void> {
  console.log("[handler] starting...");

  // 0. Initialize ~/skyclaw/ directory structure (memory, sessions, data)
  initSkyclawDirs();

  // 1. Load config from SKYCLAW_TOKEN
  const config = await loadConfig();
  console.log(
    `[handler] userId=${config.userId} gateway=${config.gatewayUrl}`,
  );

  // 2. Create offset store for this user
  const offsetStore = createOffsetStore(config.userId);

  // 3. Read pending messages from inbox
  const { events } = await readPendingMessages(
    config.gatewayUrl,
    config.userId,
    offsetStore,
    config.token,
  );
  console.log(`[handler] found ${events.length} pending message(s)`);

  // 4. Process messages via agent + MCP
  await processMessages(config, events);

  // 5. Done (offset saved by ds-reader)
  console.log("[handler] done");
}

main().catch((error) => {
  console.error("[handler] fatal error:", error);
  process.exit(1);
});
