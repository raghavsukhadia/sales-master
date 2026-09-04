-- Allow managers (not just admins) to update and delete salesman accounts,
-- matching create permissions from 20260831120001_manager_create_salesmen.

drop policy if exists users_update_admin on public.users;
create policy users_update_admin_manager on public.users
  for update
  using ((select public.is_admin_or_manager()))
  with check ((select public.is_admin_or_manager()));

drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin_manager on public.users
  for delete
  using ((select public.is_admin_or_manager()));

drop policy if exists salesmen_update_admin on public.salesmen;
create policy salesmen_update_admin_manager on public.salesmen
  for update
  using ((select public.is_admin_or_manager()))
  with check ((select public.is_admin_or_manager()));

drop policy if exists salesmen_delete_admin on public.salesmen;
create policy salesmen_delete_admin_manager on public.salesmen
  for delete
  using ((select public.is_admin_or_manager()));
