-- Fixes two issues surfaced by the Supabase performance advisor after the
-- initial RLS rollout:
--
-- 1. auth_rls_initplan: bare calls to auth.uid()/auth.role() (and our
--    helper functions, which wrap them) inside USING/WITH CHECK are
--    re-evaluated per row. Wrapping them as `(select auth.uid())` etc.
--    lets Postgres cache the result once per query instead.
-- 2. multiple_permissive_policies: users/salesmen each had two separate
--    permissive SELECT policies (self + admin_or_manager); both are
--    evaluated per row. Merged into one policy per table.
--
-- This migration drops and recreates every policy from the original
-- rls_policies migration with the optimized pattern. No policy's actual
-- access decision changes -- only how cheaply it's evaluated.

-- ---- users ----
drop policy users_select_self on public.users;
drop policy users_select_admin_manager on public.users;
drop policy users_insert_admin on public.users;
drop policy users_update_admin on public.users;
drop policy users_delete_admin on public.users;

create policy users_select on public.users
  for select
  using (id = (select auth.uid()) or (select public.is_admin_or_manager()));
create policy users_insert_admin on public.users
  for insert with check ((select public.is_admin()));
create policy users_update_admin on public.users
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy users_delete_admin on public.users
  for delete using ((select public.is_admin()));

-- ---- salesmen ----
drop policy salesmen_select_self on public.salesmen;
drop policy salesmen_select_admin_manager on public.salesmen;
drop policy salesmen_insert_admin on public.salesmen;
drop policy salesmen_update_admin on public.salesmen;
drop policy salesmen_delete_admin on public.salesmen;

create policy salesmen_select on public.salesmen
  for select
  using (user_id = (select auth.uid()) or (select public.is_admin_or_manager()));
create policy salesmen_insert_admin on public.salesmen
  for insert with check ((select public.is_admin()));
create policy salesmen_update_admin on public.salesmen
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy salesmen_delete_admin on public.salesmen
  for delete using ((select public.is_admin()));

-- ---- distributors, products, dealers, dealer_contacts, dealer_distributors ----
drop policy distributors_select_authenticated on public.distributors;
drop policy distributors_insert_admin_manager on public.distributors;
drop policy distributors_update_admin_manager on public.distributors;
drop policy distributors_delete_admin on public.distributors;
create policy distributors_select_authenticated on public.distributors
  for select using ((select auth.role()) = 'authenticated');
create policy distributors_insert_admin_manager on public.distributors
  for insert with check ((select public.is_admin_or_manager()));
create policy distributors_update_admin_manager on public.distributors
  for update using ((select public.is_admin_or_manager())) with check ((select public.is_admin_or_manager()));
create policy distributors_delete_admin on public.distributors
  for delete using ((select public.is_admin()));

drop policy products_select_authenticated on public.products;
drop policy products_insert_admin_manager on public.products;
drop policy products_update_admin_manager on public.products;
drop policy products_delete_admin on public.products;
create policy products_select_authenticated on public.products
  for select using ((select auth.role()) = 'authenticated');
create policy products_insert_admin_manager on public.products
  for insert with check ((select public.is_admin_or_manager()));
create policy products_update_admin_manager on public.products
  for update using ((select public.is_admin_or_manager())) with check ((select public.is_admin_or_manager()));
create policy products_delete_admin on public.products
  for delete using ((select public.is_admin()));

drop policy dealers_select_authenticated on public.dealers;
drop policy dealers_insert_admin_manager on public.dealers;
drop policy dealers_update_admin_manager on public.dealers;
drop policy dealers_delete_admin on public.dealers;
create policy dealers_select_authenticated on public.dealers
  for select using ((select auth.role()) = 'authenticated');
create policy dealers_insert_admin_manager on public.dealers
  for insert with check ((select public.is_admin_or_manager()));
create policy dealers_update_admin_manager on public.dealers
  for update using ((select public.is_admin_or_manager())) with check ((select public.is_admin_or_manager()));
create policy dealers_delete_admin on public.dealers
  for delete using ((select public.is_admin()));

