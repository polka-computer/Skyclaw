/**
 * Sprite Auth Middleware — verifies JWT on sprite-facing routes.
 *
 * Ensures sprites can only access their own resources:
 * - /mcp/:userId     — only the sprite with matching userId
 * - /ds/v1/stream/user/:userId/* — only the sprite with matching userId
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and checks the userId claim matches the URL.
 */

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verifyToken } from "../auth.js";

/**
 * Middleware that verifies a sprite's JWT and enforces userId isolation.
 *
 * The userId is extracted from the URL path using the provided function,
 * then compared against the userId in the JWT.
 */
export const spriteAuth = (extractUserId: (path: string) => string | null) =>
  createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing Bearer token" });
    }

    const token = authHeader.slice(7);

    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }

    // Extract the userId from the URL and enforce isolation
    const urlUserId = extractUserId(c.req.path);
    if (!urlUserId) {
      throw new HTTPException(400, {
        message: "Could not determine userId from path",
      });
    }

    if (payload.userId !== urlUserId) {
      throw new HTTPException(403, {
        message: "Token userId does not match requested resource",
      });
    }

    // Store on context for downstream handlers
    c.set("spriteUserId", payload.userId);
    await next();
  });

/** Extract userId from /mcp/:userId */
export function mcpUserId(path: string): string | null {
  const match = path.match(/^\/mcp\/([^/]+)/);
  return match?.[1] ?? null;
}

/** Extract userId from /ds/v1/stream/user/:userId/* */
export function dsUserId(path: string): string | null {
  const match = path.match(/^\/ds\/v1\/stream\/user\/([^/]+)/);
  return match?.[1] ?? null;
}
