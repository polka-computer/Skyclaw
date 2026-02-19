# Skyclaw POC — Local Testing Guide

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- An API key for one of: Anthropic, OpenAI, or OpenRouter

## Install

```bash
bun install
```

## Typecheck

```bash
bun run typecheck
```

## Configure Environment

Create a local env file:

```bash
cp .env.example .env
```

`packages/gateway/src/config.ts` reads from environment variables, and `bun run ...` auto-loads `.env`.

## Architecture

```
                   ┌─────────────────────────────────────┐
                   │           Gateway (:3000)            │
                   │                                      │
  curl ──────────► │  /api/rpc/messages/send              │
                   │       │                              │
                   │       ▼                              │
                   │  Durable Streams (:4437)             │
                   │  user/{userId}/inbox                 │
                   │       ▲              │               │
                   │       │              │               │
  curl ◄────────── │  /api/rpc/responses/get              │
                   │       ▲              │               │
                   │       │         [sprite-auth]        │
                   │  /mcp/{userId}  ◄────┼───── handler  │
                   │  (send_message)      │    (Bearer)   │
                   └──────────────────────┼───────────────┘
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │    Handler     │
                                  │  (oh-my-pi +   │
                                  │   MCP client)  │
                                  └───────────────┘
```

## Step 1 — Start the Gateway

```bash
bun run gateway
```

You should see:

```
[skyclaw] dirs initialized at ~/skyclaw
[skyclaw] DS server listening on :4437
[skyclaw] gateway starting on port 3000
```

Verify it's running:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"service":"skyclaw-gateway"}
```

Optional sprite wake mode (in `.env`):

```bash
SPRITES_TOKEN="<sprites api token>"  # or SPRITE_TOKEN
GATEWAY_URL="https://your-gateway-host"
SPRITE_HANDLER_COMMAND="bunx @skyclaw/handler start"
```

With these set, every new inbox message triggers sprite service start automatically.
To run unpublished handler code from a sprite-local repo checkout:

```bash
SPRITE_HANDLER_COMMAND="bun run /home/sprite/skyclaw/packages/handler/src/cli/index.ts start"
```

## Step 2 — Send a Message

```bash
curl -s -X POST http://localhost:3000/api/rpc/messages/send \
  -H "Content-Type: application/json" \
  -d '{"json":{"userId":"test-user","content":"Hello, what can you help me with?"}}' | jq
```

Expected response:

```json
{
  "json": {
    "ok": true,
    "eventId": "01J..."
  }
}
```

## Step 3 — Generate a Handler Token

```bash
curl -s http://localhost:3000/api/token/test-user | jq
```

Save the `token` value from the response.

## Step 4 — Verify the Message is in the Inbox

The DS stream routes require a Bearer token (sprites can only read their own inbox):

```bash
curl -s http://localhost:3000/ds/v1/stream/user/test-user/inbox \
  -H "Authorization: Bearer <token from step 3>" | jq
```

You should see the SkyEvent with your message content.

## Step 5 — Run the Handler

Set your AI provider key and the token from step 3:

```bash
# Pick one AI provider:
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
# or
export OPENROUTER_API_KEY="sk-or-..."

# Set the handler token
export SKYCLAW_TOKEN="<token from step 4>"

bun run handler
```

The handler will:

1. Initialize `~/skyclaw/` directories (memory, sessions, data)
2. Decode the JWT to get `userId` and `gatewayUrl`
3. Read pending messages from the user's inbox via DS (authenticated with the token)
4. Create an oh-my-pi session with MCP pointing at the gateway (authenticated with the token)
5. oh-my-pi discovers `send_message` and `get_conversation_history` tools
6. The agent processes each message and calls `send_message` to respond
7. Exit

## Step 6 — Retrieve the Response

```bash
curl -s -X POST http://localhost:3000/api/rpc/responses/get \
  -H "Content-Type: application/json" \
  -d '{"json":{"userId":"test-user"}}' | jq
