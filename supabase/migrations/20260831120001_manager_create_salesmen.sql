-- Allow managers (not just admins) to create salesman accounts.

drop policy users_insert_admin on public.users;
create policy users_insert_admin_manager on public.users
  for insert with check ((select public.is_admin_or_manager()));

drop policy salesmen_insert_admin on public.salesmen;
create policy salesmen_insert_admin_manager on public.salesmen
  for insert with check ((select public.is_admin_or_manager()));
