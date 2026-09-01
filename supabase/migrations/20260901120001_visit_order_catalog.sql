-- Visit numbering and catalog-linked order line items.

create sequence public.visit_number_seq as bigint start with 1001;

alter table public.visits
  add column visit_number bigint;

update public.visits
set visit_number = nextval('public.visit_number_seq')
where visit_number is null;

alter table public.visits
  alter column visit_number set not null,
  alter column visit_number set default nextval('public.visit_number_seq');

create unique index visits_visit_number_idx on public.visits (visit_number);

alter table public.visit_order_items
  add column product_id uuid references public.products (id) on delete set null,
  add column unit text not null default 'pcs',
  add column line_number smallint;

update public.visit_order_items voi
set line_number = sub.rn
from (
  select
    id,
    row_number() over (partition by visit_id order by created_at) as rn
  from public.visit_order_items
) sub
where voi.id = sub.id
  and voi.line_number is null;

alter table public.visit_order_items
  alter column line_number set not null,
  add constraint visit_order_items_line_number_positive check (line_number > 0);

create unique index visit_order_items_visit_product_unique
  on public.visit_order_items (visit_id, product_id)
  where product_id is not null;

create index visit_order_items_product_id_idx on public.visit_order_items (product_id);
