/**
 * DSClientService — Effect Context.Tag wrapper for DSClient.
 */

import { Context, Layer } from "effect";
import { DSClient } from "./client.js";

export class DSClientService extends Context.Tag("DSClientService")<
  DSClientService,
  DSClient
>() {}

/** Create a DSClient layer from a base URL. */
export const DSClientLive = (baseUrl: string) =>
  Layer.succeed(DSClientService, new DSClient(baseUrl));