```

The `responses` array contains the agent's reply.

## Re-running the Handler

The handler tracks offsets in `~/skyclaw/data/offsets-{userId}.json`. Running it again without sending new messages will find 0 pending messages:

```bash
SKYCLAW_TOKEN="<token>" bun run handler
# [handler] found 0 pending message(s)
# [agent] no pending messages
```

Send another message (step 2) and run the handler again to process it.

## Sprite E2E Locally (No npm Publish Required)

You can test sprite wake + handler execution without publishing `@skyclaw/handler`.

1. Expose your gateway to the public internet (ngrok/Cloudflare tunnel/etc) and set `GATEWAY_URL` in `.env`.
2. Set `SPRITES_TOKEN` (or `SPRITE_TOKEN`) in `.env`.
3. Set `SPRITE_HANDLER_COMMAND` in `.env` to run handler from a repo checkout on the sprite:

```bash
SPRITE_HANDLER_COMMAND="bun run /home/sprite/skyclaw/packages/handler/src/cli/index.ts start"
```

4. On the sprite machine, do a one-time bootstrap:

```bash
git clone <your-repo-url> /home/sprite/skyclaw
cd /home/sprite/skyclaw
bun install
```

5. Start gateway locally: `bun run gateway`.
6. Send a message via `/api/rpc/messages/send`.
7. Check gateway logs for `[sprite] wake ...` and fetch response via `/api/rpc/responses/get`.

If you prefer not to keep a repo checkout on each sprite, use the default `SPRITE_HANDLER_COMMAND=bunx @skyclaw/handler start` and publish handler versions to npm.

## Quick One-Liner Test

```bash
# Terminal 1 — gateway
bun run gateway

# Terminal 2 — send + run handler + get response
export ANTHROPIC_API_KEY="sk-ant-..."

curl -s http://localhost:3000/api/token/test-user -o /tmp/token.json
export SKYCLAW_TOKEN=$(jq -r .token /tmp/token.json)

curl -s -X POST http://localhost:3000/api/rpc/messages/send \
  -H "Content-Type: application/json" \
  -d '{"json":{"userId":"test-user","content":"Say hello in 3 words"}}'

bun run handler

curl -s -X POST http://localhost:3000/api/rpc/responses/get \
  -H "Content-Type: application/json" \
  -d '{"json":{"userId":"test-user"}}' | jq '.json.responses'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Gateway HTTP port |
| `DS_PORT` | `4437` | Embedded Durable Streams port |
| `JWT_SECRET` | `skyclaw-dev-secret` | JWT signing secret |
| `SKYCLAW_ROOT` | `~/skyclaw` | Base directory for all data |
| `GATEWAY_URL` | `http://localhost:$PORT` | External URL embedded in sprite JWTs |
| `SPRITES_TOKEN` / `SPRITE_TOKEN` | — | Enables sprite wake orchestration from gateway (both supported) |
| `SPRITES_API_BASE_URL` | `https://api.sprites.dev` | Sprites API base URL |
| `SPRITE_NAME_PREFIX` | `skyclaw-` | Prefix for per-user sprite names |
| `SPRITE_SERVICE_NAME` | `handler` | Service name created/started on each sprite |
| `SPRITE_HANDLER_COMMAND` | `bunx @skyclaw/handler start` | Command run inside the sprite service (`SKYCLAW_TOKEN` is injected automatically) |
| `SPRITE_SERVICE_START_DURATION` | `2s` | How long to stream service logs during start |
| `SKYCLAW_AGENT_MODEL` | — | Optional model pattern passed to oh-my-pi (example: `openrouter/google/gemini-3-flash-preview`) |
| `SKYCLAW_TOKEN` | *(required for handler)* | JWT from gateway's `/api/token/:userId` |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (handler) |
| `OPENAI_API_KEY` | — | OpenAI API key (handler) |
| `OPENROUTER_API_KEY` | — | OpenRouter API key (handler) |

## Directory Layout

After running, `~/skyclaw/` will contain:

```
~/skyclaw/
├── data/
│   ├── streams/          # Durable Streams storage (gateway)
│   └── offsets-*.json    # Handler offset tracking
├── memory/               # pi-memory-md persistent storage
└── sessions/
    └── {userId}/
        └── .mcp.json     # MCP config for oh-my-pi
```

## Packages

| Package | Description |
|---------|-------------|
| `@skyclaw/schema` | Effect Schema events, stream paths, auth types |
| `@skyclaw/ds` | Durable Streams client helpers, offset stores |
| `@skyclaw/connections` | Channel adapters (HTTP for POC) |
| `@skyclaw/gateway` | Hono server + oRPC + MCP + embedded DS |
| `@skyclaw/agent` | oh-my-pi session management + MCP integration |
| `@skyclaw/handler` | Sprite entry point — DS reader + agent |
| `@skyclaw/sprites` | Sprites REST client + handler service orchestration |
