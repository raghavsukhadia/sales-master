create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid references public.dealers (id) on delete set null,
  visit_id uuid references public.visits (id) on delete set null,
  whatsapp_message_id uuid references public.whatsapp_messages (id) on delete set null,
  storage_bucket text not null,
  file_path text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  source text not null default 'upload',
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.attachments is
  'Files copied into Supabase Storage (CLAUDE.md §46), optionally linked to a dealer, visit, and/or the WhatsApp message they originated from.';

create index attachments_dealer_id_idx on public.attachments (dealer_id);
create index attachments_visit_id_idx on public.attachments (visit_id);
create index attachments_whatsapp_message_id_idx on public.attachments (whatsapp_message_id);


create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  actor_type public.actor_type not null default 'user',
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only trace of important actions (CLAUDE.md §48). Written only by trusted server contexts via the service-role client -- no authenticated-role INSERT policy exists (see 20260817170009_rls_policies.sql).';

create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_entity_idx on public.audit_logs (entity_table, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at);
