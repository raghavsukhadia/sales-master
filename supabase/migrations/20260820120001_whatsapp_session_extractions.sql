-- Session-level AI extraction artifacts (Phase 1: extract + validate only).
-- Distinct from public.ai_extractions, which is message-oriented and tracks
-- later "applied" business mutations. This table stores the durable
-- interpretation of a whole WhatsApp session before any dealer/visit writes.

create type public.session_extraction_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed'
);

create table public.whatsapp_session_extractions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.whatsapp_sessions (id) on delete cascade,
  schema_version text not null,
  prompt_version text not null,
  status public.session_extraction_status not null default 'pending',
  model text,
  raw_output text,
  parsed_output jsonb,
  validation_errors jsonb,
  error_message text,
  error_category text,
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint whatsapp_session_extractions_unique_version
    unique (session_id, schema_version, prompt_version)
);

comment on table public.whatsapp_session_extractions is
  'AI extraction artifact for a WhatsApp session. Interpretation only — business mutations happen later from validated parsed_output.';

comment on column public.whatsapp_session_extractions.raw_output is
  'Raw model text response for debugging. Never store API keys.';

comment on column public.whatsapp_session_extractions.parsed_output is
  'Zod-validated extraction JSON when status = succeeded.';

comment on column public.whatsapp_session_extractions.validation_errors is
  'Structured Zod/parse failures when status = failed.';

comment on column public.whatsapp_session_extractions.error_category is
  'provider | malformed | validation | persistence | unknown';

create index whatsapp_session_extractions_session_id_idx
  on public.whatsapp_session_extractions (session_id);

create index whatsapp_session_extractions_status_idx
  on public.whatsapp_session_extractions (status);

create trigger set_updated_at before update on public.whatsapp_session_extractions
  for each row execute function public.set_updated_at();

alter table public.whatsapp_session_extractions enable row level security;

-- Same pattern as whatsapp_messages: admin/manager read-only; writes via service_role.
create policy whatsapp_session_extractions_select_admin_manager
  on public.whatsapp_session_extractions
  for select
  using ((select public.is_admin_or_manager()));

/**
 * Close inactive open sessions, then claim closed sessions eligible for
 * extraction (registered salesman, at least one inbound message, no
 * succeeded/processing row for this schema+prompt version).
 * Concurrent-safe via FOR UPDATE SKIP LOCKED on sessions.
 */
create or replace function public.claim_whatsapp_sessions_for_extraction(
  p_schema_version text,
  p_prompt_version text,
  p_timeout_seconds integer default 1800,
  batch_size integer default 5
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

  -- Close open sessions past inactivity window so they become extractable.
  update public.whatsapp_sessions s
  set status = 'closed'
  where s.status = 'open'
    and s.last_message_at < now() - make_interval(secs => p_timeout_seconds);

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
          and e.status in ('succeeded', 'processing')
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
      null,
      null,
      null
    from eligible
    on conflict (session_id, schema_version, prompt_version)
    do update set
      status = 'processing',
      attempt_count = e.attempt_count + 1,
      error_message = null,
      validation_errors = null,
      raw_output = null,
      parsed_output = null,
      error_category = null,
      completed_at = null,
      updated_at = now()
    where e.status = 'failed'
    returning e.session_id, e.id
  )
  select upserted.session_id, upserted.id
  from upserted;
end;
$$;

comment on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer) is
  'Close stale open sessions and claim closed sessions for AI extraction. Idempotent per (session, schema_version, prompt_version).';

revoke all on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer) from public;
revoke all on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer) from anon, authenticated;
grant execute on function public.claim_whatsapp_sessions_for_extraction(text, text, integer, integer) to service_role;
