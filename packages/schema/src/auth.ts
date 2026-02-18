/**
 * Skyclaw Auth Types
 *
 * JWT token payload schema for sprite authentication.
 * Sprites receive a token with their userId and gateway URL.
 */

import { Schema } from "effect";

/** JWT payload for sprite tokens */
export const tokenPayloadSchema = Schema.Struct({
  /** User/sprite this token grants access to */
  userId: Schema.String,
  /** Gateway URL to connect back to */
  gatewayUrl: Schema.String,
  /** Expiry timestamp (unix seconds) */
  exp: Schema.Number,
});

export type TokenPayload = typeof tokenPayloadSchema.Type;
