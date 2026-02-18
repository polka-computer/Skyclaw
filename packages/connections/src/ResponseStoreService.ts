/**
 * ResponseStoreService — Effect Context.Tag wrapper for ResponseStore.
 */

import { Context, Layer } from "effect";
import { ResponseStore } from "./http.js";

export class ResponseStoreService extends Context.Tag("ResponseStoreService")<
  ResponseStoreService,
  ResponseStore
>() {}

/** Default ResponseStore layer (in-memory). */
export const ResponseStoreLive = Layer.succeed(
  ResponseStoreService,
  new ResponseStore(),
);
