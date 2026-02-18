/**
 * Initialization — Directory creation and startup logging
 */

import { mkdirSync, existsSync } from "node:fs";
import { paths } from "./config.js";

export function initDirectories(): void {
  const dirs = [
    { path: paths.root, name: "project root" },
    { path: paths.data, name: "data directory" },
    { path: paths.streams, name: "streams directory" },
  ];

  for (const { path, name } of dirs) {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
      console.log(`[init] created ${name}: ${path}`);
    }
  }
}

export function logPaths(): void {
  console.log("[config] paths:");
  for (const [key, value] of Object.entries(paths)) {
    console.log(`  ${key}: ${value}`);
  }
}
