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
