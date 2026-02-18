/**
 * Sprite wake orchestration.
 *
 * On message enqueue: ensure sprite exists, ensure handler service is configured,
 * and start the service.
 */

import {
  SPRITES_TOKEN,
  SPRITES_API_BASE_URL,
  SPRITE_NAME_PREFIX,
  SPRITE_SERVICE_NAME,
  SPRITE_HANDLER_COMMAND,
  SPRITE_SERVICE_START_DURATION,
  GATEWAY_URL,
} from "./config.js";
import { createToken } from "./auth.js";
import {
  SpritesApiError,
  SpritesClient,
  buildHandlerServiceDefinition,
  type SpriteService,
} from "@skyclaw/sprites";

let spritesClient: SpritesClient | null = null;
const inFlightWake = new Map<string, Promise<void>>();

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

function equalArgs(left: string[] | undefined, right: string[] | undefined): boolean {
  const a = left ?? [];
  const b = right ?? [];
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function shouldStartService(service: SpriteService): boolean {
  const status = service.state?.status;
  return status !== "running" && status !== "starting" && status !== "stopping";
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
    const skyclawToken = await createToken(userId, GATEWAY_URL);
    const definition = buildHandlerServiceDefinition(
      skyclawToken,
      SPRITE_HANDLER_COMMAND,
    );

    await client.ensureSprite(spriteName);

    let service: SpriteService | null = null;
    try {
      service = await client.getService(spriteName, SPRITE_SERVICE_NAME);
    } catch (error) {
      if (!(error instanceof SpritesApiError && error.status === 404)) {
        throw error;
      }
    }

    const definitionChanged =
      !service ||
      service.cmd !== definition.cmd ||
      !equalArgs(service.args, definition.args);

    if (definitionChanged) {
      service = await client.putService(spriteName, SPRITE_SERVICE_NAME, {
        cmd: definition.cmd,
        args: definition.args,
        needs: [],
      });
    }

    if (!service) {
      return;
    }

    const status = service.state?.status ?? "unknown";
    if (!shouldStartService(service)) {
      console.log(
        `[sprite] wake skipped user=${userId} sprite=${spriteName} service=${SPRITE_SERVICE_NAME} status=${status}`,
      );
      return;
    }

    const logs = await client.startService(
      spriteName,
      SPRITE_SERVICE_NAME,
      SPRITE_SERVICE_START_DURATION,
    );

    console.log(
      `[sprite] wake started user=${userId} sprite=${spriteName} service=${SPRITE_SERVICE_NAME} prior_status=${status}`,
    );

    const errorLog = logs.find((entry) => entry.type === "error");
    if (errorLog) {
      console.warn(
        `[sprite] service error user=${userId} sprite=${spriteName}: ${JSON.stringify(errorLog).slice(0, 240)}`,
      );
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
