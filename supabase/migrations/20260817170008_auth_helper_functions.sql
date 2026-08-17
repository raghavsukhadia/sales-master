create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

comment on function public.current_app_role() is
  'SECURITY DEFINER so it can read public.users regardless of the caller''s own RLS policies on that table (avoids recursive RLS). Policies use this instead of repeating the role lookup in every USING clause.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin', 'manager');
$$;

create or replace function public.current_salesman_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.salesmen where user_id = auth.uid();
$$;

comment on function public.current_salesman_id() is
  'Resolves the salesmen row linked to the calling auth user, if any. Null for admins/managers and for salesmen with no web login.';
