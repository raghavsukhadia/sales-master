-- Persist deterministic business-resolution proposals derived from successful
-- AI extractions. Proposals only — no dealer/visit/follow-up mutations.

create type public.business_resolution_status as enum (
  'ready_for_confirmation',
  'needs_clarification',
  'not_actionable'
);

create table public.whatsapp_session_business_resolutions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.whatsapp_sessions (id) on delete cascade,
  extraction_id uuid not null references public.whatsapp_session_extractions (id) on delete cascade,
  schema_version text not null,
  resolver_version text not null,
  status public.business_resolution_status not null,
  resolution jsonb not null,
  proposed_dealer_id uuid references public.dealers (id) on delete set null,
  resolved_visit_date date,
  resolved_follow_up_date date,
  error_message text,
  attempt_count integer not null default 1 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint whatsapp_session_business_resolutions_unique_version
    unique (extraction_id, schema_version, resolver_version)
);

comment on table public.whatsapp_session_business_resolutions is
  'Deterministic interpretation of a validated WhatsApp extraction. Proposal only — confirmation/mutations happen later.';

create index whatsapp_session_business_resolutions_session_id_idx
  on public.whatsapp_session_business_resolutions (session_id);

create index whatsapp_session_business_resolutions_status_idx
  on public.whatsapp_session_business_resolutions (status);

create index whatsapp_session_business_resolutions_extraction_id_idx
  on public.whatsapp_session_business_resolutions (extraction_id);

create trigger set_updated_at before update on public.whatsapp_session_business_resolutions
  for each row execute function public.set_updated_at();

alter table public.whatsapp_session_business_resolutions enable row level security;

create policy whatsapp_session_business_resolutions_select_admin_manager
  on public.whatsapp_session_business_resolutions
  for select
  using ((select public.is_admin_or_manager()));
