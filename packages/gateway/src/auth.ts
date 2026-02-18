/**
 * Gateway Auth — JWT token creation and verification
 *
 * Sprites receive a JWT with their userId and gateway URL.
 * Used for handler authentication back to the gateway.
 */

import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET, PORT } from "./config.js";
import type { TokenPayload } from "@skyclaw/schema";

const secret = new TextEncoder().encode(JWT_SECRET);
const ISSUER = "skyclaw-gateway";
const TOKEN_TTL = "24h";

/** Create a JWT for a sprite/handler */
export async function createToken(
  userId: string,
  gatewayUrl?: string,
): Promise<string> {
  const url = gatewayUrl ?? `http://localhost:${PORT}`;
  return new SignJWT({ userId, gatewayUrl: url })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);
}

/** Verify and decode a sprite token */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret, { issuer: ISSUER });
  return {
    userId: payload.userId as string,
    gatewayUrl: payload.gatewayUrl as string,
    exp: payload.exp as number,
  };
}
