#!/usr/bin/env bun
/**
 * Skyclaw Handler CLI — @effect/cli entry point.
 *
 * Usage:
 *   bunx @skyclaw/handler start          # Process pending messages
 *   bunx @skyclaw/handler update         # Sync skills
 *   bunx @skyclaw/handler status         # Show environment info
 *   bunx @skyclaw/handler --help         # Show help
 */

import { Command } from "@effect/cli";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Effect } from "effect";
import { startCommand } from "./commands/start.js";
import { updateCommand } from "./commands/update.js";
import { statusCommand } from "./commands/status.js";

const skyclawHandler = Command.make("skyclaw-handler").pipe(
  Command.withSubcommands([startCommand, updateCommand, statusCommand]),
  Command.withDescription("Skyclaw sprite handler — DS reader + agent with skills"),
);

const cli = Command.run(skyclawHandler, {
  name: "skyclaw-handler",
  version: "0.1.0",
});

BunRuntime.runMain(
  cli(process.argv).pipe(Effect.scoped, Effect.provide(BunContext.layer)),
);
