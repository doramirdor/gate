-- Gate: initial schema (v1).
-- RLS on everything. The only public read path is the MCP edge function,
-- which uses the service role and authenticates agents via token lookup.

-- ---------------------------------------------------------------------------
-- users — one row per human, keyed to the Supabase auth user.
-- ---------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  handle      text unique not null
              check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$'),
  tg_chat_id  text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles — the seven context sections, each {content, visibility}.
-- sections keys: identity, scheduling, dietary, sizes, budget, comms, custom
-- visibility: public | link | private
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id     uuid primary key references public.users (id) on delete cascade,
  sections    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tokens — bearer credentials agents present to the MCP endpoint.
-- The row id IS the bearer token (gen_random_uuid is crypto-strong).
-- scopes: "public", "approvals", and/or explicit section keys.
-- ---------------------------------------------------------------------------
create table public.tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  scopes      text[] not null,
  label       text,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create index tokens_user_idx on public.tokens (user_id);

-- ---------------------------------------------------------------------------
-- rules — v1 supports exactly two shapes:
--   {"type":"spend_threshold","amount":50,"currency":"USD","action":"ask"}
--   {"type":"always_allow","match":{"category":"groceries"}}
-- ---------------------------------------------------------------------------
create table public.rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  rule        jsonb not null
              check (rule->>'type' in ('spend_threshold', 'always_allow')),
  created_at  timestamptz not null default now()
);

create index rules_user_idx on public.rules (user_id);

-- ---------------------------------------------------------------------------
-- reads — audit trail of every get_context call.
-- ---------------------------------------------------------------------------
create table public.reads (
  id               uuid primary key default gen_random_uuid(),
  token_id         uuid not null references public.tokens (id) on delete cascade,
  agent_ua         text,
  scope_requested  text,
  ts               timestamptz not null default now()
);

create index reads_token_ts_idx on public.reads (token_id, ts desc);

-- ---------------------------------------------------------------------------
-- approvals — every request_approval call, pending until resolved.
-- signature column is reserved for later; unused in v1.
-- ---------------------------------------------------------------------------
create table public.approvals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  agent_ua     text,
  action_desc  text not null,
  amount       numeric,
  currency     text,
  category     text,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'denied', 'expired')),
  ts           timestamptz not null default now(),
  resolved_ts  timestamptz,
  signature    text
);

create index approvals_user_status_idx on public.approvals (user_id, status, ts desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: owners only. No anon policies — the public profile
-- page and the MCP endpoint go through the service role, which filters by
-- section visibility / token scopes in code.
-- ---------------------------------------------------------------------------
alter table public.users     enable row level security;
alter table public.profiles  enable row level security;
alter table public.tokens    enable row level security;
alter table public.rules     enable row level security;
alter table public.reads     enable row level security;
alter table public.approvals enable row level security;

create policy users_select_own on public.users
  for select using (auth.uid() = id);
create policy users_insert_own on public.users
  for insert with check (auth.uid() = id);
create policy users_update_own on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy tokens_select_own on public.tokens
  for select using (auth.uid() = user_id);
create policy tokens_insert_own on public.tokens
  for insert with check (auth.uid() = user_id);
create policy tokens_update_own on public.tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tokens_delete_own on public.tokens
  for delete using (auth.uid() = user_id);

create policy rules_select_own on public.rules
  for select using (auth.uid() = user_id);
create policy rules_insert_own on public.rules
  for insert with check (auth.uid() = user_id);
create policy rules_delete_own on public.rules
  for delete using (auth.uid() = user_id);

-- reads are written only by the service role; owners can audit their own.
create policy reads_select_own on public.reads
  for select using (
    exists (
      select 1 from public.tokens t
      where t.id = token_id and t.user_id = auth.uid()
    )
  );

-- approvals are inserted only by the service role; owners read and resolve.
create policy approvals_select_own on public.approvals
  for select using (auth.uid() = user_id);
create policy approvals_update_own on public.approvals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- handle_available — lets the onboarding flow check handles without a
-- policy that exposes the users table.
-- ---------------------------------------------------------------------------
create function public.handle_available(h text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.users where handle = lower(h)
  );
$$;

revoke all on function public.handle_available(text) from public;
grant execute on function public.handle_available(text) to anon, authenticated;
