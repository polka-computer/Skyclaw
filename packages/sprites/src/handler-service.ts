/**
 * Sprite handler service helpers.
 *
 * writeBootFiles — single exec that writes env.sh + boot.sh to the sprite filesystem.
 * buildServiceDefinition — returns a clean service definition that sources the env file.
 */

import type { SpritesClient } from "./client.js";
import type { PutServiceInput } from "./client.js";

const DEFAULT_ENV_PATH = "/home/sprite/.skyclaw/env.sh";
const DEFAULT_BOOT_PATH = "/home/sprite/.skyclaw/boot.sh";

/**
 * Write env file + boot script to sprite filesystem in a single exec call.
 *
 * The boot script does a shallow clone/fetch+reset workflow that:
 * - Uses --depth 1 for fast clones and fetches
 * - Self-heals: if fetch fails, nukes and re-clones
 * - Uses fetch+reset instead of pull to handle force-pushes
 * - Fails loudly on errors (set -euo pipefail, no 2>/dev/null)
 */
export async function writeBootFiles(
  client: SpritesClient,
  spriteName: string,
  opts: {
    env: Record<string, string>;
    repoUrl: string;
    branch?: string;
  },
): Promise<void> {
  const { env, repoUrl, branch = "master" } = opts;

  // ── Build env.sh content ──────────────────────────────────
  const envLines = ["#!/usr/bin/env bash"];
  for (const [key, value] of Object.entries(env)) {
    const escaped = value.replace(/'/g, "'\\''");
    envLines.push(`export ${key}='${escaped}'`);
  }
  const envContent = envLines.join("\n") + "\n";

  // ── Build boot.sh content ─────────────────────────────────
  const bootContent = `#!/usr/bin/env bash
set -euo pipefail

R=/home/sprite/skyclaw
BRANCH=${branch}

if [ -d "$R/.git" ]; then
  git -C "$R" fetch --depth 1 origin "$BRANCH" 2>&1 || {
    echo "[boot] fetch failed, re-cloning" >&2
    rm -rf "$R"
  }
fi

if [ ! -d "$R/.git" ]; then
  git clone --depth 1 --branch "$BRANCH" ${repoUrl} "$R"
else
  git -C "$R" reset --hard "origin/$BRANCH"
fi

cd "$R"
bun install --frozen-lockfile
exec bun run packages/handler/src/cli/index.ts "$@"
`;

  // ── Single exec: write both files ─────────────────────────
  const dir = DEFAULT_ENV_PATH.replace(/\/[^/]+$/, "");
  const script = [
    `mkdir -p '${dir}'`,
    // Write env.sh
    `cat > '${DEFAULT_ENV_PATH}' << 'ENVEOF'\n${envContent}ENVEOF`,
    `chmod 600 '${DEFAULT_ENV_PATH}'`,
    // Write boot.sh
    `cat > '${DEFAULT_BOOT_PATH}' << 'BOOTEOF'\n${bootContent}BOOTEOF`,
    `chmod 755 '${DEFAULT_BOOT_PATH}'`,
  ].join("\n");

  const result = await client.exec(spriteName, ["bash", "-c", script]);
  if (result.exit_code !== 0) {
    throw new Error(
      `writeBootFiles failed (exit ${result.exit_code}): ${result.stderr.slice(0, 200)}`,
    );
  }
}

/** Build service definition — sources env file, runs handler. */
export function buildServiceDefinition(
  handlerCommand: string = "/home/sprite/.skyclaw/boot.sh start",
  envPath: string = DEFAULT_ENV_PATH,
): PutServiceInput {
  return {
    cmd: "bash",
    args: ["-lc", `source ${envPath} && exec ${handlerCommand}`],
    needs: [],
  };
}
