/**
 * Agent — process pending messages via oh-my-pi with MCP tools.
 *
 * Uses @skyclaw/agent to create oh-my-pi sessions that auto-discover
 * the gateway's MCP tools (send_message, get_conversation_history).
 */

import type { SkyEvent } from "@skyclaw/schema";
import type { HandlerConfig } from "./config.js";
import { processMessage, closeAllSessions } from "@skyclaw/agent";

/**
 * Process all pending messages through oh-my-pi.
 */
export async function processMessages(
  config: HandlerConfig,
  events: SkyEvent[],
): Promise<void> {
  if (events.length === 0) {
    console.log("[agent] no pending messages");
    return;
  }

  console.log(`[agent] processing ${events.length} message(s)`);

  const sessionOpts = {
    userId: config.userId,
    gatewayUrl: config.gatewayUrl,
    token: config.token,
  };

  for (const event of events) {
    console.log(
      `[agent] processing event ${event.id}: "${event.content.slice(0, 50)}..."`,
    );
    try {
      const response = await processMessage(sessionOpts, event.content);
      console.log(
        `[agent] processed event ${event.id}: "${response.slice(0, 80)}..."`,
      );
    } catch (error) {
      console.error(`[agent] failed to process event ${event.id}:`, error);
    }
  }

  await closeAllSessions();
}
