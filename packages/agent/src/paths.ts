/**
 * Skyclaw filesystem paths — shared layout for sprite environments.
 *
 * The handler calls initSkyclawDirs() at startup to ensure the directory
 * structure exists. All other modules reference these paths directly.
 *
 * Layout on sprite:
 *   ~/skyclaw/
 *   ├── memory/         # pi-memory-md persistent storage
 *   ├── sessions/       # MCP config (.mcp.json) per session
 *   └── data/           # DS offset files
 */

import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, existsSync } from "node:fs";

/** Base skyclaw directory — non-hidden, visible in home */
export const SKYCLAW_DIR = join(homedir(), "skyclaw");

/** pi-memory-md storage */
export const MEMORY_DIR = join(SKYCLAW_DIR, "memory");

/** MCP session configs */
export const SESSIONS_DIR = join(SKYCLAW_DIR, "sessions");

/** DS offset files */
export const DATA_DIR = join(SKYCLAW_DIR, "data");

/**
 * Initialize the skyclaw directory structure.
 * Called by the handler at startup before anything else.
 */
export function initSkyclawDirs(): void {
  for (const dir of [SKYCLAW_DIR, MEMORY_DIR, SESSIONS_DIR, DATA_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  console.log(`[skyclaw] dirs initialized at ${SKYCLAW_DIR}`);
}
