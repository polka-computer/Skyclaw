/**
 * HTTP Channel Adapter
 *
 * Normalizes HTTP POST bodies into NormalizedMessage.
 * Stores responses in memory for polling retrieval.
 */

import type {
  ChannelAdapter,
  ChannelType,
  NormalizedMessage,
} from "./types.js";

/** In-memory response store for HTTP polling */
export class ResponseStore {
  private responses = new Map<string, string[]>();

  push(userId: string, content: string): void {
    const existing = this.responses.get(userId) ?? [];
    existing.push(content);
    this.responses.set(userId, existing);
  }

  drain(userId: string): string[] {
    const responses = this.responses.get(userId) ?? [];
    this.responses.delete(userId);
    return responses;
  }

  peek(userId: string): string[] {
    return this.responses.get(userId) ?? [];
  }
}

/** Normalize a raw HTTP POST body into a NormalizedMessage */
export function normalizeHttpMessage(body: {
  userId: string;
  content: string;
}): NormalizedMessage {
  return {
    userId: body.userId,
    content: body.content,
    channel: "http" as ChannelType,
    channelId: null,
    timestamp: Date.now(),
  };
}

/** HTTP adapter — for POC, responses stored in memory for polling */
export class HTTPAdapter implements ChannelAdapter {
  readonly name: ChannelType = "http";
  readonly responseStore: ResponseStore;

  constructor(responseStore?: ResponseStore) {
    this.responseStore = responseStore ?? new ResponseStore();
  }

  async start(): Promise<void> {
    // No-op for HTTP — server handles incoming requests
  }

  async stop(): Promise<void> {
    // No-op
  }

  async send(channelId: string, content: string): Promise<boolean> {
    // For HTTP, "sending" means storing for polling
    // channelId is the userId for HTTP
    this.responseStore.push(channelId, content);
    return true;
  }

  isConfigured(): boolean {
    return true;
  }
}
