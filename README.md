<p align="left">
  <img src="public/brand/wordmark.svg" alt="gate" height="40" />
</p>

**Your agent asks you first.**

One link per human. AI agents read it for context, route through it for permission, and every interaction is logged. "Confirm before acting" in a prompt is a suggestion — Gate is a wall.

> Renaming note: every product string (name, domain, tagline, signature) in the *app* lives in [`lib/brand.ts`](lib/brand.ts) — changing it there renames the running product. Run `npm run sync` after editing. Two things stay hand-edited: this README's prose and the repo name.

## Self-host

### Docker (one stack)

```sh
git clone <this repo> && cd gate-server
cp docker/.env.example docker/.env       # fill values, then:
docker compose -f docker/docker-compose.yml up
```

This builds and runs the web app (`apps/web`) on :3000. Honest caveat: the MCP endpoint and auth live in Supabase Auth + Edge Functions, which this compose file does **not** fully stand up. Point `docker/.env` at a hosted Supabase project, or run the official [Supabase self-host stack](https://supabase.com/docs/guides/self-hosting/docker) alongside it — then apply migrations and serve the functions (see below). See [`docker/README.md`](docker/README.md) for the full walkthrough.

### Local dev (Supabase CLI)

Requirements: Node 20+, [Supabase CLI](https://supabase.com/docs/guides/local-development), Deno (optional, for the function test suite).

```sh
git clone <this repo> && cd gate-server
npm install
supabase start                                      # local Postgres + Auth + edge runtime
supabase db push                                    # apply migrations
supabase functions serve mcp --no-verify-jwt &      # the MCP endpoint
supabase functions serve telegram --no-verify-jwt & # approval pushes (optional)
cp .env.example .env.local                          # fill values from `supabase status`
npm run dev                                          # web app on :3000
```

Set in `.env.local` (see [.env.example](.env.example)): the Supabase URL + keys from `supabase status`, and `ANTHROPIC_API_KEY` for the paste-import step of onboarding (everything else works without it — onboarding offers "skip, start empty"). For the Telegram approval pushes, set `NEXT_PUBLIC_TELEGRAM_BOT` (the bot @username, web side); the `telegram` edge function additionally reads `TELEGRAM_BOT_TOKEN` and the optional `TELEGRAM_WEBHOOK_SECRET`.

## Hosted

Claim your link at the hosted instance (domain in [`lib/brand.ts`](lib/brand.ts)) — handle, one paste, done in under two minutes.

## Connect an agent

Your endpoint (shown in Settings after you claim):

```
https://<your-supabase-project>.supabase.co/functions/v1/mcp/<handle>
Authorization: Bearer <token>
```

The token carries scopes: `public` for context, `approvals` for the approval tools, and/or explicit section keys to unlock private sections. Mint and revoke tokens in Settings.

### Claude Desktop (remote MCP)

```json
{
  "mcpServers": {
    "gate": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://<project>.supabase.co/functions/v1/mcp/<handle>",
        "--header", "Authorization: Bearer <token>"
      ]
    }
  }
}
```

### OpenClaw skill

A drop-in skill lives in [`integrations/openclaw-skill/`](integrations/openclaw-skill). Register Gate as a remote MCP server (edit the placeholders in [`integrations/openclaw-skill/gate.json`](integrations/openclaw-skill/gate.json)), then drop the skill folder into your agent:

```json
{
  "mcpServers": {
    "gate": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://<project>.supabase.co/functions/v1/mcp/<handle>",
        "--header", "Authorization: Bearer <token>"
      ]
    }
  }
}
```

The skill makes the agent call `get_context(scope:"all")` at session start and treat the returned markdown as the source of truth about the human — replacing any hand-rolled profile file. Before spending money, sending a message, or anything irreversible, it calls `request_approval` and polls `check_approval` until the request is `approved` (proceed) or `denied`/`expired` (stop, and tell the user). The token needs both the `public` and `approvals` scopes. Full install notes: [`integrations/openclaw-skill/README.md`](integrations/openclaw-skill/README.md).

### Claude Code hook

A `PreToolUse` hook in [`integrations/claude-code-hook/`](integrations/claude-code-hook) intercepts sensitive `Bash` commands (payments, `curl`/`wget` POSTs, `rm -rf`, force-pushes, `DROP TABLE`, …) and blocks on Gate's `request_approval` until you approve. If Gate is unreachable it fails **safe** — it blocks, because a wall is not a suggestion.

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node /absolute/path/to/integrations/claude-code-hook/gate-hook.mjs" }
        ]
      }
    ]
  },
  "env": {
    "GATE_MCP_URL": "https://<project>.supabase.co/functions/v1/mcp/<handle>",
    "GATE_TOKEN": "<token-with-approvals-scope>"
  }
}
```

Customize the sensitive-pattern list via `GATE_SENSITIVE_PATTERNS` (comma-separated regexes). Details: [`integrations/claude-code-hook/README.md`](integrations/claude-code-hook/README.md).

## The three tools

| Tool | What it does |
| --- | --- |
| `get_context(scope)` | Returns the profile sections the token permits, as markdown. Every response ends with the Gate footer. Logged to `reads`. |
| `request_approval(action_desc, amount?, currency?, category?)` | Pre-cleared (always-allow category, or under the spend threshold) → `approved` instantly, logged. Otherwise `pending` — the human resolves it; expires in 15 minutes. |
| `check_approval(approval_id)` | Poll until `approved` / `denied` / `expired`. |

On the wire (MCP JSON-RPC 2.0 over `POST .../mcp/<handle>`):

```jsonc
// request_approval — requires a token with the "approvals" scope
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{
  "name":"request_approval",
  "arguments":{"action_desc":"Refund order #1841","amount":42,"currency":"USD","category":"payments"}}}
