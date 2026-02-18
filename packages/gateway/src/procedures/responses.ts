/**
 * Responses Procedures — retrieve sprite responses
 *
 * Drains the in-memory ResponseStore for HTTP polling.
 */

import { Schema } from "effect";
import { publicBase } from "../orpc-context.js";
import { getResponseStore } from "../shared.js";

const GetInput = Schema.Struct({
  userId: Schema.String,
});

export const get = publicBase
  .input(Schema.standardSchemaV1(GetInput))
  .handler(async ({ input }) => {
    const store = getResponseStore();
    const responses = store.drain(input.userId);
    return { userId: input.userId, responses };
  });
