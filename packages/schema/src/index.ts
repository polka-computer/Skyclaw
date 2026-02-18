/**
 * @skyclaw/schema — Skyclaw shared types and schemas
 */

// Event schema + types
export { skyEventSchema, metaEntrySchema } from "./event.js";
export type { MetaEntry, SkyEvent } from "./event.js";

// Kind constants
export { KIND } from "./kinds.js";
export type { Kind } from "./kinds.js";

// Meta constants + utilities
export { META, getMeta, getMetaValue, getMetaValues, hasMeta } from "./meta.js";
export type { MetaKey } from "./meta.js";

// Auth types
export { tokenPayloadSchema } from "./auth.js";
export type { TokenPayload } from "./auth.js";

// DS URL helpers
export { dsStreamPath, DS_STREAMS } from "./ds-urls.js";

// Helper functions
export { generateId, nowMs, buildMessageEvent, buildResponseEvent } from "./helpers.js";

// Constants
export {
  DEFAULT_PORT,
  DEFAULT_DS_PORT,
  DEFAULT_GATEWAY_URL,
  DEFAULT_DS_URL,
} from "./constants.js";
