# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gate is a permission wall between AI agents and the human they act for. A human claims a handle, fills in a profile of context sections, and gets an MCP endpoint plus bearer tokens. Agents call three MCP tools: `get_context` (read scoped profile sections), `request_approval` (ask before spending/sending/irreversible actions), and `check_approval` (poll a pending request). Every read and approval is logged.

Two deployables share pure-TS logic:
- **`apps/web`** — Next.js 14 (App Router) app: landing, onboarding, profile editor, public `[handle]` page, settings. Talks to Supabase via `@supabase/ssr`.
- **`supabase/functions/mcp`** — a Deno edge function serving the MCP Streamable HTTP endpoint at `POST /functions/v1/mcp/{handle}`.

## Commands

```sh
npm run dev              # sync shared files, then run web app on :3000
npm run build            # sync + next build
npm run sync             # mirror shared modules (see "The sync step" below) — run after editing lib/ or public/brand/
npm run test:functions   # Deno test suite for the MCP edge function
npm run db:migrate       # supabase db push
npm run functions:deploy # sync + deploy the mcp function (--no-verify-jwt)
```

Run a single edge-function test: `deno test supabase/functions/tests/mcp.test.ts --filter "<test name>"`.

Local stack (see README): `supabase start`, `supabase db push`, `supabase functions serve mcp --no-verify-jwt`, then `npm run dev`. Requires Node 20+, Supabase CLI, and Deno (for tests).

## The sync step (critical, non-obvious)

`scripts/sync-shared.mjs` copies files across package boundaries that cannot import each other:
- `lib/brand.ts` and `lib/profile.ts` → `supabase/functions/_shared/` (Deno only bundles files under `supabase/functions/`).
- `public/brand/*.svg` → `apps/web/public/brand/` (Next serves its own public dir).

**`lib/` is the source of truth; the copies under `_shared/` are auto-generated — never edit them by hand.** After editing `lib/brand.ts`, `lib/profile.ts`, or brand SVGs, run `npm run sync` (it also runs automatically before dev/build/deploy). Tests fail or run stale if the mirror is missing.

The web app imports shared modules as `@shared/*` (maps to `lib/*`); the edge function imports them as `../_shared/*`. Web-local imports use `@/*`.

## Renaming the product

Every product string (name, domain, tagline, signature, footer) lives in `lib/brand.ts`. Change it there and run `npm run sync` to rename the running product everywhere in code. Only the README prose and the repo name are hand-edited.

## Profile / scope model (`lib/profile.ts`)

Seven section keys: `identity, scheduling, dietary, sizes, budget, comms, custom`. Each section has `{ content, visibility }` where visibility is `public | link | private`.

Token scopes gate what an agent reads:
- `public` scope → every section at `public` or `link` visibility (not `private`).
- A section key in scopes → that section at any visibility (unlocks `private`).
- A `write:<key>` scope → write access to that section via `update_profile` (implies read). Per-section; there is no global write scope. `permittedSectionKeys()` treats it as read; `writableSectionKeys()` / `canWriteSection()` gate writes.
- `approvals` scope → required for `request_approval` / `check_approval`.

`permittedSectionKeys()` enforces this; `renderProfileMarkdown()` produces the exact markdown agents receive. This logic is shared by the editor preview, the public page, and the MCP function — change it in one place.

Note: the `identity` DB key is labeled **"About"** in the UI (`SECTION_LABELS`). Editor visibility defaults come from `DEFAULT_VISIBILITY`.

## MCP edge function architecture