drop policy dealer_contacts_select_authenticated on public.dealer_contacts;
drop policy dealer_contacts_insert_admin_manager on public.dealer_contacts;
drop policy dealer_contacts_update_admin_manager on public.dealer_contacts;
drop policy dealer_contacts_delete_admin on public.dealer_contacts;
create policy dealer_contacts_select_authenticated on public.dealer_contacts
  for select using ((select auth.role()) = 'authenticated');
create policy dealer_contacts_insert_admin_manager on public.dealer_contacts
  for insert with check ((select public.is_admin_or_manager()));
create policy dealer_contacts_update_admin_manager on public.dealer_contacts
  for update using ((select public.is_admin_or_manager())) with check ((select public.is_admin_or_manager()));
create policy dealer_contacts_delete_admin on public.dealer_contacts
  for delete using ((select public.is_admin()));

drop policy dealer_distributors_select_authenticated on public.dealer_distributors;
drop policy dealer_distributors_insert_admin_manager on public.dealer_distributors;
drop policy dealer_distributors_update_admin_manager on public.dealer_distributors;
drop policy dealer_distributors_delete_admin on public.dealer_distributors;
create policy dealer_distributors_select_authenticated on public.dealer_distributors
  for select using ((select auth.role()) = 'authenticated');
create policy dealer_distributors_insert_admin_manager on public.dealer_distributors
  for insert with check ((select public.is_admin_or_manager()));
create policy dealer_distributors_update_admin_manager on public.dealer_distributors
  for update using ((select public.is_admin_or_manager())) with check ((select public.is_admin_or_manager()));
create policy dealer_distributors_delete_admin on public.dealer_distributors
  for delete using ((select public.is_admin()));

-- ---- dealer_statuses, opportunity_stages ----
drop policy dealer_statuses_select_authenticated on public.dealer_statuses;
drop policy dealer_statuses_insert_admin on public.dealer_statuses;
drop policy dealer_statuses_update_admin on public.dealer_statuses;
drop policy dealer_statuses_delete_admin on public.dealer_statuses;
create policy dealer_statuses_select_authenticated on public.dealer_statuses
  for select using ((select auth.role()) = 'authenticated');
create policy dealer_statuses_insert_admin on public.dealer_statuses
  for insert with check ((select public.is_admin()));
create policy dealer_statuses_update_admin on public.dealer_statuses
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy dealer_statuses_delete_admin on public.dealer_statuses
  for delete using ((select public.is_admin()));

drop policy opportunity_stages_select_authenticated on public.opportunity_stages;
drop policy opportunity_stages_insert_admin on public.opportunity_stages;
drop policy opportunity_stages_update_admin on public.opportunity_stages;
drop policy opportunity_stages_delete_admin on public.opportunity_stages;
create policy opportunity_stages_select_authenticated on public.opportunity_stages
  for select using ((select auth.role()) = 'authenticated');
create policy opportunity_stages_insert_admin on public.opportunity_stages
  for insert with check ((select public.is_admin()));
create policy opportunity_stages_update_admin on public.opportunity_stages
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy opportunity_stages_delete_admin on public.opportunity_stages
  for delete using ((select public.is_admin()));

-- ---- visits ----
drop policy visits_select on public.visits;
drop policy visits_insert on public.visits;
drop policy visits_update on public.visits;
drop policy visits_delete_admin on public.visits;

create policy visits_select on public.visits
  for select
  using (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  );
create policy visits_insert on public.visits
  for insert
  with check (
    (select public.is_admin())
    or salesman_id = (select public.current_salesman_id())
  );
create policy visits_update on public.visits
  for update
  using (
    (select public.is_admin())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  )
  with check (
    (select public.is_admin())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  );
create policy visits_delete_admin on public.visits
  for delete using ((select public.is_admin()));

-- ---- visit_products ----
drop policy visit_products_select on public.visit_products;
drop policy visit_products_insert on public.visit_products;
drop policy visit_products_update on public.visit_products;
drop policy visit_products_delete on public.visit_products;

