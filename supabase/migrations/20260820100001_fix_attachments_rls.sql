-- Tighten attachments RLS.
--
-- Previous SELECT allowed any authenticated user to read attachment metadata
-- whenever dealer_id IS NOT NULL (every dealer-linked file leaked across
-- salesmen). Previous INSERT allowed created_by = auth.uid() without a visit
-- ownership check, so a salesman could invent arbitrary attachment rows.
--
-- New rules:
--   SELECT: admin/manager, OR the attachment is linked to a visit the caller
--           may see (salesman_id = current_salesman_id OR created_by = uid).
--   INSERT: admin/manager, OR visit_id is set and that visit belongs to the
--           caller's salesman row. Web log-visit uploads always set visit_id
--           for the salesman's own visit, so they keep working.
--   DELETE: admin only (unchanged).
--
-- WhatsApp media rows with visit_id NULL are admin/manager-readable only
-- until they are later linked to a visit.

drop policy if exists attachments_select on public.attachments;
drop policy if exists attachments_insert on public.attachments;
drop policy if exists attachments_delete_admin on public.attachments;

create policy attachments_select on public.attachments
  for select
  using (
    (select public.is_admin_or_manager())
    or exists (
      select 1 from public.visits v
      where v.id = attachments.visit_id
        and (
          v.salesman_id = (select public.current_salesman_id())
          or v.created_by = (select auth.uid())
        )
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
  );

create policy attachments_delete_admin on public.attachments
  for delete
  using ((select public.is_admin()));

comment on policy attachments_select on public.attachments is
  'Admin/manager see all; salesmen only see attachments on visits they own or created. No blanket dealer_id leak.';

comment on policy attachments_insert on public.attachments is
  'Admin/manager may insert; salesmen may insert only against a visit whose salesman_id is their own. No created_by-only shortcut.';
