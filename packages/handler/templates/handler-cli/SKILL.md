---
name: handler-cli
description: Skyclaw handler CLI commands and usage
---

The Skyclaw handler is invoked as a CLI tool. Here are the available commands:

### `skyclaw-handler start`

Process pending messages from the user's DS inbox. This is the main handler flow:
1. Initializes the ~/skyclaw/ directory structure
2. Syncs built-in skill templates
3. Loads configuration from the SKYCLAW_TOKEN environment variable
4. Reads pending messages from the Durable Streams inbox
5. Processes each message through the oh-my-pi agent with MCP tools
6. Saves the stream offset for next invocation

**Options:**
- `--token <token>` — Override the JWT token (default: reads SKYCLAW_TOKEN env var)

### `skyclaw-handler update`

Sync built-in skill templates and list all installed skills.

**Options:**
- `--json` — Output skill list as JSON

### `skyclaw-handler status`

Display environment status including:
- Whether SKYCLAW_TOKEN is set
- Directory paths and their existence
- Installed skills

**Options:**
- `--json` — Output status as JSON

### Environment Variables

- `SKYCLAW_TOKEN` — JWT token containing userId and gatewayUrl (required for `start`)
- `JWT_SECRET` — Secret for token verification (default: `skyclaw-dev-secret`)
