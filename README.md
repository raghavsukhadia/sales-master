# Sales Master

Field sales visit logging for automobile-industry field teams. Salesmen record dealer visits via a mobile-friendly web form; management uses the dashboard for oversight.

## Links after deployment

| Role | URL |
|------|-----|
| **Salesman (share this link)** | `https://<your-domain>/record-visit` |
| Admin / manager | `https://<your-domain>/login` → `/dashboard` |

Set `NEXT_PUBLIC_APP_URL` to your production domain in Vercel (e.g. `https://sales-master.vercel.app`).

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in Supabase keys and other values. See `.env.example` for the full list.

3. Apply Supabase migrations to your project (CLI linked to remote, or run SQL from `supabase/migrations/`).

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000/record-visit](http://localhost:3000/record-visit) (redirects to login if not signed in).

## Vercel deployment checklist

1. Connect the repo to Vercel and deploy.
2. Set all variables from `.env.example` in **Project → Settings → Environment Variables**.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL.
4. Set `CRON_SECRET` — required for the WhatsApp processing cron in `vercel.json` (`/api/internal/process-whatsapp` every minute).
5. Confirm Supabase migrations are applied on the production database.
6. Create salesman accounts (see below) before handing the link to the field team.

## Onboarding a salesman

1. Sign in as admin/manager at `/login`.
2. Go to **Salesmen** (`/salesmen`) and create the salesman (name, phone, email, password).
3. This creates the auth user, `users` row, and linked `salesmen` row.
4. Share the salesman link: `https://<your-domain>/record-visit`

For manual SQL/bootstrap testing, see `docs/bootstrap-test-salesman-login.md`.

## Salesman app features

- **Record Visit** (`/record-visit`) — scan visiting card, search/create dealer, log orders, GPS location
- **Visit History** (`/visit-history`) — past visits and details

Legacy URL `/log-visit` redirects to `/record-visit`.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run test     # unit tests (vitest)
```

## Architecture notes

See `CLAUDE.md` for product philosophy, database design, and WhatsApp pipeline documentation. WhatsApp setup: `docs/whatsapp-processing.md`.
