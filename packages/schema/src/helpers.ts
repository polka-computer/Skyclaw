/**
 * Skyclaw Helpers
 *
 * Convenience functions for creating events and IDs.
 */

import { ulid } from "ulid";
import type { SkyEvent, MetaEntry } from "./event.js";
import { KIND } from "./kinds.js";

/** Generate a ULID */
export function generateId(): string {
  return ulid();
}

/** Current time in unix ms */
export function nowMs(): number {
  return Date.now();
}

/** Build a SkyEvent for an incoming user message */
export function buildMessageEvent(params: {
  userId: string;
  authorId: string;
  content: string;
  channel: string;
  channelId: string | null;
  meta?: MetaEntry[];
}): SkyEvent {
  return {
    id: generateId(),
    userId: params.userId,
    authorId: params.authorId,
    kind: KIND.MESSAGE,
    content: params.content,
    meta: params.meta ?? [],
    channel: params.channel,
    channelId: params.channelId,
    createdAt: nowMs(),
  };
}

/** Build a SkyEvent for a sprite/agent response */
export function buildResponseEvent(params: {
  userId: string;
  authorId: string;
  content: string;
  channel: string;
  channelId: string | null;
  meta?: MetaEntry[];
}): SkyEvent {
  return {
    id: generateId(),
    userId: params.userId,
    authorId: params.authorId,
    kind: KIND.RESPONSE,
    content: params.content,
    meta: params.meta ?? [],
    channel: params.channel,
    channelId: params.channelId,
    createdAt: nowMs(),
  };
}
