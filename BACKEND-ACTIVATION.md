# Activate accounts, admin review and live flight status

The application now uses Supabase when a valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured. In cloud mode there is no demo role switcher or fallback to local data: users sign in and receive the protected role stored in `profiles`.

## 1. Apply SQL

In Supabase → SQL Editor:

- If the original seven tables do not exist, run `supabase/migrations/202611150001_initial.sql` first.
- Run `supabase/migrations/202611150002_accounts_admin_aviation.sql` once.
- Run `supabase/migrations/202611150003_aviation_singleflight.sql` to coalesce concurrent status lookups. This migration and the updated function have already been applied to the linked project.
- Run `supabase/migrations/202611160001_destination_airports.sql` after the earlier migrations to enable all destination-directory airport codes. This migration is already applied to the linked project.

The second migration adds ADMIN accounts, admin intake review, stronger submission checks, protected schedule/rebooking functions, Realtime publication entries, and a server-only Aviationstack cache/budget ledger. Existing unapproved manager requests are moved back to admin review. Previously approved/ticketed records are preserved.

The sequence is **Employee → ADMIN → assigned MANAGER → TMC → reconciliation**. New requests cannot skip intake or manager approval. Both browser validation and database checks are applied. The service key and SQL Editor remain trusted administrative tools.

- Run `supabase/migrations/202611170001_tmc_fulfillment.sql` after the earlier migrations to enable validated TMC fare and reference entry. This migration is already applied to the linked project.

## 2. Provision actual accounts

Create individual users in Authentication → Users. Insert a profile for each Auth UUID using the template in the previously supplied `SUPABASE-SETUP.md`. Valid roles are `REQUESTOR`, `ADMIN`, `MANAGER`, and `TMC`. Insert managers before linking employees to them. Role changes are administrator operations; there is no public registration path that can assign an elevated role. Use individual credentials for each account.

Add at least one ADMIN profile using its actual Auth UUID, employee details, and `role='ADMIN'`. There is deliberately no hardcoded admin password.

## 3. Deploy the protected provider function

Deploy the **aviationstack** folder with its imported handler and `_shared/aviation.ts` module using the CLI below, or include all three source files in a dashboard/API deployment while preserving their relative paths. Pasting only `index.ts` is insufficient. Keep JWT verification enabled. In Edge Function Secrets add **AVIATIONSTACK_API_KEY** with your provider key. It is never imported into the React bundle or included in the source ZIP.

Secret `APP_ALLOWED_ORIGINS` accepts comma-separated app origins. It is configured for `https://unilever-travel-ph.vercel.app`, `http://localhost:5173` and `http://127.0.0.1:5173`. Keep it aligned with the actual website domain. The previous ChatGPT-hosted default did not allow Vercel and caused HTTP 403 preflight failures.

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

Cloud ticketing accepts final PHP fare totals, PNR, ticket number and consultant name from TMC accounts through the protected ticketing RPC. Blank amounts use server-calculated inventory fares; blank PNR/ticket values generate references. The database validates amounts, reference uniqueness, approved status and matching seats, and derives billing from the protected manager baggage authorization. All itinerary inventory remains required. See **TMC-FULFILLMENT-FIX.md**.

## 5. Verify

1. Employee signs in, submits a request, sees `Admin review`.
2. Admin signs in with a separate account, records remarks and clears intake.
3. Assigned manager signs in and approves; other managers must not see an actionable request.
4. TMC assigns matching flights and issues the ticket. Inventory updates atomically.
5. Check split billing and settle the ledger.
6. Search an IATA flight number on Live Flight Status. Empty/provider error states must remain visible rather than being replaced by fabricated live results.

There is no automatic provider polling. Only explicit form submission can invoke the function. Lookups (including empty results) are cached for 15 minutes from their original fetch timestamp, limited to one uncached request per user per minute, and capped at 80 upstream attempts per calendar month. A short server-side lease avoids duplicate concurrent upstream calls for the same flight. Other applications using the same provider key are outside that cap. Aviationstack currently advertises HTTPS on the free plan; this function uses HTTPS with no insecure HTTP fallback. Real-time coverage is provider-dependent, and historical/future data requires suitable access. Never substitute internal demo inventory for a live provider result.

The linked backend is active. The updated function, origin secret and third migration are deployed. Controlled server verification queried PR2845 once over HTTPS, reused its cached response on the second request, and confirmed one upstream call/one usage reservation. The provider returned no live records, which must remain an explicit empty state. Deployed Vercel preflight returned 204 and anonymous POST returned 401. Full signed-in production-browser verification remains pending. See `SHELL-LIVE-STATUS-FIX.md` for validation details.

Smartpoint Cloud was used as a screenshot reference for compact outline icons and segmented flight panels. No proprietary vector file format or Travelport integration is claimed.

References:
- https://aviationstack.com/pricing
- https://aviationstack.com/faq
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/quickstart-dashboard