// -> result.structuredContent: { "approval_id": "...", "status": "pending" }

// poll every ~3s while "pending"; stop on approved / denied / expired
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{
  "name":"check_approval","arguments":{"approval_id":"<id>"}}}
```

Token scopes: `public` (everything marked Public or Link-only), `approvals`, and/or explicit section keys (`identity`, `scheduling`, `dietary`, `sizes`, `budget`, `comms`, `custom`) which unlock a section even when Private. A `write:<key>` scope (e.g. `write:budget`) lets an agent edit that section via `update_profile`, and implies read of it.

## When an agent asks

The human side of the wall lives in the web app:

- **Inbox** (`/inbox`) — pending requests show up as cards with the action, amount, category, and the agent that asked. Approve, Deny, or "Always allow {category}" to clear that category next time. Resolved history sits below.
- **Audit log** (`/log`) — a merged timeline of every context read and every approval: agent, scope or action, outcome. Nothing an agent does is invisible.
- **Telegram** — connect your account in **Settings** and pending approvals are pushed to your phone with inline Approve / Deny / Always-allow buttons; resolving there and resolving in the inbox are identical and idempotent. Auto-approved confirmations are never pushed live — they're batched into a daily **quiet-hours digest** instead.

Reserved, not yet wired: the `approvals.signature` column is held for a future end-to-end signature on approvals — it is currently unused.

## Tests

```sh
npm run test:functions   # scope enforcement, revocation, footer, approval rules, expiry,
                         # and the rogue inbox-deletion interception fixture
```

The Telegram approval push is an **optional** `notify` hook on the MCP context, so the suite still runs fully without a live database. The quiet-hours digest is a `POST /functions/v1/telegram/digest` endpoint meant to be driven on a schedule (pg_cron or an external scheduler) — a daily call to all connected users is fine for v1.

## Repo layout

```
/lib               brand.ts (single naming source) + profile.ts (sections, scopes, renderer)
/apps/web          Next.js app — landing, onboarding, editor, public page, settings, inbox, audit log
/supabase          migrations + edge functions (mcp/, telegram/)
/integrations      openclaw-skill/, claude-code-hook/
/docker            docker-compose self-host (web tier) + Dockerfile.web
/public/brand      logo SVGs (canonical; synced to apps/web/public/brand)
```

MIT licensed.
