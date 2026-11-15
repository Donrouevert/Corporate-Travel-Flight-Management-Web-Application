# Unilever Philippines · Better Journeys

React 19 / TypeScript / Vite 8 corporate travel SPA with role-specific dashboards, required admin intake, manager approval, TMC fulfillment, split billing and protected Aviationstack status lookup.

## Run

```powershell
npm ci
npm run dev
npm run build
npx vitest run
```

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` to use actual Supabase accounts and shared records. Without a valid connection configuration, the app offers clearly labeled simulated local demo accounts backed by IndexedDB. Cloud mode never falls back to demo records after an error. Do not put server secrets in `VITE_` variables.

## Backend activation

Follow **BACKEND-ACTIVATION.md** to apply the initial schema if needed, apply the new admin/aviation migration, provision individual accounts and deploy the `aviationstack` Edge Function with its server secret. Frontend publication alone does not deploy Supabase migrations, profiles or Edge Functions.

Each account receives REQUESTOR, ADMIN, MANAGER or TMC access from a protected profile. The header offers account details and sign-out rather than role switching. Employee requests pass through **Admin → assigned Manager → TMC** before ticketing. Role-filtered dashboards and navigation are backed by database RLS and transactional RPCs in cloud mode. Profiles must be provisioned by a trusted administrator.

## Pages

- `/dashboard`: role-specific personal dashboard or action queue.
- `/flight-status`: manually triggered Aviationstack flight status, separate from bookable inventory.
- `/flights/search`: corporate route, cabin, fare, baggage and Eco-Choice filters.
- `/bookings/new`: required-field request wizard; `/bookings` and `/bookings/:id`: lifecycle records, reviews and printable form.
- `/admin/flights`: TMC-only schedules, carrier operations and dispatch.
- `/payments`: TMC reconciliation and split billing.

Status lookups use an authenticated server proxy, persistent 15-minute caching, one uncached request/user/minute and an 80-call monthly upstream budget. Aviationstack does not provide reservable seats or corporate PHP fares. These remain in corporate flight inventory. Eco labels and seed emissions are illustrative data.

The visuals follow the supplied Smartpoint screenshot's compact outline-icon and segmented-panel style. This is not a proprietary Travelport vector format or Travelport integration.

## Verification

61 Vitest tests pass, including required-field and flight-search validation, admin-first gatekeeping, role enforcement, seat transaction rollback, concurrent oversell prevention, billing, sign-in and password recovery. Both migrations were executed in a local PostgreSQL-compatible runtime with Auth stubs, including tests for RLS, stage gates, billing, settlement, provider-cache access, rate limiting and monthly budget enforcement. Browser QA checked role dashboards, admin intake, employee record isolation, restricted routes and responsive account screens. One HTTPS provider call confirmed the supplied Aviationstack key works.

The remote migrations, four assigned account profiles and Aviationstack Edge Function are deployed. A real-user end-to-end cloud test remains pending. PNRs/tickets and settlement records are application simulations; no airline reservation or payment provider integration is included.

## Password recovery

Supabase Auth handles reset emails with `resetPasswordForEmail` and password changes with `updateUser`; no separate reset API is needed. The email link returns to `/auth/reset-password`. The recovery screen requires an authenticated session, validates a minimum of eight characters and matching confirmation, and signs out before returning to sign-in. Invalid or expired links offer a new reset email. There is no social sign-in.

The hosted Site URL and reset redirect allowlist are configured in Supabase. Local development on port 5173 is also allowed. If the app moves to another domain or port, add that exact `/auth/reset-password` URL in Supabase **Authentication → URL Configuration**.

Configure a custom SMTP provider under **Authentication → Email → SMTP Settings** before sending reset emails to general users. This project's custom SMTP is currently unconfigured; Supabase's default sender only allows organization team addresses. See https://supabase.com/docs/guides/auth/auth-smtp. Automated recovery tests mock Supabase calls; no real reset emails were sent and no account passwords were changed during testing.

