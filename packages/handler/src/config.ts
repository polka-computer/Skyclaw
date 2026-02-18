/**
 * Handler Configuration
 *
 * Reads SKYCLAW_TOKEN env var, decodes JWT to get userId and gatewayUrl.
 */

import { jwtVerify } from "jose";
import type { TokenPayload } from "@skyclaw/schema";

export interface HandlerConfig {
  userId: string;
  gatewayUrl: string;
  token: string;
}

/** Load handler config from SKYCLAW_TOKEN environment variable */
export async function loadConfig(): Promise<HandlerConfig> {
  const token = process.env.SKYCLAW_TOKEN;
  if (!token) {
    throw new Error(
      "SKYCLAW_TOKEN environment variable is required. " +
        "Generate one from the gateway: GET /api/token/:userId",
    );
  }

  // Decode JWT without verification for config extraction
  // (The gateway will verify the token on MCP connections)
  const jwtSecret = process.env.JWT_SECRET ?? "skyclaw-dev-secret";
  const secret = new TextEncoder().encode(jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "skyclaw-gateway",
    });

    return {
      userId: payload.userId as string,
      gatewayUrl: payload.gatewayUrl as string,
      token,
    };
  } catch (error) {
    throw new Error(`Invalid SKYCLAW_TOKEN: ${error}`);
  }
}
