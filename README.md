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
4. Set `GEMINI_API_KEY` — required for **Scan card** visiting-card extraction (Google AI Studio).
5. Set `CRON_SECRET` — required for the WhatsApp processing cron in `vercel.json` (`/api/internal/process-whatsapp` every minute).
6. Confirm Supabase migrations are applied on the production database.
7. Create salesman accounts (see below) before handing the link to the field team.

## Onboarding a salesman

1. Sign in as admin/manager at `/login`.
2. Go to **Salesmen** (`/salesmen`) and create the salesman (name, phone, email, password).
3. This creates the auth user, `users` row, and linked `salesmen` row.
4. Share the salesman link: `https://<your-domain>/record-visit`

For manual SQL/bootstrap testing, see `docs/bootstrap-test-salesman-login.md`.

## Salesman app features

- **Record Visit** (`/record-visit`) — scan visiting card (Gemini AI), search/create dealer, log orders, GPS location
- **Visit History** (`/visit-history`) — past visits and details
- **Follow-ups** (`/followups`) — pending dealer follow-ups grouped as Overdue / Due Today / Upcoming; tap **Call Dealer** to open the phone dialer, then **Record Outcome** to complete the follow-up and optionally schedule the next one

Legacy URL `/log-visit` redirects to `/record-visit`.

Management follow-ups (stub) live at `/followups-management` until the full manager module ships.

### Follow-up call outcome schema

The `followups` table stores workflow status (`pending` / `completed` / `cancelled`) separately from call outcome (`interested`, `call_again`, `send_quotation`, `no_answer`, `not_interested`). Optional notes use `completion_notes`. Next follow-ups link back via `parent_followup_id`. Migration: `supabase/migrations/20260902120001_followup_call_outcome.sql`.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run test     # unit tests (vitest)
```

## Architecture notes

See `CLAUDE.md` for product philosophy, database design, and WhatsApp pipeline documentation. WhatsApp setup: `docs/whatsapp-processing.md`.
