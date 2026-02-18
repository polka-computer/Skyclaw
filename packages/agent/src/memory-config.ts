/**
 * Memory Config — writes oh-my-pi extension settings for pi-memory-md.
 *
 * oh-my-pi reads extension config from ~/.omp/agent/settings.json.
 * We configure pi-memory-md to store memory at ~/skyclaw/memory/
 * which persists across sprite sleep/wake cycles.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { MEMORY_DIR } from "./paths.js";

const OMP_SETTINGS_DIR = join(homedir(), ".omp", "agent");
const OMP_SETTINGS_PATH = join(OMP_SETTINGS_DIR, "settings.json");

/**
 * Write oh-my-pi settings.json so pi-memory-md is auto-discovered.
 *
 * Config: enabled, message-append injection, no git sync.
 * Memory stored at ~/skyclaw/memory/ (persistent on sprites).
 */
export function writeMemorySettings(): void {
  const settings = {
    "pi-memory-md": {
      enabled: true,
      localPath: MEMORY_DIR,
      injection: "message-append",
      autoSync: { onSessionStart: false },
    },
  };

  if (!existsSync(OMP_SETTINGS_DIR)) {
    mkdirSync(OMP_SETTINGS_DIR, { recursive: true });
  }

  writeFileSync(OMP_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  console.log(`[agent] memory settings written to ${OMP_SETTINGS_PATH}`);
}
