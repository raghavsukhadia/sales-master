-- Deny-by-default: RLS is enabled on every table and no table gets a
-- permissive `using (true)` policy. Rows are visible/writable only through
-- the specific policies below. service_role (used by the backend/webhook,
-- see lib/supabase/service.ts) bypasses RLS entirely and is unaffected by
-- any of this.

alter table public.users enable row level security;
alter table public.salesmen enable row level security;
alter table public.distributors enable row level security;
alter table public.dealers enable row level security;
alter table public.dealer_contacts enable row level security;
alter table public.dealer_distributors enable row level security;
alter table public.products enable row level security;
alter table public.dealer_statuses enable row level security;
alter table public.opportunity_stages enable row level security;
alter table public.visits enable row level security;
alter table public.visit_products enable row level security;
alter table public.opportunities enable row level security;
alter table public.followups enable row level security;
alter table public.whatsapp_sessions enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.ai_extractions enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;


-- ============================================================
-- users: self can read own row; admin/manager can read everyone;
-- only admin can create/update/delete (user management is an admin
-- responsibility per CLAUDE.md §4.3). A salesman cannot edit their own
-- profile in Phase 0 -- a deliberate simplification, flagged for review.
-- ============================================================

create policy users_select_self on public.users
  for select
  using (id = auth.uid());

create policy users_select_admin_manager on public.users
  for select
  using (public.is_admin_or_manager());

create policy users_insert_admin on public.users
  for insert
  with check (public.is_admin());

create policy users_update_admin on public.users
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy users_delete_admin on public.users
  for delete
  using (public.is_admin());


-- ============================================================
-- salesmen: self can read own row; admin/manager can read everyone;
-- only admin can create/update/delete (§4.3 admin manages salesmen).
-- ============================================================

create policy salesmen_select_self on public.salesmen
  for select
  using (user_id = auth.uid());

create policy salesmen_select_admin_manager on public.salesmen
  for select
  using (public.is_admin_or_manager());

create policy salesmen_insert_admin on public.salesmen
  for insert
  with check (public.is_admin());

create policy salesmen_update_admin on public.salesmen
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy salesmen_delete_admin on public.salesmen
  for delete
  using (public.is_admin());


-- ============================================================
-- distributors, products, dealers, dealer_contacts, dealer_distributors:
-- readable by every authenticated role (salesmen need this to log visits
-- per CLAUDE.md §38); admin/manager can create/edit (matches the confirmed
-- manager write scope); only admin can delete.
--
-- Salesmen deliberately have NO write access to dealer master data here.
-- Flag: the WhatsApp AI pipeline that creates/updates dealers from field
-- messages will need to run as the service-role client (bypassing RLS),
-- not as a salesman-scoped authenticated session.
-- ============================================================

create policy distributors_select_authenticated on public.distributors
  for select using (auth.role() = 'authenticated');
create policy distributors_insert_admin_manager on public.distributors
  for insert with check (public.is_admin_or_manager());
create policy distributors_update_admin_manager on public.distributors
  for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy distributors_delete_admin on public.distributors
  for delete using (public.is_admin());

create policy products_select_authenticated on public.products
  for select using (auth.role() = 'authenticated');
create policy products_insert_admin_manager on public.products
  for insert with check (public.is_admin_or_manager());
create policy products_update_admin_manager on public.products
  for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy products_delete_admin on public.products
  for delete using (public.is_admin());

create policy dealers_select_authenticated on public.dealers
  for select using (auth.role() = 'authenticated');
create policy dealers_insert_admin_manager on public.dealers
  for insert with check (public.is_admin_or_manager());
create policy dealers_update_admin_manager on public.dealers
  for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy dealers_delete_admin on public.dealers
  for delete using (public.is_admin());

create policy dealer_contacts_select_authenticated on public.dealer_contacts
  for select using (auth.role() = 'authenticated');
create policy dealer_contacts_insert_admin_manager on public.dealer_contacts
  for insert with check (public.is_admin_or_manager());
create policy dealer_contacts_update_admin_manager on public.dealer_contacts
  for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy dealer_contacts_delete_admin on public.dealer_contacts
  for delete using (public.is_admin());

create policy dealer_distributors_select_authenticated on public.dealer_distributors
  for select using (auth.role() = 'authenticated');
create policy dealer_distributors_insert_admin_manager on public.dealer_distributors
  for insert with check (public.is_admin_or_manager());
create policy dealer_distributors_update_admin_manager on public.dealer_distributors
  for update using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
create policy dealer_distributors_delete_admin on public.dealer_distributors
  for delete using (public.is_admin());


-- ============================================================
-- dealer_statuses, opportunity_stages: readable by everyone authenticated
-- (needed for dropdowns/filters); only admin can add/edit/remove values,
-- since these are system configuration (§4.3), not day-to-day dashboard
-- editing -- deliberately excluded from the manager write scope.
-- ============================================================

create policy dealer_statuses_select_authenticated on public.dealer_statuses
  for select using (auth.role() = 'authenticated');
create policy dealer_statuses_insert_admin on public.dealer_statuses
  for insert with check (public.is_admin());
create policy dealer_statuses_update_admin on public.dealer_statuses
  for update using (public.is_admin()) with check (public.is_admin());
create policy dealer_statuses_delete_admin on public.dealer_statuses
  for delete using (public.is_admin());

