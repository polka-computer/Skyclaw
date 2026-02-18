/**
 * LaneQueue — sprite wake deduplication
 *
 * Tracks which sprites have pending wake signals to avoid
 * redundant wake calls. Uses TTL to auto-expire entries.
 */

interface LaneEntry {
  userId: string;
  enqueuedAt: number;
  expiresAt: number;
}

export class LaneQueue {
  private lanes = new Map<string, LaneEntry>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /** Enqueue a wake signal for a user. Returns false if already queued. */
  enqueue(userId: string, ttlMs?: number): boolean {
    const now = Date.now();
    const existing = this.lanes.get(userId);

    // Already queued and not expired
    if (existing && existing.expiresAt > now) {
      return false;
    }

    this.lanes.set(userId, {
      userId,
      enqueuedAt: now,
      expiresAt: now + (ttlMs ?? this.defaultTtlMs),
    });
    return true;
  }

  /** Mark a user's lane as processed */
  dequeue(userId: string): void {
    this.lanes.delete(userId);
  }

  /** Check if a user has a pending wake signal */
  has(userId: string): boolean {
    const entry = this.lanes.get(userId);
    if (!entry) return false;
    if (entry.expiresAt <= Date.now()) {
      this.lanes.delete(userId);
      return false;
    }
    return true;
  }

  /** Clean up expired entries */
  gc(): void {
    const now = Date.now();
    for (const [key, entry] of this.lanes) {
      if (entry.expiresAt <= now) {
        this.lanes.delete(key);
      }
    }
  }
}
