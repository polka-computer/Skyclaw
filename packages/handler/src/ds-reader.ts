/**
 * DS Reader — read pending messages from user inbox
 *
 * Reads all events from the user's inbox DS since the last stored offset.
 * Uses plain HTTP fetch to the gateway's DS proxy (which forwards to the DS server).
 */

import { FileOffsetStore, type OffsetStore } from "@skyclaw/ds";
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
 * Fetches from the gateway's DS proxy via HTTP GET.
 * The DS server returns a JSON array + offset headers.
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

  // Build the DS proxy URL with offset if we have one
  let url = `${gatewayUrl}/ds/${streamPath}`;
  if (lastOffset) {
    url += `?offset=${encodeURIComponent(lastOffset)}`;
  }

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 404) {
        return { events: [], lastOffset };
      }
      throw new Error(`DS read failed: ${res.status} ${res.statusText}`);
    }

    const body = await res.text();
    if (!body || body.trim() === "[]" || body.trim() === "") {
      return { events: [], lastOffset };
    }

    const events: SkyEvent[] = JSON.parse(body);
    if (!Array.isArray(events) || events.length === 0) {
      return { events: [], lastOffset };
    }

    // Get the next offset from response headers
    const nextOffset = res.headers.get("Stream-Next-Offset") ?? lastOffset;
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
