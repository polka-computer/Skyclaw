/**
 * `skyclaw-handler status` — show environment and skill status.
 */

import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { existsSync } from "node:fs";
import { jsonOption } from "../options.js";
import {
  SKYCLAW_DIR,
  MEMORY_DIR,
  SESSIONS_DIR,
  DATA_DIR,
  SKILLS_DIR,
  loadSkills,
} from "@skyclaw/agent";

const handler = (opts: { readonly json: boolean }) =>
  Effect.gen(function* () {
    const tokenSet = !!process.env.SKYCLAW_TOKEN;
    const dirs = {
      skyclaw: { path: SKYCLAW_DIR, exists: existsSync(SKYCLAW_DIR) },
      memory: { path: MEMORY_DIR, exists: existsSync(MEMORY_DIR) },
      sessions: { path: SESSIONS_DIR, exists: existsSync(SESSIONS_DIR) },
      data: { path: DATA_DIR, exists: existsSync(DATA_DIR) },
      skills: { path: SKILLS_DIR, exists: existsSync(SKILLS_DIR) },
    };

    const skills = loadSkills();

    if (opts.json) {
      yield* Console.log(
        JSON.stringify(
          {
            tokenSet,
            directories: dirs,
            skills: skills.map((s) => ({
              name: s.name,
              description: s.description,
              filePath: s.filePath,
            })),
          },
          null,
          2,
        ),
      );
    } else {
      yield* Console.log("Skyclaw Handler Status\n");

      yield* Console.log(`Token: ${tokenSet ? "set (SKYCLAW_TOKEN)" : "NOT SET"}\n`);

      yield* Console.log("Directories:");
      for (const [name, info] of Object.entries(dirs)) {
        const mark = info.exists ? "+" : "-";
        yield* Console.log(`  [${mark}] ${name}: ${info.path}`);
      }

      yield* Console.log(`\nSkills (${skills.length}):`);
      if (skills.length === 0) {
        yield* Console.log("  (none — run 'skyclaw-handler update' to install)");
      } else {
        for (const skill of skills) {
          yield* Console.log(`  ${skill.name} — ${skill.description || "(no description)"}`);
        }
      }
    }
  });

export const statusCommand = Command.make(
  "status",
  { json: jsonOption },
  handler,
).pipe(Command.withDescription("Show directory paths, token status, and installed skills"));
