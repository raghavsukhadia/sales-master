-- Concurrent-safe WhatsApp session assignment for inbound registered salesmen.
-- Closes stale open sessions for the salesman, then reuses a recent open
-- session or creates a new one. Uses an advisory lock per salesman_id so
-- concurrent webhooks do not create duplicate sessions.

create index if not exists whatsapp_sessions_salesman_status_last_msg_idx
  on public.whatsapp_sessions (salesman_id, status, last_message_at desc);

create or replace function public.assign_whatsapp_session(
  p_salesman_id uuid,
  p_message_at timestamptz,
  p_timeout_seconds integer default 1800
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_cutoff timestamptz;
begin
  if p_salesman_id is null then
    raise exception 'assign_whatsapp_session: salesman_id is required';
  end if;

  if p_timeout_seconds is null or p_timeout_seconds < 1 then
    raise exception 'assign_whatsapp_session: timeout_seconds must be >= 1';
  end if;

  -- Serialize assign/create for this salesman within the transaction.
  perform pg_advisory_xact_lock(hashtext(p_salesman_id::text));

  v_cutoff := coalesce(p_message_at, now()) - make_interval(secs => p_timeout_seconds);

  select id
  into v_session_id
  from public.whatsapp_sessions
  where salesman_id = p_salesman_id
    and status = 'open'
    and last_message_at >= v_cutoff
  order by last_message_at desc
  limit 1
  for update;

  if v_session_id is not null then
    update public.whatsapp_sessions
    set last_message_at = coalesce(p_message_at, now())
    where id = v_session_id;
    return v_session_id;
  end if;

  -- Close any remaining open (stale) sessions for this salesman.
  update public.whatsapp_sessions
  set status = 'closed'
  where salesman_id = p_salesman_id
    and status = 'open';

  insert into public.whatsapp_sessions (salesman_id, status, started_at, last_message_at)
  values (
    p_salesman_id,
    'open',
    coalesce(p_message_at, now()),
    coalesce(p_message_at, now())
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

comment on function public.assign_whatsapp_session(uuid, timestamptz, integer) is
  'Reuse a recent open WhatsApp session for a salesman or create a new one. Advisory-locked against concurrent duplicates. Default timeout 1800s (30m).';

revoke all on function public.assign_whatsapp_session(uuid, timestamptz, integer) from public;
revoke all on function public.assign_whatsapp_session(uuid, timestamptz, integer) from anon, authenticated;
grant execute on function public.assign_whatsapp_session(uuid, timestamptz, integer) to service_role;
