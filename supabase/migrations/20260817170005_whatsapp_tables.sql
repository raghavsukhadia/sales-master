create table public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  salesman_id uuid references public.salesmen (id) on delete set null,
  status public.whatsapp_session_status not null default 'open',
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.whatsapp_sessions is
  'Groups nearby-in-time inbound messages from one salesman into a single visit-worthy conversation (CLAUDE.md §22). salesman_id is nullable: a message from an unregistered number can still be stored and reviewed.';

create index whatsapp_sessions_salesman_id_idx on public.whatsapp_sessions (salesman_id);
create index whatsapp_sessions_status_idx on public.whatsapp_sessions (status);

alter table public.visits
  add constraint visits_whatsapp_session_id_fkey
  foreign key (whatsapp_session_id) references public.whatsapp_sessions (id) on delete set null;


create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  external_message_id text not null,
  channel_id text not null,
  session_id uuid references public.whatsapp_sessions (id) on delete cascade,
  salesman_id uuid references public.salesmen (id) on delete set null,
  sender_number text not null,
  receiver_number text not null,
  direction public.message_direction not null,
  item_type text not null,
  value text,
  caption text,
  file_name text,
  file_path text,
  message_timestamp timestamptz not null,
  raw_payload jsonb not null,
  processing_status public.message_processing_status not null default 'received',
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_messages_external_id_unique unique (channel_id, external_message_id)
);

comment on table public.whatsapp_messages is
  'Raw MessageAutoSender webhook events (CLAUDE.md §19, §23). The unique (channel_id, external_message_id) constraint is the idempotency guard required by §50. item_type is left as free text rather than an enum because §20 warns not to assume the full MessageAutoSender type set until confirmed -- an enum would block ingestion of an unanticipated type.';

create index whatsapp_messages_session_id_idx on public.whatsapp_messages (session_id);
create index whatsapp_messages_salesman_id_idx on public.whatsapp_messages (salesman_id);
create index whatsapp_messages_processing_status_idx on public.whatsapp_messages (processing_status);
create index whatsapp_messages_message_timestamp_idx on public.whatsapp_messages (message_timestamp);
create index whatsapp_messages_direction_idx on public.whatsapp_messages (direction);


create table public.ai_extractions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.whatsapp_messages (id) on delete cascade,
  session_id uuid references public.whatsapp_sessions (id) on delete set null,
  extraction_type text not null,
  model text not null,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  extracted_data jsonb not null,
  status public.extraction_status not null default 'pending',
  applied_to_table text,
  applied_to_id uuid,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.ai_extractions is
  'Audit trail for AI interpretation of WhatsApp input (CLAUDE.md §48): what the model produced, its confidence, and what it was ultimately applied to. applied_to_table/applied_to_id is a loose polymorphic reference (not a FK) since it can point at dealers, visits, followups, or opportunities.';

create index ai_extractions_message_id_idx on public.ai_extractions (message_id);
create index ai_extractions_session_id_idx on public.ai_extractions (session_id);
create index ai_extractions_status_idx on public.ai_extractions (status);
create index ai_extractions_applied_to_idx on public.ai_extractions (applied_to_table, applied_to_id);
