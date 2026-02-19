/**
 * oh-my-pi Session Management — per-user isolated agent sessions.
 *
 * Each user gets a cached session backed by oh-my-pi with MCP pointing
 * at the Skyclaw gateway. The gateway's MCP server exposes send_message
 * and get_conversation_history tools that the agent discovers automatically.
 */

import {
  createAgentSession,
  type CreateAgentSessionResult,
  type MCPManager,
} from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import type {
  AgentSession,
  AgentSessionEvent,
} from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { getContextManager } from "./context.js";
import { buildSystemPrompt } from "./prompt.js";
import { writeMcpConfig } from "./mcp-config.js";
import { writeMemorySettings } from "./memory-config.js";
import { loadSkills } from "./skills.js";

export interface SessionEntry {
  session: AgentSession;
  mcpManager?: MCPManager;
}

/** Cached per-user sessions */
const sessions = new Map<string, SessionEntry>();

export interface CreateSessionOptions {
  userId: string;
  gatewayUrl: string;
  token?: string;
}

/**
 * Get or create an oh-my-pi session for a user.
 *
 * The session auto-discovers MCP tools from the gateway via the
 * temporary .mcp.json config written to the session's cwd.
 */
export async function getOrCreateSession(
  opts: CreateSessionOptions,
): Promise<SessionEntry> {
  const existing = sessions.get(opts.userId);
  if (existing) return existing;

  console.log(`[agent] creating oh-my-pi session for ${opts.userId}`);

  // Write pi-memory-md extension settings so oh-my-pi auto-discovers it
  writeMemorySettings();

  // Write MCP config so oh-my-pi discovers gateway tools
  const mcpDir = writeMcpConfig(opts.userId, opts.gatewayUrl, opts.token);

  // Load skills for system prompt
  const skills = loadSkills();
  if (skills.length > 0) {
    console.log(`[agent] loaded ${skills.length} skill(s): ${skills.map((s) => s.name).join(", ")}`);
  }

  const systemPrompt = buildSystemPrompt(opts.userId, skills);
  const modelPattern = process.env.SKYCLAW_AGENT_MODEL?.trim();
  if (modelPattern) {
    console.log(`[agent] model pattern: ${modelPattern}`);
  }

  const result: CreateAgentSessionResult = await createAgentSession({
    cwd: mcpDir,
    sessionManager: SessionManager.inMemory(),
    enableMCP: true,
    enableLsp: false,
    systemPrompt,
    ...(modelPattern ? { modelPattern } : {}),
    hasUI: false,
    // Don't give it filesystem tools — it talks to the world through MCP
    toolNames: [],
  });

  const entry: SessionEntry = {
    session: result.session,
    mcpManager: result.mcpManager,
  };

  sessions.set(opts.userId, entry);
  console.log(`[agent] session ready for ${opts.userId}`);
  return entry;
}

/**
 * Process a user message through the oh-my-pi agent.
 *
 * The agent uses MCP tools (send_message, get_conversation_history) to
 * communicate responses back through the gateway.
 */
export async function processMessage(
  opts: CreateSessionOptions,
  messageContent: string,
): Promise<string> {
  const { session } = await getOrCreateSession(opts);
  const context = getContextManager();

  // Build prompt with conversation context
  const conversationContext = context.formatHistory(opts.userId);
  let fullPrompt = messageContent;
  if (conversationContext) {
    fullPrompt = `${conversationContext}\n\n---\n\nNew message: ${messageContent}`;
  }

  // Collect response text from the agent's event stream
  let response = "";
  const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
    if (
      event.type === "message_update" &&
      "assistantMessageEvent" in event &&
      (event as any).assistantMessageEvent?.type === "text_delta"
    ) {
      response += (event as any).assistantMessageEvent.delta ?? "";
    }

    // Log MCP tool calls and results
    if (event.type === "tool_execution_start") {
      const e = event as any;
      console.log(
        `[mcp:sprite] -> ${e.toolName}(${JSON.stringify(e.args).slice(0, 120)})`,
      );
    }
    if (event.type === "tool_execution_end") {
      const e = event as any;
      const result = JSON.stringify(e.result).slice(0, 120);
      console.log(
        `[mcp:sprite] <- ${e.toolName} ${e.isError ? "ERROR " : ""}${result}`,
      );
    }
  });

  try {
    await session.prompt(fullPrompt);
  } finally {
    unsubscribe();
  }

  // Save to conversation context
  const trimmed = response || "(no text response)";
  context.addTurn(opts.userId, messageContent, trimmed);

  return trimmed;
}

/** Close all cached sessions */
export async function closeAllSessions(): Promise<void> {
  for (const [userId, entry] of sessions) {
    console.log(`[agent] closing session for ${userId}`);
    if (entry.mcpManager) {
      await entry.mcpManager.disconnectAll();
    }
  }
  sessions.clear();
}
