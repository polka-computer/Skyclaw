/**
 * Skyclaw Gateway — Hono + oRPC + MCP + Embedded DS
 *
 * Entry point for the gateway server. Serves:
 * - /api/rpc/*       -> oRPC procedures (messages, responses, health)
 * - /mcp/:userId     -> Per-user MCP server (Streamable HTTP)
 * - /ds/v1/stream/*  -> Proxied DS stream requests
 * - GET /api/health  -> Health check
 */

import { initDirectories, logPaths } from "./init.js";
import { PORT } from "./config.js";

initDirectories();
logPaths();

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { router } from "./router.js";
import { startDSServer, getDSBaseUrl } from "./ds-server.js";
import { handleMcpRequest } from "./mcp-server.js";
import { createToken } from "./auth.js";
import {
  spriteAuth,
  mcpUserId,
  dsUserId,
} from "./middleware/sprite-auth.js";

// ── App ─────────────────────────────────────────────────────

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

// ── Health ──────────────────────────────────────────────────

app.get("/api/health", (c) =>
  c.json({ ok: true, service: "skyclaw-gateway" }),
);

// ── oRPC Handler ────────────────────────────────────────────

const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error("[orpc] error:", error);
    }),
  ],
});

app.use("/api/rpc/*", async (c) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context: { headers: c.req.raw.headers },
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  return c.json({ error: "No procedure matched" }, 404);
});

// ── Sprite Auth ─────────────────────────────────────────────

app.use("/mcp/:userId", spriteAuth(mcpUserId));
app.use("/ds/v1/stream/user/*", spriteAuth(dsUserId));

// ── MCP Server (per-user) ───────────────────────────────────

app.all("/mcp/:userId", async (c) => {
  const userId = c.req.param("userId");
  // Let HTTPException propagate naturally for proper MCP error responses
  return await handleMcpRequest(userId, c);
});

// ── DS Stream Proxy ─────────────────────────────────────────

app.all("/ds/v1/stream/*", async (c) => {
  const url = new URL(c.req.url);
  const dsBase = getDSBaseUrl();
  const target = `${dsBase}${url.pathname.replace("/ds", "")}${url.search}`;

  const res = await fetch(target, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.method !== "GET" ? c.req.raw.body : undefined,
  });

  const headers = new Headers(res.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");

  return new Response(res.body, {
    status: res.status,
    headers,
  });
});

// ── Token Generation (dev helper) ───────────────────────────

app.get("/api/token/:userId", async (c) => {
  const userId = c.req.param("userId");
  const token = await createToken(userId);
  return c.json({ token, userId });
});

// ── Start ───────────────────────────────────────────────────

await startDSServer();

console.log(`[skyclaw] gateway starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
  idleTimeout: 120,
};

export { app };
export type { Router } from "./router.js";
