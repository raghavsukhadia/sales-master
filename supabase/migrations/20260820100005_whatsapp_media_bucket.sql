-- Private bucket for media copied from MessageAutoSender (CLAUDE.md §46).
-- Uploads are performed by the service-role processing worker only.
-- Salesmen do not read this bucket directly until attachments are visit-linked
-- and served through application logic / signed URLs (future).

insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', false)
on conflict (id) do nothing;

-- Admin/manager may read objects for support/debug; no authenticated insert.
create policy whatsapp_media_select_admin_manager
  on storage.objects for select to authenticated
  using (
    bucket_id = 'whatsapp-media'
    and (select public.is_admin_or_manager())
  );
