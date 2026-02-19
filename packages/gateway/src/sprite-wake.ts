/**
 * Sprite wake orchestration.
 *
 * On message enqueue: ensure sprite exists, write env file via exec,
 * ensure handler service is configured, and start the service.
 */

import {
  SPRITES_TOKEN,
  SPRITES_API_BASE_URL,
  SPRITE_NAME_PREFIX,
  SPRITE_SERVICE_NAME,
  SPRITE_HANDLER_COMMAND,
  SPRITE_SERVICE_START_DURATION,
  SPRITE_FORWARD_ENV,
  GATEWAY_URL,
} from "./config.js";
import { createToken } from "./auth.js";
import {
  SpritesApiError,
  SpritesClient,
  writeEnvFile,
  buildServiceDefinition,
  type ServiceLogEvent,
  type SpriteService,
  type PutServiceInput,
} from "@skyclaw/sprites";

let spritesClient: SpritesClient | null = null;
const inFlightWake = new Map<string, Promise<void>>();

function buildHandlerEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of SPRITE_FORWARD_ENV.split(",").map((k) => k.trim()).filter(Boolean)) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

function sanitizeNamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function spriteNameForUser(userId: string): string {
  const prefixBase = sanitizeNamePart(SPRITE_NAME_PREFIX) || "skyclaw";
  const prefix = prefixBase.endsWith("-") ? prefixBase : `${prefixBase}-`;
  const user = sanitizeNamePart(userId) || "user";

  const combined = `${prefix}${user}`.slice(0, 63).replace(/-+$/g, "");
  return combined || "skyclaw-user";
}

function getSpritesClient(): SpritesClient | null {
  if (!SPRITES_TOKEN) {
    return null;
  }

  if (!spritesClient) {
    spritesClient = new SpritesClient(SPRITES_TOKEN, {
      baseUrl: SPRITES_API_BASE_URL,
    });
  }

  return spritesClient;
}

export function spritesEnabled(): boolean {
  return SPRITES_TOKEN !== null;
}

function definitionChanged(
  existing: SpriteService,
  desired: PutServiceInput,
): boolean {
  if (existing.cmd !== desired.cmd) return true;
  const a = existing.args ?? [];
  const b = desired.args ?? [];
  if (a.length !== b.length) return true;
  return !a.every((v, i) => v === b[i]);
}

function needsStart(service: SpriteService): boolean {
  const status = service.state?.status;
  return status !== "running" && status !== "starting" && status !== "stopping";
}

async function getServiceSafe(
  client: SpritesClient,
  spriteName: string,
): Promise<SpriteService | null> {
  try {
    return await client.getService(spriteName, SPRITE_SERVICE_NAME);
  } catch (error) {
    if (error instanceof SpritesApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function logStartEvents(userId: string, logs: ServiceLogEvent[]): void {
  for (const e of logs.slice(0, 10)) {
    const data = typeof e.data === "string" ? e.data.trim() : e.type;
    const fn = e.type === "stderr" || e.type === "error" ? "warn" : "log";
    console[fn](`[sprite] ${e.type} user=${userId}: ${data.slice(0, 200)}`);
  }
}

/**
 * Wake a user's sprite by starting the configured handler service.
 *
 * Uses per-user in-flight dedupe to avoid parallel starts within one gateway process.
 */
export async function wakeSpriteForUser(userId: string): Promise<void> {
  const existing = inFlightWake.get(userId);
  if (existing) {
    return existing;
  }

  const run = wakeSpriteForUserInner(userId).finally(() => {
    inFlightWake.delete(userId);
  });
  inFlightWake.set(userId, run);
  return run;
}

async function wakeSpriteForUserInner(userId: string): Promise<void> {
  const client = getSpritesClient();
  if (!client) {
    return;
  }

  const spriteName = spriteNameForUser(userId);

  try {
    await client.ensureSprite(spriteName);

    // 1. Exec: write env file to sprite
    const token = await createToken(userId, GATEWAY_URL);
    await writeEnvFile(client, spriteName, {
      SKYCLAW_TOKEN: token,
      ...buildHandlerEnv(),
    });

    // 2. Ensure service definition
    const def = buildServiceDefinition(SPRITE_HANDLER_COMMAND);
    let svc = await getServiceSafe(client, spriteName);
    if (!svc || definitionChanged(svc, def)) {
      svc = await client.putService(spriteName, SPRITE_SERVICE_NAME, def);
    }

    if (!svc) {
      return;
    }

    // 3. Start service if needed
    if (needsStart(svc)) {
      const logs = await client.startService(
        spriteName,
        SPRITE_SERVICE_NAME,
        SPRITE_SERVICE_START_DURATION,
      );
      logStartEvents(userId, logs);
    }
  } catch (error) {
    if (error instanceof SpritesApiError) {
      console.error(
        `[sprite] wake failed user=${userId} sprite=${spriteName} status=${error.status} body=${error.body.slice(0, 240)}`,
      );
      return;
    }

    console.error(`[sprite] wake failed user=${userId} sprite=${spriteName}:`, error);
  }
}
