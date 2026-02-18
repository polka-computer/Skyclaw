/**
 * Messages Procedures — send messages into the system
 *
 * HTTP message in -> normalize -> SkyEvent -> write to user inbox DS
 */

import { Schema } from "effect";
import { publicBase } from "../orpc-context.js";
import { normalizeHttpMessage } from "@skyclaw/connections";
import { buildMessageEvent } from "@skyclaw/schema";
import { appendToUserInbox, ensureUserStreams } from "../ds.js";
import { wakeSpriteForUser, spritesEnabled } from "../sprite-wake.js";

const SendInput = Schema.Struct({
  userId: Schema.String,
  content: Schema.String,
});

export const send = publicBase
  .input(Schema.standardSchemaV1(SendInput))
  .handler(async ({ input }) => {
    // Normalize the HTTP input
    const normalized = normalizeHttpMessage({
      userId: input.userId,
      content: input.content,
    });

    // Build a SkyEvent
    const event = buildMessageEvent({
      userId: normalized.userId,
      authorId: normalized.userId, // User is the author of their own message
      content: normalized.content,
      channel: normalized.channel,
      channelId: normalized.channelId,
    });

    // Ensure streams exist and write to inbox
    await ensureUserStreams(normalized.userId);
    await appendToUserInbox(normalized.userId, event);

    // Wake sprite handler asynchronously (don't block API response).
    if (spritesEnabled()) {
      void wakeSpriteForUser(normalized.userId);
    }

    return { ok: true, eventId: event.id };
  });
