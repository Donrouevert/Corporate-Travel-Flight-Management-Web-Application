# Activate accounts, admin review and live flight status

The application now uses Supabase when a valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured. In cloud mode there is no demo role switcher or fallback to local data: users sign in and receive the protected role stored in `profiles`.

## 1. Apply SQL

In Supabase → SQL Editor:

- If the original seven tables do not exist, run `supabase/migrations/202611150001_initial.sql` first.
- Run `supabase/migrations/202611150002_accounts_admin_aviation.sql` once.

The second migration adds ADMIN accounts, admin intake review, stronger submission checks, protected schedule/rebooking functions, Realtime publication entries, and a server-only Aviationstack cache/budget ledger. Existing unapproved manager requests are moved back to admin review. Previously approved/ticketed records are preserved.

The sequence is **Employee → ADMIN → assigned MANAGER → TMC → reconciliation**. New requests cannot skip intake or manager approval. Both browser validation and database checks are applied. The service key and SQL Editor remain trusted administrative tools.

## 2. Provision actual accounts

Create individual users in Authentication → Users. Insert a profile for each Auth UUID using the template in the previously supplied `SUPABASE-SETUP.md`. Valid roles are `REQUESTOR`, `ADMIN`, `MANAGER`, and `TMC`. Insert managers before linking employees to them. Role changes are administrator operations; there is no public registration path that can assign an elevated role. Use individual credentials for each account.

Add at least one ADMIN profile using its actual Auth UUID, employee details, and `role='ADMIN'`. There is deliberately no hardcoded admin password.

## 3. Deploy the protected provider function

Using the Supabase dashboard, create an Edge Function named **aviationstack** and paste `supabase/functions/aviationstack/index.ts`. Keep JWT verification enabled. In Edge Function Secrets add **AVIATIONSTACK_API_KEY** with your provider key. It has also been saved in the git-ignored `.env.server.local` for local CLI deployment; it is never imported into the React bundle or included in the source ZIP.

Optional secret `APP_ALLOWED_ORIGINS` accepts comma-separated app origins. The current defaults permit the existing private hosted Site and localhost:5173. Add your own domain if you host elsewhere.

If you prefer a linked, authenticated Supabase CLI:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set --env-file .env.server.local
supabase functions deploy aviationstack
```

The Edge Function uses Supabase's built-in server credentials to reserve quota and cache responses; do not put a service-role key in any `VITE_` variable.

## 4. Flight inventory

Aviationstack's current-flight data provides status, airports, gates and schedule timestamps. It does not provide corporate PHP fares or seats you can reserve. Maintain bookable schedules in Flight Operations using the TMC account. Cloud records are not silently replaced with demo flight data. The CloudRepository maps SQL cabin records and booking legs back to the app models.

Cloud ticketing uses server-calculated fares and generated references. Leave the manual fare/PNR override fields empty; the cloud adapter rejects overrides rather than silently accepting untrusted totals.

## 5. Verify

1. Employee signs in, submits a request, sees `Admin review`.
2. Admin signs in with a separate account, records remarks and clears intake.
3. Assigned manager signs in and approves; other managers must not see an actionable request.
4. TMC assigns matching flights and issues the ticket. Inventory updates atomically.
5. Check split billing and settle the ledger.
6. Search an IATA flight number on Live Flight Status. Empty/provider error states must remain visible rather than being replaced by fabricated live results.

There is no automatic provider polling. Lookups are cached for 15 minutes, limited to one uncached request per user per minute, and capped at 80 upstream calls per calendar month to leave headroom within the provider's currently documented 100-request free allowance. Other applications using the same provider key are outside that cap. Provider plan restrictions remain applicable; the free plan is advertised for non-commercial use, and historical/future data requires suitable access.

The supplied key was verified with one successful HTTPS provider request. Database migrations and role enforcement were executed against a local PostgreSQL-compatible test runtime with Supabase Auth stubs; this does not prove your remote project has applied them. The remote backend cannot be activated here without authenticated Supabase management access.

Smartpoint Cloud was used as a screenshot reference for compact outline icons and segmented flight panels. No proprietary vector file format or Travelport integration is claimed.

References:
- https://aviationstack.com/pricing
- https://aviationstack.com/faq
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/quickstart-dashboard
