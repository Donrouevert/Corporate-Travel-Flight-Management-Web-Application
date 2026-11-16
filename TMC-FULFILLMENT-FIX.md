# TMC fulfillment correction

The cloud form disabled fare, PNR and ticket inputs. The cloud adapter rejected manual overrides, and the original two-argument RPC accepted only inventory selections. Consultant-name edits were also ignored by that RPC. The form did not explain empty inventory, stale preselected IDs or failed inventory queries.

TMC can now enter final booking-wide PHP base fare, taxes, baggage fee, consultant name, PNR and ticket number. Blank amounts use inventory fares; blank references auto-generate. A third required JSON argument selects the new RPC overload without ambiguity. The original two-argument signature remains available and delegates to inventory defaults for existing deployed clients.

The database verifies the TMC role, approved request, valid references, non-negative two-decimal amounts, numeric limits and requested baggage quantity. It retains itinerary-date/route checks in Asia/Manila, future departures, non-overlapping legs, sufficient seats, inventory/request locks, unique references and atomic rollback. It derives company/employee allocation from the manager's protected baggage authorization. The authenticated profile ID remains the booking's TMC actor even when the consultant display name is entered manually. Quoted amounts are booking snapshots; schedule prices are unchanged.

The panel explains missing/loading/error inventory, offers retry and links to Flight Operations. It requires a valid flight for every leg and ignores stale preferred-flight IDs that fail matching. Choosing a different flight restores inventory fare defaults. Amounts cover all travelers and legs; the baggage field stays unavailable when no additional baggage is requested.

## Verification

- 200 Vitest tests pass, including new cloud-form and RPC-contract tests.
- Production TypeScript/Vite build passes.
- `supabase/tests/tmc-fulfillment.mjs` passes 24 isolated PostgreSQL scenarios, including manual totals/references, automatic defaults, zero fares, split billing, approval/role gates, malformed data, reference conflicts and rollback when a later leg has no seats. It also reapplies the migration to verify idempotence.
- Migration `202611170001_tmc_fulfillment.sql` is applied to the linked Supabase project. The remote function body exactly matches the tested source; authenticated execution is granted, anonymous execution is denied. No production booking was issued during verification.
- A live inventory audit found no MNL–SIN or SIN–MNL schedules. The illustrated November 22/24, 2026 approved request therefore needs actual matching inventory created in Flight Operations before issuance. No substitute schedules or prices were invented.
- Browser visual verification remains pending; the environment's browser preview previously timed out connecting to the local server.

Optional isolated SQL test setup (PGlite is a testing dependency, not an application dependency):

```powershell
npm install --no-save --package-lock=false @electric-sql/pglite
node supabase/tests/tmc-fulfillment.mjs
```

Push the frontend source to the Vercel-connected `main` branch to publish the enabled inputs. The backend supports both old and updated clients during deployment.

## Subsequent role-workflow update

The current system also requires an approved total booking budget. TMC can submit an over-budget quote for Manager review, source matching inventory inline and replace an approved rebooking atomically. Billing uses differences from earlier reconciled amounts. See **ROLE-WORKFLOWS.md**; current validation is 232 application tests, 47 isolated SQL scenarios and migration-preservation checks.
