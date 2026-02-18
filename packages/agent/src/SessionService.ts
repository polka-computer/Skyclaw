/**
 * SessionManagerService — Effect Context.Tag wrapper for session management.
 *
 * Wraps the existing async session functions in Effect.tryPromise for
 * integration into Effect pipelines.
 */

import { Context, Effect, Layer } from "effect";
import {
  getOrCreateSession,
  processMessage,
  closeAllSessions,
  type CreateSessionOptions,
  type SessionEntry,
} from "./session.js";

export interface SessionManagerApi {
  getOrCreate(opts: CreateSessionOptions): Effect.Effect<SessionEntry, Error>;
  process(opts: CreateSessionOptions, content: string): Effect.Effect<string, Error>;
  closeAll: Effect.Effect<void, Error>;
}

export class SessionManagerService extends Context.Tag("SessionManagerService")<
  SessionManagerService,
  SessionManagerApi
>() {}

export const SessionManagerLive = Layer.succeed(SessionManagerService, {
  getOrCreate: (opts) =>
    Effect.tryPromise({
      try: () => getOrCreateSession(opts),
      catch: (cause) => new Error(`Session creation failed: ${cause}`),
    }),
  process: (opts, content) =>
    Effect.tryPromise({
      try: () => processMessage(opts, content),
      catch: (cause) => new Error(`Message processing failed: ${cause}`),
    }),
  closeAll: Effect.tryPromise({
    try: () => closeAllSessions(),
    catch: (cause) => new Error(`Session close failed: ${cause}`),
  }),
});
