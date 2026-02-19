/**
 * Sprite handler service helpers.
 *
 * writeEnvFile — execs a script to write env vars to the sprite filesystem.
 * buildServiceDefinition — returns a clean service definition that sources the env file.
 */

import type { SpritesClient } from "./client.js";
import type { PutServiceInput } from "./client.js";

const DEFAULT_ENV_PATH = "/home/sprite/.skyclaw/env.sh";

/** Write env vars to sprite filesystem via exec. */
export async function writeEnvFile(
  client: SpritesClient,
  spriteName: string,
  env: Record<string, string>,
  path: string = DEFAULT_ENV_PATH,
): Promise<void> {
  const lines = ["#!/usr/bin/env bash"];
  for (const [key, value] of Object.entries(env)) {
    // Escape single quotes in values: replace ' with '\''
    const escaped = value.replace(/'/g, "'\\''");
    lines.push(`export ${key}='${escaped}'`);
  }
  const content = lines.join("\n") + "\n";

  const dir = path.replace(/\/[^/]+$/, "");
  const script = `mkdir -p '${dir}' && cat > '${path}' << 'ENVEOF'\n${content}ENVEOF\nchmod 600 '${path}'`;
  const result = await client.exec(spriteName, ["bash", "-c", script]);
  if (result.exit_code !== 0) {
    throw new Error(
      `writeEnvFile failed (exit ${result.exit_code}): ${result.stderr.slice(0, 200)}`,
    );
  }
}

/** Build service definition — sources env file, runs handler. */
export function buildServiceDefinition(
  handlerCommand: string = "bunx @skyclaw/handler start",
  envPath: string = DEFAULT_ENV_PATH,
): PutServiceInput {
  return {
    cmd: "bash",
    args: ["-lc", `source ${envPath} && exec ${handlerCommand}`],
    needs: [],
  };
}
