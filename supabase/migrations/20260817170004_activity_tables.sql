create table public.visits (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete restrict,
  salesman_id uuid not null references public.salesmen (id) on delete restrict,
  visit_date timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  location_source public.location_source,
  notes text,
  ai_summary text,
  -- FK added in 20260817170005_whatsapp_tables.sql once whatsapp_sessions exists.
  whatsapp_session_id uuid,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.visits is
  'A logged salesman/dealer interaction (CLAUDE.md §10). dealer_id/salesman_id use ON DELETE RESTRICT to preserve the audit trail (§48) -- dealers/salesmen should be deactivated (status/is_active), not hard-deleted, once visits reference them.';

create index visits_dealer_id_idx on public.visits (dealer_id);
create index visits_salesman_id_idx on public.visits (salesman_id);
create index visits_visit_date_idx on public.visits (visit_date);
create index visits_whatsapp_session_id_idx on public.visits (whatsapp_session_id);


create table public.visit_products (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  interest_level public.interest_level,
  notes text,
  created_at timestamptz not null default now(),
  constraint visit_products_visit_product_unique unique (visit_id, product_id)
);

create index visit_products_visit_id_idx on public.visit_products (visit_id);
create index visit_products_product_id_idx on public.visit_products (product_id);


create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete restrict,
  salesman_id uuid not null references public.salesmen (id) on delete restrict,
  product_id uuid references public.products (id) on delete set null,
  stage_key text not null default 'new' references public.opportunity_stages (key) on delete restrict,
  estimated_quantity numeric,
  estimated_value numeric,
  interest_level public.interest_level,
  probability numeric check (probability is null or (probability >= 0 and probability <= 100)),
  expected_closing_date date,
  notes text,
  source_visit_id uuid references public.visits (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_dealer_id_idx on public.opportunities (dealer_id);
create index opportunities_salesman_id_idx on public.opportunities (salesman_id);
create index opportunities_stage_key_idx on public.opportunities (stage_key);
create index opportunities_expected_closing_date_idx on public.opportunities (expected_closing_date);


create table public.followups (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete restrict,
  salesman_id uuid not null references public.salesmen (id) on delete restrict,
  description text not null,
  due_date date not null,
  priority public.priority_level not null default 'medium',
  status public.followup_status not null default 'pending',
  created_from_visit_id uuid references public.visits (id) on delete set null,
  completed_at timestamptz,
  completion_notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.followups.status is
  '"Due Today" and "Overdue" (CLAUDE.md §12) are derived from due_date at query/render time, not stored states -- only pending/completed/cancelled are persisted.';

create index followups_dealer_id_idx on public.followups (dealer_id);
create index followups_salesman_id_idx on public.followups (salesman_id);
create index followups_status_idx on public.followups (status);
create index followups_due_date_idx on public.followups (due_date);