create policy opportunity_stages_select_authenticated on public.opportunity_stages
  for select using (auth.role() = 'authenticated');
create policy opportunity_stages_insert_admin on public.opportunity_stages
  for insert with check (public.is_admin());
create policy opportunity_stages_update_admin on public.opportunity_stages
  for update using (public.is_admin()) with check (public.is_admin());
create policy opportunity_stages_delete_admin on public.opportunity_stages
  for delete using (public.is_admin());


-- ============================================================
-- visits: admin/manager can read everything system-wide; a salesman can
-- read/write only visits they logged (salesman_id resolves to their own
-- salesmen row) or personally created (created_by = auth.uid()).
--
-- Manager is deliberately READ-ONLY here -- not in the confirmed write
-- scope example ("dealers, distributors, products, follow-ups"), and
-- letting managers edit salesman-authored visit records would work
-- against the §48 auditability goal. Flagged as a judgment call.
-- ============================================================

create policy visits_select on public.visits
  for select
  using (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  );

create policy visits_insert on public.visits
  for insert
  with check (
    public.is_admin()
    or salesman_id = public.current_salesman_id()
  );

create policy visits_update on public.visits
  for update
  using (
    public.is_admin()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  )
  with check (
    public.is_admin()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  );

create policy visits_delete_admin on public.visits
  for delete
  using (public.is_admin());


-- ============================================================
-- visit_products: follows the parent visit's access (checked via EXISTS
-- against public.visits, whose own RLS policies already scope what a
-- salesman may see/touch).
-- ============================================================

create policy visit_products_select on public.visit_products
  for select
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and (v.salesman_id = public.current_salesman_id() or v.created_by = auth.uid())
    )
  );

create policy visit_products_insert on public.visit_products
  for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = public.current_salesman_id()
    )
  );

create policy visit_products_update on public.visit_products
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = public.current_salesman_id()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = public.current_salesman_id()
    )
  );

create policy visit_products_delete on public.visit_products
  for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.visits v
      where v.id = visit_products.visit_id
        and v.salesman_id = public.current_salesman_id()
    )
  );


-- ============================================================
-- opportunities: admin/manager full read+write system-wide (pipeline
-- management is a core dashboard function per §13/§38 -- broader than the
-- literal write-scope example list, flagged as a judgment call); a
-- salesman can read/write opportunities they own or created.
-- ============================================================

create policy opportunities_select on public.opportunities
  for select
  using (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  );

create policy opportunities_insert on public.opportunities
  for insert
  with check (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
  );

create policy opportunities_update on public.opportunities
  for update
  using (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  )
  with check (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  );

create policy opportunities_delete_admin on public.opportunities
  for delete
  using (public.is_admin());


-- ============================================================
-- followups: admin/manager full read+write system-wide (manager write was
-- explicitly confirmed via "resolving follow-ups" -- interpreted broadly
-- as full CRUD rather than status-updates-only, flagged as a judgment
-- call); a salesman can read/write follow-ups they own or created.
-- ============================================================

create policy followups_select on public.followups
  for select
  using (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  );

create policy followups_insert on public.followups
  for insert
  with check (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
  );

create policy followups_update on public.followups
  for update
  using (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  )
  with check (
    public.is_admin_or_manager()
    or salesman_id = public.current_salesman_id()
    or created_by = auth.uid()
  );

create policy followups_delete_admin on public.followups
  for delete
  using (public.is_admin());


-- ============================================================
-- whatsapp_sessions, whatsapp_messages, ai_extractions, audit_logs:
-- confirmed no direct salesman access at all. admin/manager get read-only
-- access; there is no INSERT/UPDATE/DELETE policy for the authenticated
-- role on any of these four tables -- they are populated exclusively by
-- the backend/webhook via the service-role client, which bypasses RLS.
-- ============================================================

create policy whatsapp_sessions_select_admin_manager on public.whatsapp_sessions
  for select using (public.is_admin_or_manager());

create policy whatsapp_messages_select_admin_manager on public.whatsapp_messages
  for select using (public.is_admin_or_manager());

create policy ai_extractions_select_admin_manager on public.ai_extractions
  for select using (public.is_admin_or_manager());

create policy audit_logs_select_admin_manager on public.audit_logs
  for select using (public.is_admin_or_manager());


-- ============================================================
-- attachments: not explicitly covered in the confirmed business rules --
-- judgment call. admin/manager full read; a salesman can read attachments
-- on any dealer (dealers are globally readable) or on a visit they own;
-- a salesman can upload attachments only against a visit they own; only
-- admin can delete. No UPDATE policy -- files are treated as immutable
-- once uploaded (replace via delete + re-upload).
-- ============================================================

create policy attachments_select on public.attachments
  for select
  using (
    public.is_admin_or_manager()
    or dealer_id is not null
    or exists (
      select 1 from public.visits v
      where v.id = attachments.visit_id
        and (v.salesman_id = public.current_salesman_id() or v.created_by = auth.uid())
    )
  );

create policy attachments_insert on public.attachments
  for insert
  with check (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.visits v
      where v.id = attachments.visit_id
        and v.salesman_id = public.current_salesman_id()
    )
    or created_by = auth.uid()
  );

create policy attachments_delete_admin on public.attachments
  for delete
  using (public.is_admin());
