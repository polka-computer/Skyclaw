/**
 * @skyclaw/agent — oh-my-pi session management + MCP integration
 */

export {
  getOrCreateSession,
  processMessage,
  closeAllSessions,
  type SessionEntry,
  type CreateSessionOptions,
} from "./session.js";

export { getContextManager, ContextManager } from "./context.js";

export { buildSystemPrompt } from "./prompt.js";

export { writeMcpConfig } from "./mcp-config.js";

export { writeMemorySettings } from "./memory-config.js";

export {
  SKYCLAW_DIR,
  MEMORY_DIR,
  SESSIONS_DIR,
  DATA_DIR,
  SKILLS_DIR,
  initSkyclawDirs,
} from "./paths.js";

// Skills
export {
  loadSkills,
  initSkillsDir,
  syncBuiltinSkills,
  formatSkillsForPrompt,
  parseFrontmatter,
  type SkillDefinition,
} from "./skills.js";

// Effect services
export {
  SessionManagerService,
  SessionManagerLive,
  type SessionManagerApi,
} from "./SessionService.js";
