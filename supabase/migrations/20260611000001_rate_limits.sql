-- Per-token rate limiting for the MCP endpoint.
-- The edge function calls check_rate_limit() before processing tool calls.

create table public.rate_limits (
  token_id      uuid not null references public.tokens (id) on delete cascade,
  window_start  timestamptz not null,
  count         int not null default 1,
  primary key (token_id, window_start)
);

alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_token_id uuid,
  p_limit    int default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (token_id, window_start, count)
  values (p_token_id, date_trunc('minute', now()), 1)
  on conflict (token_id, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  delete from public.rate_limits where window_start < now() - interval '5 minutes';

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(uuid, int) from public;
grant execute on function public.check_rate_limit(uuid, int) to service_role;
