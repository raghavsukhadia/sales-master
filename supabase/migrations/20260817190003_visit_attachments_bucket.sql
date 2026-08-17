-- Storage bucket for visit-sourced photos (visiting card / shop photo),
-- per CLAUDE.md §46. Private, not public: dealer photos can contain
-- business-sensitive info. Uploads are scoped to a per-user folder
-- (<uid>/<filename>) so the insert policy can check ownership without a
-- DB round-trip.
insert into storage.buckets (id, name, public)
values ('visit-attachments', 'visit-attachments', false);

create policy visit_attachments_insert_own_folder
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'visit-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy visit_attachments_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'visit-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy visit_attachments_select_admin_manager
  on storage.objects for select to authenticated
  using (
    bucket_id = 'visit-attachments'
    and (select public.is_admin_or_manager())
  );
