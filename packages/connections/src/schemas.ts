/**
 * Effect Schema definitions for connection types.
 *
 * These mirror the interfaces in types.ts but provide runtime validation.
 * The plain interfaces are kept for backwards compat (gateway uses them).
 */

import { Schema } from "effect";

export const ChannelType = Schema.Literal("http", "sms", "telegram", "discord");
export type ChannelType = typeof ChannelType.Type;

export const ChannelMessageSchema = Schema.Struct({
  userId: Schema.String,
  content: Schema.String,
  channel: ChannelType,
  channelId: Schema.NullOr(Schema.String),
  timestamp: Schema.optional(Schema.Number),
  files: Schema.optional(Schema.Array(Schema.String)),
});
export type ChannelMessage = typeof ChannelMessageSchema.Type;

export const NormalizedMessageSchema = Schema.Struct({
  userId: Schema.String,
  content: Schema.String,
  channel: ChannelType,
  channelId: Schema.NullOr(Schema.String),
  timestamp: Schema.Number,
});
export type NormalizedMessage = typeof NormalizedMessageSchema.Type;

export const ChannelResponseSchema = Schema.Struct({
  userId: Schema.String,
  content: Schema.String,
  channel: ChannelType,
  channelId: Schema.NullOr(Schema.String),
});
export type ChannelResponse = typeof ChannelResponseSchema.Type;
