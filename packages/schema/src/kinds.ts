/**
 * Skyclaw Event Kind Constants
 *
 * Numeric event kinds for the message protocol.
 */

export const KIND = {
  /** User message — incoming content from any channel */
  MESSAGE: 1,
  /** Agent response — output from sprite processing */
  RESPONSE: 2,
  /** System event — internal lifecycle events */
  SYSTEM: 100,
} as const;

export type Kind = (typeof KIND)[keyof typeof KIND];
