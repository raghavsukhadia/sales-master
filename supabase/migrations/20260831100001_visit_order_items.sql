-- Order line items captured from the salesman web form (free-text product + price).

create table public.visit_order_items (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index visit_order_items_visit_id_idx on public.visit_order_items (visit_id);

alter table public.visit_order_items enable row level security;

create policy visit_order_items_select on public.visit_order_items
  for select
  using (
    (select public.is_admin_or_manager())
    or exists (
      select 1 from public.visits v
      where v.id = visit_order_items.visit_id
        and (v.salesman_id = (select public.current_salesman_id()) or v.created_by = (select auth.uid()))
    )
  );

create policy visit_order_items_insert on public.visit_order_items
  for insert
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_order_items.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  );

create policy visit_order_items_update on public.visit_order_items
  for update
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_order_items.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  )
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_order_items.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  );

create policy visit_order_items_delete on public.visit_order_items
  for delete
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_order_items.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  );
