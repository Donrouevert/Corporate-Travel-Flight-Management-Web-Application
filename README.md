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

190 Vitest tests pass, including required-field and flight-search validation, admin-first gatekeeping, role enforcement, seat transaction rollback, concurrent oversell prevention, billing, sign-in, password recovery, loading placeholders, immediate navigation, lazy-module readiness, account-cache preservation, shell branding, mobile drawer behavior, on-demand status requests, cache reuse, provider errors and PHT rendering. All four migrations were checked in a local PostgreSQL-compatible runtime with Auth stubs, including RLS, stage gates, billing, settlement, provider-cache access, single-flight leases, rate limiting and monthly budget enforcement. Earlier browser QA checked role dashboards, admin intake, employee record isolation, restricted routes and responsive account screens. Current shell/status UI behavior is covered by DOM component tests; a new production-browser visual test has not been performed.

The remote migrations, four assigned account profiles and updated Aviationstack Edge Function are deployed. A real-user end-to-end cloud test remains pending. See **SHELL-LIVE-STATUS-FIX.md** for the verified CORS correction, cache checks and provider coverage limits. PNRs/tickets and settlement records are application simulations; no airline reservation or payment provider integration is included.

## Loading, navigation and responsive layout

See **FLIGHT-SEARCH-FIX.md** for the inventory/date mismatch diagnosis and live Supabase search verification. In cloud mode, flight search reads `flight_schedules` with joined `flight_cabins`; there is no local-data fallback. The first departure date comes from stored route inventory, and empty results offer actual inventory dates instead of the browser demo's fixed date-offset hint.

Pages load as separate JavaScript modules. Navigation links preload page code on pointer, keyboard-focus or touch intent, without making speculative API requests. Cached records stay visible during background refreshes. Repeated Supabase sign-in events for the same user preserve the mounted page and query cache; changing accounts still clears account data. Realtime updates refresh only the affected travel queries and combine transaction bursts, without invalidating flight-status lookups.

Module entry uses a 170 ms opacity/transform transition. There is no exit wait, minimum skeleton duration or artificial navigation delay. Skeleton layouts cover initial workspace startup, dashboard metrics, lists, request details, forms and flight results. Loading decoration is hidden from screen readers and announced through one status region. Reduced-motion preferences disable the animations.

Responsive rules provide desktop navigation, tablet layouts, mobile forms without iOS focus zoom, larger touch controls, constrained popovers, accessible horizontally scrollable tables and narrow-screen detail panels. Automated tests and the production build pass. Visual verification of this update on phone, tablet and desktop remains pending because the available Windows browser tool stopped before it could verify the browser URL. Smoothness on physical devices and slow networks has not been measured.

`vercel.json` sets Vite, `npm run build`, `dist`, and the SPA fallback for direct module and password-reset links. Push the updated source to the GitHub branch tracked by the existing Vercel project to deploy it. Supabase environment values remain configured in Vercel; server keys stay in Supabase.

## Password recovery

Supabase Auth handles reset emails with `resetPasswordForEmail` and password changes with `updateUser`; no separate reset API is needed. The email link returns to `/auth/reset-password`. The recovery screen requires an authenticated session, validates a minimum of eight characters and matching confirmation, and signs out before returning to sign-in. Invalid or expired links offer a new reset email. There is no social sign-in.

The production Supabase Site URL is `https://unilever-travel-ph.vercel.app`. Its exact recovery URL, `https://unilever-travel-ph.vercel.app/auth/reset-password`, is allowed in Supabase **Authentication → URL Configuration**. The retired ChatGPT-hosted redirect has been removed. The frontend requests the current browser origin, so moving the app requires updating both the Site URL and redirect allowlist. Local development on port 5173 is also allowed. Request a new reset email after changing these settings; old emails may contain the old redirect or an expired/used token.

The reset email uses Supabase's `ConfirmationURL`, which verifies the recovery token before returning to the app. Keep that verification link in the email template; do not replace it with a direct login-page link. Redirect configuration was verified by reading the remote settings back. No real reset email was sent or password changed during verification.

