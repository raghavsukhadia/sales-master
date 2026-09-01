# Bootstrapping a test salesman web login

Salesmen normally interact via WhatsApp (ADR-005). The web fallback at
`/record-visit` requires a `public.users` row (`role = 'salesman'`) linked
to a `salesmen` row. This mirrors `docs/bootstrap-first-admin.md`, with an
extra linking step.

## Steps

1. **Create the auth account.** Supabase dashboard: **Authentication →
   Users → Add user**. Set an email/password, mark it confirmed.

2. **Give it a salesman profile and link it to a salesmen row.** SQL
   Editor:

   ```sql
   insert into public.users (id, role, full_name, email)
   select id, 'salesman', 'Test Salesman', email
   from auth.users
   where email = 'salesman-test@example.com';

   -- If you already have a salesmen row (e.g. created for webhook testing), link it:
   update public.salesmen
   set user_id = (select id from auth.users where email = 'salesman-test@example.com')
   where phone_number = '917440515450';

   -- Otherwise, create a fresh linked salesman:
   -- insert into public.salesmen (user_id, full_name, phone_number)
   -- select id, 'Test Salesman', '91XXXXXXXXXX'
   -- from auth.users where email = 'salesman-test@example.com';
   ```

3. **Sign in** at `/login` with that email/password. You should land on
   `/record-visit` (admin/manager accounts go to `/dashboard`).

If you sign in with a `salesman`-role account that has no linked
`salesmen` row, the page will render but show "Your account isn't linked
to a salesman profile yet" instead of the form — that's the deliberate
guard in `app/(salesman)/layout.tsx`, not a bug.
