/**
 * oRPC Router — all procedures organized by namespace
 */

import { send } from "./procedures/messages.js";
import { get as responsesGet } from "./procedures/responses.js";
import { health } from "./procedures/health.js";

export const router = {
  messages: {
    send,
  },
  responses: {
    get: responsesGet,
  },
  health,
};

export type Router = typeof router;
