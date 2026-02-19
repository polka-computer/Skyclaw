/**
 * Minimal Sprites HTTP client.
 *
 * Keeps the surface intentionally small for gateway wake + service management.
 */

export class SpritesApiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly body: string;

  constructor(params: {
    status: number;
    method: string;
    path: string;
    body: string;
  }) {
    const message = `Sprites API ${params.method} ${params.path} failed with ${params.status}`;
    super(message);
    this.name = "SpritesApiError";
    this.status = params.status;
    this.method = params.method;
    this.path = params.path;
    this.body = params.body;
  }
}

export type SpriteStatus = "cold" | "warm" | "running";

export interface SpriteRecord {
  id: string;
  name: string;
  organization: string;
  url: string;
  status: SpriteStatus;
  created_at: string;
  updated_at: string;
}

export type ServiceStatus =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "failed";

export interface SpriteServiceState {
  name: string;
  status: ServiceStatus;
  pid?: number;
  started_at?: string;
  error?: string;
}

export interface SpriteService {
  name: string;
  cmd: string;
  args: string[];
  needs: string[];
  http_port: number | null;
  state?: SpriteServiceState;
}

export interface PutServiceInput {
  cmd: string;
  args?: string[];
  needs?: string[];
  http_port?: number | null;
}

export interface ServiceLogEvent {
  type: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface SpritesClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  query?: Record<string, string | undefined>;
  body?: unknown;
}

function buildQuery(query: Record<string, string | undefined> | undefined): string {
  if (!query) return "";

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value.length > 0) {
      search.set(key, value);
    }
  }

  const encoded = search.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isSpriteService(value: unknown): value is SpriteService {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    typeof value.cmd === "string" &&
    isStringArray(value.args) &&
    isStringArray(value.needs) &&
    (typeof value.http_port === "number" || value.http_port === null)
  );
}

function toServiceLogEvents(value: unknown): ServiceLogEvent[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord).map((entry) => entry as ServiceLogEvent);
  }

  if (isRecord(value)) {
    return [value as ServiceLogEvent];
  }

  return [];
}

export function parseNdjson(raw: string): ServiceLogEvent[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  // Some environments return JSON arrays/objects instead of newline-delimited JSON.
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const events = toServiceLogEvents(parsed);
      if (events.length > 0) {
        return events;
      }
    } catch {
      // Fall through to line-oriented parsing.
    }
  }

  const events: ServiceLogEvent[] = [];
  for (const line of raw.split(/\r?\n/g)) {
    const candidate = line.trim();
    if (!candidate || candidate.startsWith("event:")) {
      continue;
    }

    const payload = candidate.startsWith("data:")
      ? candidate.slice("data:".length).trim()
      : candidate;
    if (!payload || payload === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(payload);
      events.push(...toServiceLogEvents(parsed));
    } catch {
      // Ignore non-JSON log framing lines.
    }
  }

  if (events.length === 0) {
    throw new SyntaxError("Failed to parse service logs as JSON/NDJSON");
  }

  return events;
}

export class SpritesClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(token: string, options: SpritesClientOptions = {}) {
    if (!token) {
      throw new Error("Sprites token is required");
    }

    this.token = token;
    this.baseUrl = (options.baseUrl ?? "https://api.sprites.dev").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}${buildQuery(options.query)}`;

    const headers = new Headers({
      Authorization: `Bearer ${this.token}`,
    });

    let body: string | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new SpritesApiError({
        status: response.status,
        method,
        path,
        body: errorBody,
      });
    }

    return response;
  }

  private async requestJson<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await this.request(method, path, options);
    const raw = await response.text();

    if (!raw.trim()) {
      throw new Error(
        `Sprites API ${method} ${path} returned an empty response body`,
      );
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      const contentType = response.headers.get("content-type") ?? "unknown";
      const snippet = raw.slice(0, 240).replace(/\s+/g, " ");
      throw new Error(
        `Sprites API ${method} ${path} returned non-JSON body (content-type=${contentType}): ${snippet}`,
      );
    }
  }

  async getSprite(name: string): Promise<SpriteRecord> {
    return this.requestJson<SpriteRecord>(
      "GET",
      `/v1/sprites/${encodeURIComponent(name)}`,
    );
  }

  async createSprite(name: string): Promise<SpriteRecord> {
    return this.requestJson<SpriteRecord>("POST", "/v1/sprites", {
      body: { name },
    });
  }

  async ensureSprite(name: string): Promise<SpriteRecord> {
    try {
      return await this.getSprite(name);
    } catch (error) {
      if (error instanceof SpritesApiError && error.status === 404) {
        return this.createSprite(name);
      }
      throw error;
    }
  }

  async getService(spriteName: string, serviceName: string): Promise<SpriteService> {
    return this.requestJson<SpriteService>(
      "GET",
      `/v1/sprites/${encodeURIComponent(spriteName)}/services/${encodeURIComponent(serviceName)}`,
    );
  }

  async putService(
    spriteName: string,
    serviceName: string,
    input: PutServiceInput,
  ): Promise<SpriteService> {
    const path = `/v1/sprites/${encodeURIComponent(spriteName)}/services/${encodeURIComponent(serviceName)}`;
    const response = await this.request("PUT", path, {
      body: {
        cmd: input.cmd,
        args: input.args ?? [],
        needs: input.needs ?? [],
        http_port: input.http_port ?? null,
      },
    });

    const raw = await response.text();
    const trimmed = raw.trim();

    if (!trimmed) {
      return this.getService(spriteName, serviceName);
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (isSpriteService(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through; some environments stream NDJSON logs from PUT.
    }

    try {
      parseNdjson(raw);
      return this.getService(spriteName, serviceName);
    } catch {
      const contentType = response.headers.get("content-type") ?? "unknown";
      const snippet = raw.slice(0, 240).replace(/\s+/g, " ");
      throw new Error(
        `Sprites API PUT ${path} returned unexpected body (content-type=${contentType}): ${snippet}`,
      );
    }
  }

  async startService(
    spriteName: string,
    serviceName: string,
    duration = "2s",
  ): Promise<ServiceLogEvent[]> {
    const response = await this.request(
      "POST",
      `/v1/sprites/${encodeURIComponent(spriteName)}/services/${encodeURIComponent(serviceName)}/start`,
      {
        query: { duration },
      },
    );

    const raw = await response.text();
    if (!raw.trim()) {
      return [];
    }

    return parseNdjson(raw);
  }
}
