/**
 * `skyclaw-handler update` — sync built-in skills and list installed skills.
 */

import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { jsonOption } from "../options.js";
import {
  initSkyclawDirs,
  syncBuiltinSkills,
  loadSkills,
} from "@skyclaw/agent";
import { join } from "node:path";

const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "..", "templates");

const handler = (opts: { readonly json: boolean }) =>
  Effect.gen(function* () {
    initSkyclawDirs();
    syncBuiltinSkills(TEMPLATES_DIR);

    const skills = loadSkills();

    if (opts.json) {
      yield* Console.log(
        JSON.stringify(
          skills.map((s) => ({
            name: s.name,
            description: s.description,
            filePath: s.filePath,
          })),
          null,
          2,
        ),
      );
    } else {
      yield* Console.log(`Synced built-in skills. ${skills.length} skill(s) installed:\n`);
      for (const skill of skills) {
        yield* Console.log(`  ${skill.name} — ${skill.description || "(no description)"}`);
        yield* Console.log(`    ${skill.filePath}`);
      }
    }
  });

export const updateCommand = Command.make(
  "update",
  { json: jsonOption },
  handler,
).pipe(Command.withDescription("Sync built-in skills and list installed skills"));