Configure a custom SMTP provider under **Authentication → Email → SMTP Settings** before sending reset emails to general users. This project's custom SMTP is currently unconfigured; Supabase's default sender only allows organization team addresses. See https://supabase.com/docs/guides/auth/auth-smtp. Automated recovery tests mock Supabase calls; no real reset emails were sent and no account passwords were changed during testing.

## Browser icon

The app includes the official Unilever SVG favicon, a 32×32 PNG fallback and a 180×180 Apple home-screen icon under `public/`. `index.html` declares each icon with a version query to refresh cached icons after deployment. See `public/brand/SOURCE.md` for provenance. Push the updated HTML and public assets to the Vercel-connected GitHub repository to publish them.


## Flight search redesign

See **FLIGHT-SEARCH-REDESIGN.md** for the dual-month calendar, Supabase fare directory, booking handoff and regional destination controls. The destination airport migration is already applied to the linked Supabase project. Upload the complete updated source to GitHub for Vercel, including `src/`, `public/`, and `supabase/`; do not upload dependencies or local environment files.

Airport selections now use bounded, animated dropdowns. Departure/return time windows use calendar-style popovers with draft/commit semantics and exact-minute PHT selection. See **FLIGHT-CONTROL-FIX.md** for the interaction changes and visual verification limit.

Collapsed sidebar tooltips now share one controlled active state and clear on state/navigation changes, avoiding stale text boxes after closing the panel. See **SHELL-LIVE-STATUS-FIX.md**.

## Sign-in welcome animation

Successful email/password and demo sign-ins show the official Unilever emblem and wordmark on an ice-blue welcome screen, with a short entrance and soft fade into the workspace (about 1.2 seconds total). The workspace mounts behind an inaccessible overlay while it prepares. The animation waits for the employee profile and cancels on profile errors/sign-out; existing-session restoration, token refresh and password recovery do not replay it. Reduced-motion users skip the animation delay. Tests cover timing, cancellation, failure handling, background accessibility and same-user session behavior. No production-browser animation/framerate check was performed.

## Unified flight tools and branding

The sidebar and header now render the same official script wordmark component, with the official U emblem in the sidebar rail. Live flight status is accessed from the tab bar at the top of **Find a flight**, alongside **Find flights**. Search filters, typed flight numbers and status results survive tab switches; status remains on-demand with the existing 15-minute cache. `/flight-status` redirects to `/flights/search?view=status`, and dashboard shortcuts point to that tab. Keyboard arrow navigation switches tabs; layouts adapt for phone widths and reduced-motion preferences. DOM integration tests cover navigation, state retention, branding consistency and zero automatic provider calls. Browser/device visual verification remains pending.

## Clock picker and aligned flight form

Departure/return windows now use an analog 24-hour clock styled after the supplied reference, with inner 1–12 and outer 13–00 hour rings, automatic progression to minutes, a draggable minute hand, and editable HH:mm fields. Exact minutes, keyboard adjustment, range validation and CLEAR/DONE draft behavior remain supported. Clock geometry and drag interactions are tested. Date and traveler controls use adjacent grid columns; multi-city airport/date fields share aligned labels and input baselines, with Add leg placed separately from the time windows. Responsive layouts stack controls into two columns. Production build and regression checks pass; rendered alignment and animation across physical devices have not been visually verified.

## Sidebar palette

Desktop and mobile sidebars use the reference palette: navy `#14213D`, amber `#FCA311`, white and light grey `#E5E5E5`. Official logo assets are rendered white on the navy sidebar; header branding keeps its original blue. Navigation, badges, profile details, Eco-Choice card, focus states and drawer controls share scoped sidebar colors. Calculated text contrast ratios are 15.97:1 for white/navy, 12.68:1 for light grey/navy, 7.90:1 for active navy/amber and 6.64:1 for the amber Eco-Choice link/card. Production build and existing sidebar interaction checks pass. No new physical-device visual verification was performed.

