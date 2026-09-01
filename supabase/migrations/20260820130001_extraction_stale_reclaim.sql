-- Harden extraction claiming: track processing_started_at, reclaim stale
-- processing rows, bound attempts, and terminal-fail exhausted retries.
-- Does not rewrite the previous migration; replaces the claim RPC in place.

alter table public.whatsapp_session_extractions
  add column if not exists processing_started_at timestamptz;

comment on column public.whatsapp_session_extractions.processing_started_at is
  'Set whenever status becomes processing. Used to reclaim stale claims after worker crashes.';

-- Backfill active processing rows so they become reclaimable after the stale window.
update public.whatsapp_session_extractions
set processing_started_at = coalesce(processing_started_at, updated_at, created_at)
where status = 'processing'
  and processing_started_at is null;

create index if not exists whatsapp_session_extractions_processing_started_idx
  on public.whatsapp_session_extractions (status, processing_started_at)
  where status = 'processing';

create or replace function public.claim_whatsapp_sessions_for_extraction(
  p_schema_version text,
  p_prompt_version text,
  p_timeout_seconds integer default 1800,
  batch_size integer default 5,
  p_stale_processing_seconds integer default 900,
  p_max_attempts integer default 5
)
returns table (session_id uuid, extraction_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_schema_version is null or length(trim(p_schema_version)) = 0 then
    raise exception 'claim_whatsapp_sessions_for_extraction: schema_version required';
  end if;
  if p_prompt_version is null or length(trim(p_prompt_version)) = 0 then
    raise exception 'claim_whatsapp_sessions_for_extraction: prompt_version required';
  end if;
  if p_timeout_seconds is null or p_timeout_seconds < 1 then
    raise exception 'claim_whatsapp_sessions_for_extraction: timeout_seconds must be >= 1';
  end if;
  if batch_size is null or batch_size < 1 then
    raise exception 'claim_whatsapp_sessions_for_extraction: batch_size must be >= 1';
  end if;
  if p_stale_processing_seconds is null or p_stale_processing_seconds < 1 then
    raise exception 'claim_whatsapp_sessions_for_extraction: stale_processing_seconds must be >= 1';
  end if;
  if p_max_attempts is null or p_max_attempts < 1 then
    raise exception 'claim_whatsapp_sessions_for_extraction: max_attempts must be >= 1';
  end if;

  -- Close open sessions past inactivity window.
  update public.whatsapp_sessions s
  set status = 'closed'
  where s.status = 'open'
    and s.last_message_at < now() - make_interval(secs => p_timeout_seconds);

  -- Terminal-fail exhausted attempts (failed or stale processing beyond max).
  update public.whatsapp_session_extractions e
  set
    status = 'failed',
    error_category = 'unknown',
    error_message = coalesce(
      e.error_message,
      'Exceeded max extraction attempts'
    ),
    completed_at = coalesce(e.completed_at, now()),
    updated_at = now()
  where e.schema_version = p_schema_version
    and e.prompt_version = p_prompt_version
    and e.attempt_count >= p_max_attempts
    and e.status in ('failed', 'processing')
    and (
      e.status = 'failed'
      or (
        e.status = 'processing'
        and coalesce(e.processing_started_at, e.updated_at) < now() - make_interval(secs => p_stale_processing_seconds)
      )
    )
    and coalesce(e.error_message, '') not like 'Exceeded max extraction attempts%';

  -- Explicitly mark exhausted stale processing with the terminal message.
  update public.whatsapp_session_extractions e
  set
    status = 'failed',
    error_category = 'unknown',
    error_message = 'Exceeded max extraction attempts',
    completed_at = coalesce(e.completed_at, now()),
    updated_at = now()
  where e.schema_version = p_schema_version
    and e.prompt_version = p_prompt_version
    and e.attempt_count >= p_max_attempts
    and e.status = 'processing'
    and coalesce(e.processing_started_at, e.updated_at) < now() - make_interval(secs => p_stale_processing_seconds);

  return query
  with eligible as (
    select s.id
    from public.whatsapp_sessions s
    where s.status = 'closed'
      and s.salesman_id is not null
      and exists (
        select 1
        from public.whatsapp_messages m
        where m.session_id = s.id
          and m.direction = 'in'
      )
      and not exists (
        select 1
        from public.whatsapp_session_extractions e
        where e.session_id = s.id
          and e.schema_version = p_schema_version
          and e.prompt_version = p_prompt_version
          and (
            e.status = 'succeeded'
            or (
              e.status = 'processing'
              and coalesce(e.processing_started_at, e.updated_at)
                >= now() - make_interval(secs => p_stale_processing_seconds)
            )
            or (
              e.status = 'failed'
              and e.attempt_count >= p_max_attempts
            )
          )
      )
    order by s.last_message_at asc
    limit batch_size
    for update skip locked
  ),
  upserted as (
    insert into public.whatsapp_session_extractions as e (
      session_id,
      schema_version,
      prompt_version,
      status,
      attempt_count,
      processing_started_at,
      error_message,
      validation_errors,
      completed_at
    )
    select
      eligible.id,
      p_schema_version,
      p_prompt_version,
      'processing'::public.session_extraction_status,
      1,
      now(),
      null,
      null,
      null
    from eligible
    on conflict (session_id, schema_version, prompt_version)
    do update set
      status = 'processing',
      attempt_count = e.attempt_count + 1,
      processing_started_at = now(),
      error_message = null,
      validation_errors = null,
      raw_output = null,
      parsed_output = null,
      error_category = null,
      completed_at = null,
      updated_at = now()
    where
      e.status = 'failed'
      or (
        e.status = 'processing'
        and coalesce(e.processing_started_at, e.updated_at)
          < now() - make_interval(secs => p_stale_processing_seconds)
        and e.attempt_count < p_max_attempts
      )
    returning e.session_id, e.id
  )
  select upserted.session_id, upserted.id
  from upserted;
end;
$$;

comment on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer, integer, integer) is
  'Close stale sessions and claim extraction work. Reclaims processing older than p_stale_processing_seconds. Caps attempts at p_max_attempts.';

-- Drop old 4-arg overload if present so callers use the new signature.
drop function if exists public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer);

revoke all on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer, integer, integer) from public;
revoke all on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer, integer, integer) from anon, authenticated;
grant execute on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer, integer, integer) to service_role;
