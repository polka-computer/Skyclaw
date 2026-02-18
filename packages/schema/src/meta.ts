/**
 * Skyclaw Meta Constants + Utilities
 *
 * Meta entries are string arrays: [name, ...values]
 */

import type { MetaEntry, SkyEvent } from "./event.js";

/** Meta key constants for SkyEvent metadata */
export const META = {
  /** Source channel: ["channel", "http"] */
  CHANNEL: "channel",
  /** Reply reference: ["reply_to", eventId] */
  REPLY_TO: "reply_to",
  /** Tool invocation: ["tool", toolName, ...args] */
  TOOL: "tool",
  /** Error info: ["error", message] */
  ERROR: "error",
} as const;

export type MetaKey = (typeof META)[keyof typeof META];

type MetaCarrier = Pick<SkyEvent, "meta">;

/** Get the first meta entry with the given name */
export function getMeta(event: MetaCarrier, name: string): MetaEntry | undefined {
  return event.meta.find((t) => t[0] === name);
}

/** Get the first value (index 1) of a meta entry with the given name */
export function getMetaValue(event: MetaCarrier, name: string): string | undefined {
  return getMeta(event, name)?.[1];
}

/** Get all values (index 1) of meta entries with the given name */
export function getMetaValues(event: MetaCarrier, name: string): string[] {
  return event.meta
    .filter((t) => t[0] === name)
    .map((t) => t[1])
    .filter((v): v is string => v !== undefined);
}

/** Check if the event has a meta entry with the given name */
export function hasMeta(event: MetaCarrier, name: string): boolean {
  return event.meta.some((t) => t[0] === name);
}