- `mcp/handlers.ts` — **pure logic**: JSON-RPC handling, the three tools, auth, footer. Persistence is injected via the `Db` interface and the clock via `now()`, so the test suite runs entirely in-memory with no live database. Put new tool/auth logic here.
- `mcp/index.ts` — the only impure part: wires `Db` to a service-role Supabase client and `Deno.serve`. Thin.
- Auth: the bearer token **is** the `tokens` table row id (a crypto-strong UUID). `resolveAuth` validates UUID shape, looks up the token, rejects revoked tokens, and confirms the token belongs to the requested handle. `verify_jwt` is OFF for this function (`config.toml`) because agents use these tokens, not Supabase JWTs.
- Every successful MCP response gets the brand footer appended (`withFooter`). Tests assert on it.
- Approvals auto-resolve via `rules`: an `always_allow` rule matching the category, or a `spend_threshold` rule where amount is under the limit → `approved` instantly; otherwise `pending` with a 15-minute TTL (`APPROVAL_TTL_MS`). Expiry is computed lazily in `check_approval`.
- When an approval lands `pending`, `requestApproval` calls the **optional** `Ctx.notify` hook (never for auto-approved). It is optional so the in-memory tests construct `Ctx` without it. `mcp/index.ts` implements `notify` as a Telegram push; a push failure is swallowed and never changes the tool response.
- `supabase/functions/telegram/` is the bot: `bot.ts` is pure (routing, callback/`/start` parsing, the auto-approve digest heuristic), `index.ts` is the impure webhook + digest endpoint. `/start <tg_connect_code>` links a chat; inline buttons use `callback_data` `a:<id>` / `d:<id>` / `aa:<id>` and resolve approvals with the **same idempotent `status='pending'`-guarded semantics** as the web inbox actions. `verify_jwt` is OFF (it gets a Telegram secret-token header, not a Supabase JWT).

## Database & security model (`supabase/migrations/`)

RLS is on for every table, owner-only policies (`auth.uid() = user_id`). **There are no anon read policies.** The two public read paths both go through the service role and filter in code, never via RLS:
- The public `[handle]` page (web) — visibility-filtered.
- The MCP edge function — token-scope-filtered.

Tables: `users` (handle + auth fk), `profiles` (sections jsonb), `tokens` (id = bearer, scopes[], revoked_at), `rules` (the two auto-approve shapes), `reads` (get_context audit), `approvals`. Handle availability is checked via the `handle_available` security-definer RPC so onboarding never needs read access to `users`.

## Web app conventions

- Server actions live in `app/actions.ts`; all mutations call `requireUser()` and rely on RLS. `sanitizeSections()` clamps/validates section input before any write.
- `app/api/structure/route.ts` is the one Anthropic call: it structures pasted onboarding text into sections using `claude-opus-4-8` with a JSON-schema output. Needs `ANTHROPIC_API_KEY`; everything else works without it (onboarding offers "skip, start empty").
- Three Supabase clients: `lib/supabase/server.ts` (RLS, server components/actions), `client.ts` (browser), `service.ts` (service-role, RLS-bypassing — only the public page and account deletion; always filter results).
- `middleware.ts` refreshes the session and gate-keeps `/onboarding`, `/editor`, `/settings`, `/inbox`, `/log`.
- Approval inbox (`/inbox`) and audit log (`/log`): the inbox renders pending approvals with Approve/Deny and the **trust-ladder** "Always allow {category}" tap (`alwaysAllowApproval` writes the `always_allow` rule — the only way that rule shape gets created). The log merges `reads` + `approvals` into one timeline. Both empty states use guardrail framing ("Gate is standing by…"), never "0 reads".
- Settings also holds Telegram connect (deep-links `https://t.me/<NEXT_PUBLIC_TELEGRAM_BOT>?start=<tg_connect_code>`) and the quiet-hours dial.
- Handle validation and the reserved-handle list are in `lib/handles.ts` — keep `RESERVED_HANDLES` in sync with real routes.

## Integrations & self-host

- `integrations/openclaw-skill/` — drop-in skill (SKILL.md + remote-MCP config) that makes an agent call `get_context` at session start and route actions through `request_approval`.
- `integrations/claude-code-hook/gate-hook.mjs` — a PreToolUse hook (Node, no deps) that intercepts sensitive Bash commands and blocks on `request_approval`. **Fails safe**: anything other than an explicit `approved` (including an unreachable Gate) denies.
- `docker/` — `docker-compose.yml` + `Dockerfile.web` self-host the web tier; the bundled Postgres is only a stand-in. Auth + the edge functions need the official Supabase self-host stack (the README and `docker/README.md` say so plainly).

## Still reserved (genuinely unbuilt)

The `approvals.signature` column is reserved for a future E2E-signature feature and is unused in v1. The quiet-hours digest endpoint (`telegram/index.ts` `/digest`) fans out to all connected users rather than doing true 09:00-local targeting — wire it to an hourly/daily cron.
