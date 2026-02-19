/**
 * Gateway DS Helpers
 *
 * High-level functions for writing to user inbox/outbox streams.
 */

import { DSClient } from "@skyclaw/ds";
import { DS_STREAMS, type SkyEvent } from "@skyclaw/schema";
import { getDSBaseUrl } from "./ds-server.js";

let client: DSClient | null = null;

function getClient(): DSClient {
  if (!client) {
    client = new DSClient(getDSBaseUrl());
  }
  return client;
}

/** Ensure a user's inbox and outbox streams exist */
export async function ensureUserStreams(userId: string): Promise<void> {
  const ds = getClient();
  await ds.ensureStream(DS_STREAMS.userInbox(userId));
  await ds.ensureStream(DS_STREAMS.userOutbox(userId));
}

/** Append an event to a user's inbox (messages TO the sprite) */
export async function appendToUserInbox(
  userId: string,
  event: SkyEvent,
): Promise<void> {
  const ds = getClient();
  await ds.appendJson(DS_STREAMS.userInbox(userId), event);
}

/** Append an event to a user's outbox (responses FROM the sprite) */
export async function appendToUserOutbox(
  userId: string,
  event: SkyEvent,
): Promise<void> {
  const ds = getClient();
  await ds.appendJson(DS_STREAMS.userOutbox(userId), event);
}