create policy visit_products_select on public.visit_products
  for select
  using (
    (select public.is_admin_or_manager())
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (v.salesman_id = (select public.current_salesman_id()) or v.created_by = (select auth.uid()))
    )
  );
create policy visit_products_insert on public.visit_products
  for insert
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  );
create policy visit_products_update on public.visit_products
  for update
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  )
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  );
create policy visit_products_delete on public.visit_products
  for delete
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
  );

-- ---- opportunities ----
drop policy opportunities_select on public.opportunities;
drop policy opportunities_insert on public.opportunities;
drop policy opportunities_update on public.opportunities;
drop policy opportunities_delete_admin on public.opportunities;

create policy opportunities_select on public.opportunities
  for select
  using (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  );
create policy opportunities_insert on public.opportunities
  for insert
  with check (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
  );
create policy opportunities_update on public.opportunities
  for update
  using (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  )
  with check (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  );
create policy opportunities_delete_admin on public.opportunities
  for delete using ((select public.is_admin()));

-- ---- followups ----
drop policy followups_select on public.followups;
drop policy followups_insert on public.followups;
drop policy followups_update on public.followups;
drop policy followups_delete_admin on public.followups;

create policy followups_select on public.followups
  for select
  using (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  );
create policy followups_insert on public.followups
  for insert
  with check (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
  );
create policy followups_update on public.followups
  for update
  using (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  )
  with check (
    (select public.is_admin_or_manager())
    or salesman_id = (select public.current_salesman_id())
    or created_by = (select auth.uid())
  );
create policy followups_delete_admin on public.followups
  for delete using ((select public.is_admin()));

-- ---- whatsapp_sessions, whatsapp_messages, ai_extractions, audit_logs ----
drop policy whatsapp_sessions_select_admin_manager on public.whatsapp_sessions;
create policy whatsapp_sessions_select_admin_manager on public.whatsapp_sessions
  for select using ((select public.is_admin_or_manager()));

drop policy whatsapp_messages_select_admin_manager on public.whatsapp_messages;
create policy whatsapp_messages_select_admin_manager on public.whatsapp_messages
  for select using ((select public.is_admin_or_manager()));

drop policy ai_extractions_select_admin_manager on public.ai_extractions;
create policy ai_extractions_select_admin_manager on public.ai_extractions
  for select using ((select public.is_admin_or_manager()));

drop policy audit_logs_select_admin_manager on public.audit_logs;
create policy audit_logs_select_admin_manager on public.audit_logs
  for select using ((select public.is_admin_or_manager()));

-- ---- attachments ----
drop policy attachments_select on public.attachments;
drop policy attachments_insert on public.attachments;
drop policy attachments_delete_admin on public.attachments;

create policy attachments_select on public.attachments
  for select
  using (
    (select public.is_admin_or_manager())
    or dealer_id is not null
    or exists (
      select 1 from public.visits v
      where v.id = attachments.visit_id
        and (v.salesman_id = (select public.current_salesman_id()) or v.created_by = (select auth.uid()))
    )
  );
create policy attachments_insert on public.attachments
  for insert
  with check (
    (select public.is_admin_or_manager())
    or exists (
      select 1 from public.visits v
      where v.id = attachments.visit_id
        and v.salesman_id = (select public.current_salesman_id())
    )
    or created_by = (select auth.uid())
  );
create policy attachments_delete_admin on public.attachments
  for delete using ((select public.is_admin()));


-- ---- missing indexes on FK columns flagged by the performance advisor ----
create index dealers_created_by_idx on public.dealers (created_by);
create index visits_created_by_idx on public.visits (created_by);
create index opportunities_created_by_idx on public.opportunities (created_by);
create index opportunities_product_id_idx on public.opportunities (product_id);
create index opportunities_source_visit_id_idx on public.opportunities (source_visit_id);
create index followups_created_by_idx on public.followups (created_by);
create index followups_created_from_visit_id_idx on public.followups (created_from_visit_id);
create index attachments_created_by_idx on public.attachments (created_by);
create index ai_extractions_reviewed_by_idx on public.ai_extractions (reviewed_by);
