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
  type ServiceLogEvent,
  type SpriteStatus,
  type SpriteService,
} from "@skyclaw/sprites";

let spritesClient: SpritesClient | null = null;
const inFlightWake = new Map<string, Promise<void>>();

function buildHandlerEnv(): Record<string, string> {
  const extraEnv: Record<string, string> = {};

  const keys = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "SKYCLAW_AGENT_MODEL",
  ] as const;

  for (const key of keys) {
    const value = process.env[key];
    if (value && value.length > 0) {
      extraEnv[key] = value;
    }
  }

  return extraEnv;
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

function equalArgs(left: string[] | undefined, right: string[] | undefined): boolean {
  const a = left ?? [];
  const b = right ?? [];
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function shouldStartService(
  spriteStatus: SpriteStatus,
  service: SpriteService,
): boolean {
  // If the sprite machine itself is not running, force a start attempt.
  if (spriteStatus !== "running") {
    return true;
  }

  const serviceStatus = service.state?.status;
  return serviceStatus !== "running" &&
    serviceStatus !== "starting" &&
    serviceStatus !== "stopping";
}

function normalizeLogData(data: unknown): string {
  if (typeof data !== "string") {
    return JSON.stringify(data);
  }
  return data.replace(/\r?\n/g, " ").trim();
}

function logServiceStartEvents(
  userId: string,
  spriteName: string,
  serviceName: string,
  logs: ServiceLogEvent[],
): void {
  if (logs.length === 0) {
    console.log(
      `[sprite] service start returned no logs user=${userId} sprite=${spriteName} service=${serviceName}`,
    );
    return;
  }

  const maxEvents = 25;
  for (const entry of logs.slice(0, maxEvents)) {
    const prefix = `[sprite] service ${entry.type} user=${userId} sprite=${spriteName} service=${serviceName}`;

    if (entry.type === "stdout" || entry.type === "stderr") {
      const line = normalizeLogData(entry.data);
      if (!line) continue;
      const truncated = line.length > 260 ? `${line.slice(0, 260)}...` : line;
      if (entry.type === "stderr") {
        console.warn(`${prefix}: ${truncated}`);
      } else {
        console.log(`${prefix}: ${truncated}`);
      }
      continue;
    }

    if (entry.type === "exit") {
      const exitCode = entry.exit_code;
      console.log(`${prefix}: exit_code=${String(exitCode)}`);
      continue;
    }

    if (entry.type === "error") {
      const line = normalizeLogData(entry.data);
      console.warn(`${prefix}: ${line}`);
      continue;
    }

    if (entry.type === "complete") {
      const logFiles = "log_files" in entry ? JSON.stringify(entry.log_files) : "";
      const suffix = logFiles ? ` log_files=${logFiles}` : "";
      console.log(`${prefix}${suffix}`);
      continue;
    }
  }

  if (logs.length > maxEvents) {
    console.log(
      `[sprite] service logs truncated user=${userId} sprite=${spriteName} service=${serviceName} shown=${maxEvents} total=${logs.length}`,
    );
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
    const skyclawToken = await createToken(userId, GATEWAY_URL);
    const definition = buildHandlerServiceDefinition(
      skyclawToken,
      SPRITE_HANDLER_COMMAND,
      buildHandlerEnv(),
    );

    const sprite = await client.ensureSprite(spriteName);

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

    const serviceStatus = service.state?.status ?? "unknown";
    if (!shouldStartService(sprite.status, service)) {
      console.log(
        `[sprite] wake skipped user=${userId} sprite=${spriteName} sprite_status=${sprite.status} service=${SPRITE_SERVICE_NAME} service_status=${serviceStatus}`,
      );
      return;
    }

    if (serviceStatus === "running" && sprite.status !== "running") {
      console.log(
        `[sprite] forcing start user=${userId} sprite=${spriteName} sprite_status=${sprite.status} service=${SPRITE_SERVICE_NAME} service_status=${serviceStatus}`,
      );
    }

    const logs = await client.startService(
      spriteName,
      SPRITE_SERVICE_NAME,
      SPRITE_SERVICE_START_DURATION,
    );

    console.log(
      `[sprite] wake started user=${userId} sprite=${spriteName} sprite_status=${sprite.status} service=${SPRITE_SERVICE_NAME} prior_service_status=${serviceStatus}`,
    );

    logServiceStartEvents(userId, spriteName, SPRITE_SERVICE_NAME, logs);

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
