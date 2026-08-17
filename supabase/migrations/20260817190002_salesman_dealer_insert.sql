-- Deliberate loosening of the original Phase 0 RLS design: salesmen were
-- read-only on dealers (CLAUDE.md §31/§32 flagged the WhatsApp AI pipeline
-- would need service-role for dealer writes). ADR-005 (Revised) adds a
-- salesman-facing web form that creates dealers directly as the salesman's
-- own authenticated session, not through service-role -- so salesmen now
-- need INSERT on dealers. UPDATE/DELETE remain admin+manager/admin-only,
-- unchanged: a salesman can create a new dealer here but still cannot
-- edit dealer master data afterward.
create policy dealers_insert_salesman on public.dealers
  for insert
  with check ((select public.current_app_role()) = 'salesman');
