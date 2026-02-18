/**
 * oRPC Context — base context and auth middleware
 *
 * For POC: auth is optional. Procedures receive raw headers.
 */

import { os } from "@orpc/server";

/** Base oRPC instance — procedures receive raw headers from the adapter. */
export const base = os.$context<{ headers: Headers }>();

/** Public base — no auth required for POC */
export const publicBase = base;
