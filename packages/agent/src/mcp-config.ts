/**
 * MCP Config Writer — generates a temporary .mcp.json for oh-my-pi.
 *
 * oh-my-pi discovers MCP servers by reading .mcp.json from the working
 * directory. We write one that points at the gateway's per-user MCP endpoint.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SESSIONS_DIR } from "./paths.js";

/**
 * Write a .mcp.json file pointing at the gateway's MCP endpoint.
 * Returns the directory path (used as cwd for the oh-my-pi session).
 *
 * Config persists at ~/skyclaw/sessions/{userId}/ so it survives
 * sprite sleep/wake cycles.
 */
export function writeMcpConfig(
  userId: string,
  gatewayUrl: string,
  token?: string,
): string {
  const serverConfig: Record<string, unknown> = {
    url: `${gatewayUrl}/mcp/${userId}`,
  };

  if (token) {
    serverConfig.headers = { Authorization: `Bearer ${token}` };
  }

  const config = {
    mcpServers: {
      skyclaw: serverConfig,
    },
  };

  const dir = join(SESSIONS_DIR, userId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const configPath = join(dir, ".mcp.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`[agent] MCP config written to ${configPath}`);
  return dir;
}
