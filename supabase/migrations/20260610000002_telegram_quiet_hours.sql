-- Gate: Telegram connect + quiet hours (Phase 3).
-- Adds the per-user columns the Telegram approval push and the quiet-hours
-- digest need. The smallint columns store LOCAL hours (0-23). Existing
-- users_select_own / users_update_own policies already cover these new
-- columns, so no RLS changes are needed here.

alter table public.users
  add column tg_connect_code     uuid     not null default gen_random_uuid(),
  add column quiet_hours_enabled boolean  not null default true,
  add column quiet_start         smallint not null default 22,
  add column quiet_end           smallint not null default 8,
  add column tz                  text;

-- /start <code> on the bot looks the user up by this code (service role).
create index users_tg_connect_code_idx on public.users (tg_connect_code);

-- The digest job fans out over connected chats only.
create index users_tg_chat_id_idx on public.users (tg_chat_id)
  where tg_chat_id is not null;