## Name-only identity labels

Email-provisioned profile names now display only the local name (for example, `donrouevert@gmail.com` becomes `donrouevert`). This applies to header/sidebar/account labels, traveler/manager/consultant names, legacy request displays and activity messages. Existing human names are preserved. The presentation projection leaves authentication/contact email fields, identifiers, roles and stored signatures intact; no backend migration is required. Regression tests check all four requested handles, immutable snapshot rendering and preservation of full contact addresses.

## Light and dark appearance

Use the moon/sun button in the top-right workspace header (also available on account screens). The preference is stored locally and restored before the application renders; the operating-system preference supplies the initial appearance when no choice has been saved. Theme changes preserve active forms and are synchronized across browser tabs. A short color transition and rotating icon respect reduced-motion preferences.

Dark mode uses a deep navy canvas, layered navy panels, soft white text, amber actions and blue links. Calendars, the analog clock, menus, dialogs, tables, request forms, status badges, skeletons, toast notifications and the sign-in welcome screen share coordinated dark colors. Photographs retain their original colors, and logos are rendered white on dark surfaces. Print styles use the light palette. Tests cover persistence, both toggle directions, OS/default behavior, reduced motion, storage failures, cross-tab updates and preservation of form state. Calculated contrast for the main dark text, links and semantic status combinations ranges from 7.68:1 to 16.51:1. Production build and regression checks pass; browser/device visual verification remains pending.

## Demo flight-status fallback

In **Find a flight → Live flight status**, enter a seeded code such as `DEMO01A` to view the saved Supabase schedule. Spaces/hyphens and letter case are normalized. Demo codes bypass Aviationstack entirely and show an explicit **Demo flight · Scheduled / Delayed / Cancelled** label, route and PHT schedule times. The current interval, next future schedule or latest past schedule is selected; operational progress, actual times, gates and delays are never invented. Real IATA flight numbers retain their existing live-provider path and empty/error handling.

Both paths are submit-only with separate account-scoped 15-minute caches. No request runs on typing, tab activation, focus or reconnect. Demo database failures remain errors; missing demo records have a clear empty state. No SQL migration or Edge Function deployment is needed. The existing `DEMO01A` row was verified in Supabase as MNL–CEB on 2 February 2027, 08:00–09:30 PHT, with stored status SCHEDULED. Component tests verify routing, cache reuse/expiry, PHT rendering and zero provider calls for demo lookups; real-user production-browser verification remains pending.

## Browser reload animation

A browser refresh shows a compact Unilever flight-path card with amber movement and “Refreshing your workspace”. It starts from the HTML shell before the React bundle and session restore, then fades out after the initial account screen or lazy route commits. It has a 650 ms minimum presentation and 180 ms fade, with no animation delay for reduced-motion users. It follows the saved light/dark theme and offers Try again after 12 seconds if startup stalls; startup errors dismiss it immediately.

This is separate from the sign-in emblem welcome. Ordinary navigation, back/forward history, token refresh and module switches do not replay the reload overlay. Tests cover reload detection, readiness, timing, reduced motion, cancellation and background accessibility. The production build passes; browser/device visual and frame-rate verification remain pending.

## Consistent requestor date and time controls

Section B now reuses the TMC flight-search dual-month calendar and analog PHT clock rather than browser-native date/time inputs. Preferred times use the same clock in single-value mode. CLEAR/DONE and Escape preserve draft/commit behavior; cleared required values are blocked by wizard validation. Return dates cannot precede departure, and multi-city dates use the preceding leg as their minimum. Editing leg one updates the departure date as well. Required indicators, theme colors and responsive form/itinerary alignment are preserved. Each shared picker imports its styles directly so opening the request form before Find a flight also renders correctly.

Five integration tests verify serialized request dates/times, independent round-trip preferences, required fields, invalid clock input and multi-city chronology. The existing TMC picker tests and full suite pass. Browser visual verification was attempted, but the preview tool could not connect to the local server (ERR_CONNECTION_TIMED_OUT).
