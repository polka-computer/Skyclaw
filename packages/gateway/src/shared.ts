/**
 * Shared gateway state — singleton ResponseStore
 *
 * Used by both oRPC procedures and MCP server.
 */

import { ResponseStore } from "@skyclaw/connections";

let responseStore: ResponseStore | null = null;

export function getResponseStore(): ResponseStore {
  if (!responseStore) {
    responseStore = new ResponseStore();
  }
  return responseStore;
}
