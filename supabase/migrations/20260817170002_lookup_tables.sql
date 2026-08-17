create table public.dealer_statuses (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.dealer_statuses is
  'Configurable dealer lifecycle states (CLAUDE.md §7). A lookup table rather than an enum so new statuses can be added without a schema migration.';

insert into public.dealer_statuses (key, label, sort_order) values
  ('prospect', 'Prospect', 10),
  ('new', 'New', 20),
  ('active', 'Active', 30),
  ('inactive', 'Inactive', 40),
  ('converted', 'Converted', 50),
  ('lost', 'Lost', 60);

create table public.opportunity_stages (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.opportunity_stages is
  'Configurable opportunity pipeline stages (CLAUDE.md §13). A lookup table rather than an enum so new stages can be added without a schema migration.';

insert into public.opportunity_stages (key, label, sort_order) values
  ('new', 'New', 10),
  ('interested', 'Interested', 20),
  ('quotation_sent', 'Quotation Sent', 30),
  ('negotiation', 'Negotiation', 40),
  ('confirmed', 'Confirmed', 50),
  ('lost', 'Lost', 60);
