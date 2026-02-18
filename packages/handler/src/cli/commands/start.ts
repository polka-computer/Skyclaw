/**
 * `skyclaw-handler start` — main handler flow.
 *
 * Init dirs → load config → sync built-in skills → load skills →
 * create offset store → read pending → process messages → done.
 */

import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { tokenOption } from "../options.js";
import { loadConfig } from "../../config.js";
import { readPendingMessages, createOffsetStore } from "../../ds-reader.js";
import { processMessages } from "../../agent.js";
import {
  initSkyclawDirs,
  syncBuiltinSkills,
  loadSkills,
} from "@skyclaw/agent";
import { join } from "node:path";

/** Resolve the templates directory relative to this package. */
const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "..", "templates");

const handler = () =>
  Effect.gen(function* () {
    yield* Console.log("[handler] starting...");

    // 0. Initialize ~/skyclaw/ directory structure
    initSkyclawDirs();

    // 1. Sync built-in skills from handler templates
    syncBuiltinSkills(TEMPLATES_DIR);

    // 2. Load skills (for logging only — session.ts loads them too)
    const skills = loadSkills();
    if (skills.length > 0) {
      yield* Console.log(
        `[handler] ${skills.length} skill(s) installed: ${skills.map((s) => s.name).join(", ")}`,
      );
    }

    // 3. Load config from SKYCLAW_TOKEN
    const config = yield* Effect.tryPromise({
      try: () => loadConfig(),
      catch: (cause) => new Error(`Config loading failed: ${cause}`),
    });
    yield* Console.log(
      `[handler] userId=${config.userId} gateway=${config.gatewayUrl}`,
    );

    // 4. Create offset store
    const offsetStore = createOffsetStore(config.userId);

    // 5. Read pending messages
    const { events } = yield* Effect.tryPromise({
      try: () =>
        readPendingMessages(
          config.gatewayUrl,
          config.userId,
          offsetStore,
          config.token,
        ),
      catch: (cause) => new Error(`DS read failed: ${cause}`),
    });
    yield* Console.log(`[handler] found ${events.length} pending message(s)`);

    // 6. Process messages via agent + MCP
    yield* Effect.tryPromise({
      try: () => processMessages(config, events),
      catch: (cause) => new Error(`Message processing failed: ${cause}`),
    });

    yield* Console.log("[handler] done");
  });

export const startCommand = Command.make(
  "start",
  { token: tokenOption },
  handler,
).pipe(Command.withDescription("Process pending messages from the DS inbox"));
