/**
 * DS URL helpers — single source of truth for Durable Streams path patterns.
 *
 * Per-user inbox/outbox streams for the Skyclaw mailbox architecture.
 */

/** Build a DS stream path. */
export function dsStreamPath(stream: string): string {
  return `v1/stream/${stream}`;
}

/** Named DS stream path builders. */
export const DS_STREAMS = {
  /** Per-user inbox — messages TO the sprite */
  userInbox: (userId: string) => dsStreamPath(`user/${userId}/inbox`),
  /** Per-user outbox — responses FROM the sprite */
  userOutbox: (userId: string) => dsStreamPath(`user/${userId}/outbox`),
} as const;
