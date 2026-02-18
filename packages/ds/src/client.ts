/**
 * Durable Streams Client Helpers
 *
 * Write/read helpers for appending events to Durable Streams.
 * Adapted from Polka's ds.ts with stream handle caching and auto-create.
 */

import {
  DurableStream,
  DurableStreamError,
  FetchError,
} from "@durable-streams/client";

const JSON_CONTENT_TYPE = "application/json";

function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof FetchError || error instanceof DurableStreamError) {
    return error.status;
  }
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function isConflictExists(error: unknown): boolean {
  if (error instanceof DurableStreamError && error.code === "CONFLICT_EXISTS") {
    return true;
  }
  return getErrorStatus(error) === 409;
}

/**
 * DSClient — manages stream handles and provides append/ensure/read operations.
 */
export class DSClient {
  private baseUrl: string;
  private handles = new Map<string, DurableStream>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private dsUrl(path: string): string {
    return `${this.baseUrl}/${path}`;
  }

  private getHandle(path: string): DurableStream {
    const existing = this.handles.get(path);
    if (existing) return existing;

    const handle = new DurableStream({
      url: this.dsUrl(path),
      contentType: JSON_CONTENT_TYPE,
    });
    this.handles.set(path, handle);
    return handle;
  }

  /** Ensure a DS stream exists (creates if missing). */
  async ensureStream(path: string): Promise<void> {
    const handle = this.getHandle(path);
    try {
      await handle.create({ contentType: JSON_CONTENT_TYPE });
    } catch (error) {
      if (isConflictExists(error)) return;
      throw error;
    }
  }

  /** Append a JSON payload to a stream, auto-creating if needed. */
  async appendJson(path: string, payload: unknown): Promise<void> {
    const handle = this.getHandle(path);
    const body = JSON.stringify(payload);

    try {
      await handle.append(body);
      return;
    } catch (error) {
      if (getErrorStatus(error) !== 404) {
        throw error;
      }
    }

    // Stream didn't exist — create and retry
    await this.ensureStream(path);
    await handle.append(body);
  }

  /** Get the raw DurableStream handle for advanced operations (read, subscribe). */
  getStreamHandle(path: string): DurableStream {
    return this.getHandle(path);
  }
}
