/**
 * @skyclaw/connections — Channel adapters
 */

export type {
  ChannelType,
  ChannelMessage,
  NormalizedMessage,
  ChannelResponse,
  ChannelAdapter,
} from "./types.js";

export { HTTPAdapter, ResponseStore, normalizeHttpMessage } from "./http.js";

// Effect schemas
export {
  ChannelType as ChannelTypeSchema,
  ChannelMessageSchema,
  NormalizedMessageSchema,
  ChannelResponseSchema,
} from "./schemas.js";

// Effect services
export { ResponseStoreService, ResponseStoreLive } from "./ResponseStoreService.js";
