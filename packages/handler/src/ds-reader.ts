/**
 * DS Reader — read pending messages from user inbox
 *
 * Reads all events from the user's inbox DS since the last stored offset.
 * Uses DSClient.streamJson() to the gateway's DS proxy (which forwards to the DS server).
 */

import { DSClient, FileOffsetStore, type OffsetStore } from "@skyclaw/ds";
import { DS_STREAMS, type SkyEvent } from "@skyclaw/schema";
import { join } from "node:path";
import { DATA_DIR } from "@skyclaw/agent";

export interface PendingMessages {
  events: SkyEvent[];
  lastOffset: string | null;
}

/**
 * Read all pending messages from a user's inbox.
 *
 * Uses DSClient to stream from the gateway's DS proxy.
 * Catches up on all pending events (live: false) then returns.
 */
export async function readPendingMessages(
  gatewayUrl: string,
  userId: string,
  offsetStore: OffsetStore,
  token?: string,
): Promise<PendingMessages> {
  const streamPath = DS_STREAMS.userInbox(userId);
  const feedKey = `inbox:${userId}`;
  const lastOffset = await offsetStore.get(feedKey);

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const dsClient = new DSClient(`${gatewayUrl}/ds`, { headers });

  try {
    const res = await dsClient.streamJson<SkyEvent>(streamPath, {
      offset: lastOffset ?? undefined,
      live: false,
    });

    const events = await res.json();

    const nextOffset = res.offset ?? lastOffset;
    if (nextOffset && nextOffset !== lastOffset) {
      await offsetStore.set(feedKey, nextOffset);
    }

    return { events, lastOffset: nextOffset };
  } catch (error) {
    console.warn(`[handler] could not read inbox for ${userId}:`, error);
    return { events: [], lastOffset };
  }
}

/** Create a default offset store for the handler */
export function createOffsetStore(userId: string): OffsetStore {
  const filePath = join(DATA_DIR, `offsets-${userId}.json`);
  return new FileOffsetStore(filePath);
}
