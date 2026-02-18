/**
 * Skyclaw Event Schema (Effect Schema)
 *
 * Universal event for all messages flowing through Durable Streams.
 * Adapted from Polka's event model for the Skyclaw mailbox architecture.
 */

import { Schema } from "effect";

/** A meta entry is an array of strings: [name, ...values] */
export const metaEntrySchema = Schema.mutable(Schema.Array(Schema.String));
export type MetaEntry = typeof metaEntrySchema.Type;

/**
 * SkyEvent — the single data type for all mailbox content.
 *
 * Flows through per-user inbox/outbox Durable Streams.
 */
export const skyEventSchema = Schema.Struct({
  /** Unique event ID (ULID) */
  id: Schema.String,
  /** Target user this event belongs to */
  userId: Schema.String,
  /** Author of this event (user ID, agent ID, "system") */
  authorId: Schema.String,
  /** Numeric kind (1=message, 2=response, 100=system) */
  kind: Schema.Int,
  /** Text content */
  content: Schema.String,
  /** Extensible metadata entries */
  meta: Schema.mutable(Schema.Array(metaEntrySchema)),
  /** Source channel type */
  channel: Schema.String,
  /** Platform-specific channel identifier */
  channelId: Schema.NullOr(Schema.String),
  /** Timestamp — unix ms */
  createdAt: Schema.Number,
});

export type SkyEvent = typeof skyEventSchema.Type;
