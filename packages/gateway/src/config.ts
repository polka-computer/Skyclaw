/**
 * Gateway Configuration — Effect.Config with validation
 *
 * Single source of truth for all paths and ports.
 */

import { Config, Effect, Option } from "effect";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// ── Config Schema ───────────────────────────────────────────

const GatewayConfig = Config.all({
  skyRoot: Config.string("SKYCLAW_ROOT").pipe(
    Config.withDefault(join(homedir(), "skyclaw")),
    Config.map((p) =>
      resolve(p.startsWith("~/") ? join(homedir(), p.slice(2)) : p === "~" ? homedir() : p),
    ),
  ),
  port: Config.integer("PORT").pipe(Config.withDefault(3000)),
  dsPort: Config.integer("DS_PORT").pipe(Config.withDefault(4437)),
  jwtSecret: Config.string("JWT_SECRET").pipe(
    Config.withDefault("skyclaw-dev-secret"),
  ),
  gatewayUrl: Config.option(Config.string("GATEWAY_URL")),
  spritesToken: Config.option(Config.string("SPRITES_TOKEN")),
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
    Config.withDefault("/home/sprite/.skyclaw/boot.sh start"),
  ),
  spriteHandlerRepo: Config.string("SPRITE_HANDLER_REPO").pipe(
    Config.withDefault("https://github.com/polka-computer/Skyclaw.git"),
  ),
  spriteHandlerBranch: Config.string("SPRITE_HANDLER_BRANCH").pipe(
    Config.withDefault("master"),
  ),
  spriteServiceStartDuration: Config.string("SPRITE_SERVICE_START_DURATION").pipe(
    Config.withDefault("2s"),
  ),
  spriteForwardEnv: Config.string("SPRITE_FORWARD_ENV").pipe(
    Config.withDefault(
      "ANTHROPIC_API_KEY,OPENAI_API_KEY,OPENROUTER_API_KEY,SKYCLAW_AGENT_MODEL",
    ),
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
export const GATEWAY_URL = Option.getOrElse(loaded.gatewayUrl, () => `http://localhost:${PORT}`);
export const SPRITES_TOKEN = Option.getOrNull(loaded.spritesToken);
export const SPRITES_API_BASE_URL = loaded.spritesApiBaseUrl;
export const SPRITE_NAME_PREFIX = loaded.spriteNamePrefix;
export const SPRITE_SERVICE_NAME = loaded.spriteServiceName;
export const SPRITE_HANDLER_COMMAND = loaded.spriteHandlerCommand;
export const SPRITE_SERVICE_START_DURATION = loaded.spriteServiceStartDuration;
export const SPRITE_HANDLER_REPO = loaded.spriteHandlerRepo;
export const SPRITE_HANDLER_BRANCH = loaded.spriteHandlerBranch;
export const SPRITE_FORWARD_ENV = loaded.spriteForwardEnv;

// ── Paths object for init/logging ───────────────────────────

export const paths = {
  root: SKYCLAW_ROOT,
  data: DATA_DIR,
  streams: STREAMS_DIR,
} as const;

