# Bootstrapping the first admin user

There is no signup/registration UI by design (CLAUDE.md §4.3 — admin
manages users; `public.users` is admin-write-only per RLS). That RLS is
exactly why the *first* admin can't be created through the app: inserting
a row into `public.users` requires an existing admin, and there isn't one
yet. Break the loop once, manually, via the Supabase dashboard.

## Steps

1. **Create the auth account.** In the Supabase dashboard for this
   project: **Authentication → Users → Add user**. Set an email and
   password, and mark the email as confirmed (or use "Auto Confirm User"
   if offered) so you can sign in immediately.

2. **Give that account an admin profile.** In the Supabase dashboard:
   **SQL Editor**, run (this runs as `postgres` and bypasses RLS, which is
   expected here):

   ```sql
   insert into public.users (id, role, full_name, email)
   select id, 'admin', 'Your Name', email
   from auth.users
   where email = 'you@example.com';
   ```

   Replace `'Your Name'` and the email filter. This pulls the `id` and
   `email` straight from the `auth.users` row created in step 1, so
   there's no UUID to copy by hand.

3. **Sign in** at `/login` with that email/password. You'll land on
   `/dashboard`.

Every admin/manager/salesman account created after this one can go
through this same manual path, or — once built — an in-app "create user"
screen that runs as an admin (which now exists) and is therefore allowed
by the `users_insert_admin` RLS policy.
