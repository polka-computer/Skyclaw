/**
 * OffsetStore — persist DurableStream offsets so subscriptions
 * can resume from the last processed position on reconnect.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ── Interface ────────────────────────────────────────────────

export interface OffsetStore {
  get(feedKey: string): string | null | Promise<string | null>;
  set(feedKey: string, offset: string): void | Promise<void>;
}

// ── MemoryOffsetStore ────────────────────────────────────────

/** In-process only — offsets lost on restart. */
export class MemoryOffsetStore implements OffsetStore {
  private offsets = new Map<string, string>();

  get(feedKey: string): string | null {
    return this.offsets.get(feedKey) ?? null;
  }

  set(feedKey: string, offset: string): void {
    this.offsets.set(feedKey, offset);
  }
}

// ── FileOffsetStore ──────────────────────────────────────────

/** Persists offsets to a JSON file on disk. */
export class FileOffsetStore implements OffsetStore {
  private filePath: string;
  private data: Record<string, string>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = {};
    if (existsSync(filePath)) {
      try {
        this.data = JSON.parse(readFileSync(filePath, "utf-8"));
      } catch {
        this.data = {};
      }
    }
  }

  get(feedKey: string): string | null {
    return this.data[feedKey] ?? null;
  }

  set(feedKey: string, offset: string): void {
    this.data[feedKey] = offset;
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
