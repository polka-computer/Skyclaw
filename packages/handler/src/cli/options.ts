/**
 * Shared CLI options for skyclaw-handler commands.
 */

import { Options } from "@effect/cli";

/** SKYCLAW_TOKEN — reads from --token flag or SKYCLAW_TOKEN env var. */
export const tokenOption = Options.text("token").pipe(
  Options.withDescription("Skyclaw JWT token (or set SKYCLAW_TOKEN env var)"),
  Options.optional,
);

/** --json flag for machine-readable output. */
export const jsonOption = Options.boolean("json").pipe(
  Options.withDefault(false),
  Options.withDescription("Output as JSON"),
);
