# Gate — self-host with Docker

This folder builds and runs the **Gate web tier** (`apps/web`, Next.js 14) in a
container. It is honest about its scope: the web app needs **Supabase** (Auth +
Postgres + the Deno Edge Function that serves the MCP endpoint), and that is a
separate stack. This compose file does **not** spin up Supabase for you — it
builds the web app and ships a bare Postgres as a local stand-in only.

```
docker/
├── docker-compose.yml          # web (Next.js) + a minimal stand-in Postgres
├── Dockerfile.web              # multi-stage build of apps/web (context = repo root)
├── Dockerfile.web.dockerignore # trims the build context (BuildKit per-file ignore)
├── .env.example                # copy to .env and fill in
└── README.md
```

## What works, and what doesn't

| Piece | Covered here? |
| --- | --- |
| Web app (`apps/web`) build + serve on `:3000` | ✅ yes — `web` service |
| A Postgres to apply migrations / inspect data | ✅ yes — `db` service (bare Postgres, **not** Supabase) |
| Supabase **Auth** (email sign-in) | ❌ no — needs the Supabase stack |
| The **MCP endpoint** (`/functions/v1/mcp/<handle>`, the Deno edge function) | ❌ no — needs the Supabase stack |

The MCP endpoint and login are the whole point of Gate, so for anything beyond
"does the web app build and render" you must run a real Supabase instance and
point the web app at it (see [Full setup](#full-setup-real-supabase)).

## Quick start (web tier only)

From the **repo root**:

```sh
cp docker/.env.example docker/.env
# edit docker/.env — at minimum set NEXT_PUBLIC_SUPABASE_URL,
# NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to point at a
# Supabase instance (see "Full setup" below).

docker compose -f docker/docker-compose.yml up --build
```

The web app comes up on <http://localhost:3000>. Compose automatically loads
`docker/.env` (the compose file's directory is the project directory) for both
build args and runtime env — no `--env-file` flag required.

> **Build-time vs runtime.** `NEXT_PUBLIC_*` values are inlined into the browser
> bundle by `next build`, so they are passed as **build args** — change any of
> them and you must rebuild:
> ```sh
> docker compose -f docker/docker-compose.yml build web
> ```
> `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are read at **runtime**; a
> restart picks up changes.

Only want the web container (you already have Supabase elsewhere)? Skip the
stand-in Postgres:

```sh
docker compose -f docker/docker-compose.yml up --build web
```

## Full setup (real Supabase)

The web app talks to Supabase over `NEXT_PUBLIC_SUPABASE_URL`. Pick one backend:

### Option A — official Supabase self-host stack (recommended)

Follow <https://supabase.com/docs/guides/self-hosting/docker> to bring up the
full Supabase stack (Auth, PostgREST, Edge Runtime, Studio, Kong gateway). Then:

1. In `docker/.env`, set `NEXT_PUBLIC_SUPABASE_URL` to the Kong gateway
   (e.g. `http://localhost:8000`) and fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   and `SUPABASE_SERVICE_ROLE_KEY` from that stack.
2. Apply this repo's schema and serve the MCP function (from the repo root,
   with the [Supabase CLI](https://supabase.com/docs/guides/local-development)
   linked to that instance):
   ```sh
   supabase db push                              # apply supabase/migrations/*
   supabase functions serve mcp --no-verify-jwt  # the MCP endpoint
   ```
   `verify_jwt` is off for `mcp` by design — agents authenticate with bearer
   tokens from the `tokens` table, not Supabase JWTs (`supabase/config.toml`).
3. Rebuild the web image so the new `NEXT_PUBLIC_*` values are baked in, then
   bring it up:
   ```sh
   docker compose -f docker/docker-compose.yml up --build web
   ```

### Option B — `supabase start` (local dev stack on the host)

```sh
supabase start                                   # local Postgres + Auth + edge runtime
supabase db push                                 # apply migrations
supabase functions serve mcp --no-verify-jwt     # the MCP endpoint
supabase status                                  # read the URL + keys
```

Put the URL (`http://localhost:54321`) and keys from `supabase status` into
`docker/.env`, then `docker compose -f docker/docker-compose.yml up --build web`.

### Option C — hosted Supabase project

Set `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co` and the keys
from the project's API settings in `docker/.env`. Apply migrations and deploy
the function against the project:

```sh
supabase db push
supabase functions deploy mcp --no-verify-jwt
```

## About the bundled `db` service

`db` is a plain `postgres:15-alpine` published on host port **54322** (mirroring
`supabase/config.toml`'s local db port). It exists so you have a place to apply
migrations and poke at data without a full Supabase stack. It is **not**
Supabase: no Auth, no PostgREST, no Edge Runtime, so sign-in and the MCP
endpoint will not work against it. Data persists in the `gate-db-data` volume.

## Connecting an agent

Once a real Supabase instance is serving the `mcp` function and you have claimed
a handle + token in the web UI (Settings):

```
<NEXT_PUBLIC_SUPABASE_URL>/functions/v1/mcp/<handle>
Authorization: Bearer <token>
```

## Common commands

```sh
# Build only
docker compose -f docker/docker-compose.yml build web

# Up in the background
docker compose -f docker/docker-compose.yml up -d --build

# Tail logs
docker compose -f docker/docker-compose.yml logs -f web

# Stop and remove (keep the db volume)
docker compose -f docker/docker-compose.yml down

# Stop and also wipe the stand-in Postgres data
docker compose -f docker/docker-compose.yml down -v
```

## Notes

- **Build context is the repo root.** The Dockerfile needs the whole npm
  workspace (`apps/web` + `lib/` + `scripts/sync-shared.mjs`), so the compose
  `build.context` is `..`. Run compose from the repo root as shown above.
- **The `sync` step runs in the image.** `Dockerfile.web` runs `npm run sync`
  before `next build`, mirroring `lib/*` into `supabase/functions/_shared` and
  brand SVGs into `apps/web/public` — required for the `@shared/*` imports and
  brand assets to resolve. You do not need to run it on the host first.
