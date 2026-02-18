/**
 * MCP Server — per-user tool provider via @hono/mcp
 *
 * Uses the Hono MCP adapter for clean Streamable HTTP transport.
 * Each user gets their own stateful MCP server (like the shopping cart pattern).
 *
 * Tools:
 * - send_message: Write a response to user outbox DS + ResponseStore
 * - get_conversation_history: Read from user inbox DS
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { z } from "zod/v3";
import { appendToUserOutbox } from "./ds.js";
import { buildResponseEvent } from "@skyclaw/schema";
import { getResponseStore } from "./shared.js";
import type { Context } from "hono";

/** Create an MCP server instance for a specific user */
function createMcpServer(userId: string): McpServer {
  const mcp = new McpServer({
    name: `skyclaw-${userId}`,
    version: "0.1.0",
  });

  // Tool: send_message — sprite sends a response back
  mcp.tool(
    "send_message",
    "Send a response message back to the user through the gateway",
    {
      content: z.string().describe("The response message content"),
    },
    async ({ content }) => {
      console.log(
        `[mcp] tool=send_message user=${userId} content="${content.slice(0, 80)}..."`,
      );
      const event = buildResponseEvent({
        userId,
        authorId: "sprite",
        content,
        channel: "http",
        channelId: null,
      });

      // Write to outbox DS (durable record)
      await appendToUserOutbox(userId, event);

      // Write to ResponseStore (immediate polling)
      const store = getResponseStore();
      store.push(userId, content);

      return {
        content: [{ type: "text", text: `Message sent: ${event.id}` }],
      };
    },
  );

  // Tool: get_conversation_history — sprite reads past messages
  mcp.tool(
    "get_conversation_history",
    "Get recent conversation messages from the user's inbox",
    {
      limit: z
        .number()
        .optional()
        .default(20)
        .describe("Maximum number of messages to return"),
    },
    async ({ limit }) => {
      console.log(
        `[mcp] tool=get_conversation_history user=${userId} limit=${limit}`,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              userId,
              messages: [],
              note: "Full history reading will be implemented with DS consumer",
            }),
          },
        ],
      };
    },
  );

  return mcp;
}

// Per-user MCP server + transport cache (stateful pattern)
const userMcp = new Map<
  string,
  { server: McpServer; transport: StreamableHTTPTransport }
>();

function getOrCreate(userId: string) {
  let entry = userMcp.get(userId);
  if (!entry) {
    const server = createMcpServer(userId);
    const transport = new StreamableHTTPTransport({
      sessionIdGenerator: () => userId,
    });
    entry = { server, transport };
    userMcp.set(userId, entry);
  }
  return entry;
}

/**
 * Handle an MCP request for a specific user.
 * Called from the Hono route handler.
 */
export async function handleMcpRequest(
  userId: string,
  c: Context,
): Promise<Response> {
  const { server, transport } = getOrCreate(userId);

  if (!server.isConnected()) {
    await server.connect(transport);
  }

  const res = await transport.handleRequest(c);
  if (!res) {
    return new Response("MCP transport returned no response", { status: 500 });
  }
  return res;
}
