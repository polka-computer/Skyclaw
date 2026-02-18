/**
 * Health check procedure
 */

import { publicBase } from "../orpc-context.js";

export const health = publicBase.handler(async () => {
  return { ok: true, service: "skyclaw-gateway" };
});
