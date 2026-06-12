-- Gate: waitlist for the (coming soon) agent-built setup flow.
-- Captures emails from the public landing page. There are NO RLS policies:
-- the only writer is the joinWaitlist server action via the service role,
-- mirroring how the public read paths bypass RLS and filter in code.

create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text,
  created_at  timestamptz not null default now()
);

-- Dedupe on the normalized email; the action lower-cases before insert and
-- treats a unique violation as success.
create unique index waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;
