create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'salesman',
  full_name text not null,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is
  'App-facing profile for an auth.users account: role and display info used by RLS and the web UI (CLAUDE.md §35).';

create index users_role_idx on public.users (role);


create table public.salesmen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  full_name text not null,
  phone_number text not null,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salesmen_phone_number_unique unique (phone_number),
  constraint salesmen_user_id_unique unique (user_id)
);

comment on table public.salesmen is
  'Field salesperson master record. phone_number is the WhatsApp identification key (CLAUDE.md §21). user_id is nullable: a salesman may operate purely over WhatsApp with no web login.';

create index salesmen_user_id_idx on public.salesmen (user_id);
create index salesmen_is_active_idx on public.salesmen (is_active);


create table public.distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.distributors is
  'Distributor master record. Models one primary city/state per distributor -- CLAUDE.md §5 notes a distributor may span multiple states/cities/territories, but no Phase 0 entity needs per-territory modeling yet, so this is deliberately simplified.';

create index distributors_city_idx on public.distributors (city);
create index distributors_state_idx on public.distributors (state);


create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  status_key text not null default 'prospect' references public.dealer_statuses (key) on delete restrict,
  primary_salesman_id uuid references public.salesmen (id) on delete set null,
  contact_person text,
  phone_number text,
  whatsapp_number text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  gst_number text,
  notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dealers is
  'Dealer/prospect master record. phone_number/whatsapp_number/gst_number are deliberately not unique-constrained: duplicate detection (CLAUDE.md §31) is a business-rule confirmation flow, not a hard DB constraint, so near-duplicates can transiently coexist while flagged for review.';

comment on column public.dealers.primary_salesman_id is
  'Reporting field only ("whose lead"), per the confirmed business rule -- not an ownership/access-control field. Any salesman may log a visit against any dealer.';

create index dealers_status_key_idx on public.dealers (status_key);
create index dealers_primary_salesman_id_idx on public.dealers (primary_salesman_id);
create index dealers_city_idx on public.dealers (city);
create index dealers_state_idx on public.dealers (state);
create index dealers_phone_number_idx on public.dealers (phone_number);
create index dealers_whatsapp_number_idx on public.dealers (whatsapp_number);
create index dealers_gst_number_idx on public.dealers (gst_number);


create table public.dealer_contacts (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  name text not null,
  designation text,
  phone_number text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dealer_contacts_dealer_id_idx on public.dealer_contacts (dealer_id);


create table public.dealer_distributors (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  distributor_id uuid not null references public.distributors (id) on delete restrict,
  is_current boolean not null default true,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealer_distributors_dates_check check (end_date is null or end_date >= start_date)
);

comment on table public.dealer_distributors is
  'Many-to-many dealer<->distributor relationship over time (CLAUDE.md §5, §31), since a dealer''s distributor can change. The partial unique index below enforces at most one is_current=true row per dealer (a dealer has exactly one current distributor at a time) -- this is a judgment call, not explicitly stated in CLAUDE.md.';

create index dealer_distributors_dealer_id_idx on public.dealer_distributors (dealer_id);
create index dealer_distributors_distributor_id_idx on public.dealer_distributors (distributor_id);
create unique index dealer_distributors_one_current_per_dealer_idx
  on public.dealer_distributors (dealer_id)
  where is_current;


create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category);
