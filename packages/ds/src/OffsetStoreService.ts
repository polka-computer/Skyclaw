/**
 * OffsetStoreService — Effect Context.Tag wrapper for OffsetStore.
 */

import { Context, Layer } from "effect";
import { FileOffsetStore, MemoryOffsetStore, type OffsetStore } from "./offset.js";

export class OffsetStoreService extends Context.Tag("OffsetStoreService")<
  OffsetStoreService,
  OffsetStore
>() {}

/** File-backed offset store layer. */
export const FileOffsetStoreLive = (filePath: string) =>
  Layer.succeed(OffsetStoreService, new FileOffsetStore(filePath));

/** In-memory offset store layer. */
export const MemoryOffsetStoreLive = Layer.succeed(
  OffsetStoreService,
  new MemoryOffsetStore(),
);
