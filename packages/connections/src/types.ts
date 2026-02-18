/**
 * Channel Types and Interfaces
 *
 * Defines the contract for all communication channels.
 * Each adapter normalizes platform-specific payloads into NormalizedMessage.
 */

export type ChannelType = "http" | "sms" | "telegram" | "discord";

/** Raw message from a specific channel before normalization */
export interface ChannelMessage {
  userId: string;
  content: string;
  channel: ChannelType;
  channelId: string | null;
  timestamp?: number;
  files?: string[];
}

/** Normalized message — channel-agnostic, ready for SkyEvent conversion */
export interface NormalizedMessage {
  userId: string;
  content: string;
  channel: ChannelType;
  channelId: string | null;
  timestamp: number;
}

/** Response to send back through a channel */
export interface ChannelResponse {
  userId: string;
  content: string;
  channel: ChannelType;
  channelId: string | null;
}

/** Channel adapter interface — each platform implements this */
export interface ChannelAdapter {
  readonly name: ChannelType;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(channelId: string, content: string): Promise<boolean>;
  isConfigured(): boolean;
}
