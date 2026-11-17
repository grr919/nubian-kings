-- Single controlling browser session per human multiplayer seat.
-- Room control is distinct from Supabase login: the same account may view on many devices.
-- All direct table access remains server-only; normal users cannot execute the lease RPC.
create table if not exists public.nk_seat_control_leases (
  room_code text not null references public.nk_multiplayer_rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
alter table public.nk_seat_control_leases enable row level security;
revoke all on public.nk_seat_control_leases from public, anon, authenticated;
create index if not exists nk_seat_control_expiry_idx on public.nk_seat_control_leases(expires_at);

create or replace function public.nk_seat_control_lease(
  p_room_code text,
  p_user_id uuid,
  p_token_hash text,
  p_action text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare changed_count integer;
begin
  if p_room_code !~ '^[A-Z2-9]{6}$' or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_user_id is null then return false; end if;

  if p_action in ('ensure', 'takeover') then
    insert into public.nk_seat_control_leases
      (room_code,user_id,token_hash,expires_at,updated_at)
    values (p_room_code,p_user_id,p_token_hash,now() + interval '45 seconds',now())
    on conflict (room_code,user_id) do update
      set token_hash=excluded.token_hash,
          expires_at=excluded.expires_at,
          updated_at=excluded.updated_at
      where p_action = 'takeover'
        or public.nk_seat_control_leases.expires_at <= now()
        or public.nk_seat_control_leases.token_hash=excluded.token_hash;
    get diagnostics changed_count = row_count;
    return changed_count = 1;
  elsif p_action = 'renew' then
    update public.nk_seat_control_leases
      set expires_at=now() + interval '45 seconds', updated_at=now()
      where room_code=p_room_code and user_id=p_user_id
        and token_hash=p_token_hash and expires_at>now();
    get diagnostics changed_count = row_count;
    return changed_count=1;
  elsif p_action = 'check' then
    return exists (
      select 1 from public.nk_seat_control_leases
      where room_code=p_room_code and user_id=p_user_id
        and token_hash=p_token_hash and expires_at>now()
    );
  end if;
  return false;
end;
$$;
revoke all on function public.nk_seat_control_lease(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.nk_seat_control_lease(text,uuid,text,text) to service_role;
