/**
 * Gateway Configuration — Effect.Config with validation
 *
 * Single source of truth for all paths and ports.
 */

import { Config, Effect } from "effect";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

// ── Config Schema ───────────────────────────────────────────

const GatewayConfig = Config.all({
  skyRoot: Config.string("SKYCLAW_ROOT").pipe(
    Config.withDefault(join(homedir(), "skyclaw")),
    Config.map((p) => resolve(p)),
  ),
  port: Config.integer("PORT").pipe(Config.withDefault(3000)),
  dsPort: Config.integer("DS_PORT").pipe(Config.withDefault(4437)),
  jwtSecret: Config.string("JWT_SECRET").pipe(
    Config.withDefault("skyclaw-dev-secret"),
  ),
  gatewayUrl: Config.option(Config.string("GATEWAY_URL")),
  spritesToken: Config.option(Config.string("SPRITES_TOKEN")),
  spriteToken: Config.option(Config.string("SPRITE_TOKEN")),
  spritesApiBaseUrl: Config.string("SPRITES_API_BASE_URL").pipe(
    Config.withDefault("https://api.sprites.dev"),
  ),
  spriteNamePrefix: Config.string("SPRITE_NAME_PREFIX").pipe(
    Config.withDefault("skyclaw-"),
  ),
  spriteServiceName: Config.string("SPRITE_SERVICE_NAME").pipe(
    Config.withDefault("handler"),
  ),
  spriteHandlerCommand: Config.string("SPRITE_HANDLER_COMMAND").pipe(
    Config.withDefault("bunx @skyclaw/handler start"),
  ),
  spriteServiceStartDuration: Config.string("SPRITE_SERVICE_START_DURATION").pipe(
    Config.withDefault("2s"),
  ),
});

// ── Load Config at Startup ──────────────────────────────────

const loaded = Effect.runSync(GatewayConfig);

// ── Derived Paths ───────────────────────────────────────────

export const SKYCLAW_ROOT = loaded.skyRoot;
export const DATA_DIR = join(SKYCLAW_ROOT, "data");
export const STREAMS_DIR = join(DATA_DIR, "streams");

export const PORT = loaded.port;
export const DS_PORT = loaded.dsPort;
export const JWT_SECRET = loaded.jwtSecret;
export const GATEWAY_URL = loaded.gatewayUrl._tag === "Some"
  ? loaded.gatewayUrl.value
  : `http://localhost:${PORT}`;
export const SPRITES_TOKEN =
  loaded.spritesToken._tag === "Some"
    ? loaded.spritesToken.value
    : loaded.spriteToken._tag === "Some"
      ? loaded.spriteToken.value
      : null;
export const SPRITES_API_BASE_URL = loaded.spritesApiBaseUrl;
export const SPRITE_NAME_PREFIX = loaded.spriteNamePrefix;
export const SPRITE_SERVICE_NAME = loaded.spriteServiceName;
export const SPRITE_HANDLER_COMMAND = loaded.spriteHandlerCommand;
export const SPRITE_SERVICE_START_DURATION = loaded.spriteServiceStartDuration;

// ── Paths object for init/logging ───────────────────────────

export const paths = {
  root: SKYCLAW_ROOT,
  data: DATA_DIR,
  streams: STREAMS_DIR,
} as const;

// ── Ensure directories exist ─────────────────────────────────

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(STREAMS_DIR)) {
  mkdirSync(STREAMS_DIR, { recursive: true });
}
