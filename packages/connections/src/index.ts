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
