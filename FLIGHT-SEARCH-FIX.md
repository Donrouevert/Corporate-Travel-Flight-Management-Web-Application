# Find a flight: diagnosis and verification

## Observed cause

The screenshot searches **MNL → CEB on 20 November 2026**. The Supabase project has **zero schedules on that route/date**. Its seeded MNL → CEB dates are **2, 3, 4 and 14 February 2027**. The page originally defaulted to five days after the current date and displayed a browser-demo hint about outbound/return dates, even in cloud mode. Those assumptions did not describe the database seed.

The cloud branch already uses `CloudRepository`, not IndexedDB/Dexie, with `from('flight_schedules').select('*,flight_cabins(*)')`. The actual table is named `flight_schedules`, not `flights`; its timestamp is `departure_timestamp`, not `departure_time`. No schema rename or extra database seed was needed.

The original filter's blank time bounds were already skipped correctly. Dropdown option values were already bare IATA codes; the full labels were presentation text. Neither was the observed reason for the screenshot's empty result. Both behaviors are now covered by regression tests.

Two additional defects/limitations were identified: joined cabin names were matched with exact casing, and the lowest-fare sort used base fare even though displayed fares include taxes and cabin pricing. Only price and departure sorts were exposed. The generic date/time filter also sliced timestamp text, which was fragile for raw UTC timestamps; the original cloud mapper's +08 conversion was already correct for the existing seed.

## Changes

- Initialize the first route date from actual available inventory, with a matching reverse-route date for round trips. Never overwrite a date the user entered, including while the fetch is pending.
- Show clickable stored Economy inventory dates and distinguish a missing schedule from a schedule excluded by cabin, traveler count or other filters. Search refreshes the Supabase inventory while retaining existing results during the refresh.
- Normalize IATA codes from labels such as `MNL · Manila`, and normalize joined cabin names case-insensitively. Missing cabins remain unavailable; no seats are invented.
- Share an explicit `Asia/Manila` date/time conversion between the cloud mapper and filter. Early-morning Philippine departures match their Philippine date even when the source is raw UTC.
- Check cabin seats against traveler count. Apply `maxFarePerTraveler` to the per-person fare including taxes; retain `maxPrice` compatibility for existing callers. Economy uses base fare plus taxes; Premium Economy and Business retain the existing server's cabin multipliers.
- Skip blank time bounds, reject invalid time ranges, evaluate each itinerary leg independently, and use independent outbound/return time windows.
- Sort by tax-inclusive fare, numeric departure instant, duration or CO₂, with deterministic tie-breaks. Clearing the departure date no longer throws a date-formatting error.

## Live Supabase verification

Inspected project `iibowunehpqmctifcijt` on 15 November 2026:

| Check | Result |
| --- | --- |
| Stored schedules | 20 |
| Joined cabin rows | 60; Economy, Premium Economy and Business for every schedule |
| Economy availability | 179 seats per seeded flight |
| Premium Economy / Business availability | 0 seats; correctly excluded from results |
| RLS | Enabled on both flight tables |
| Signed-in SELECT | Allowed by grants and profile-based policies |
| All four assigned roles | Each sees 20 schedules, 60 cabin rows and the matching MNL → CEB flight |

Role checks ran in read-only transactions under `authenticated` with each existing account's subject. No permissions, profiles, inventory or booking records were changed. The role/table grants and RLS were sufficient; weakening policies was unnecessary.

The updated TypeScript mapper and filter were then executed against a fresh live database read using Vite's server module loader, without browser automation or sending any email:

| Search | Result |
| --- | --- |
| MNL → CEB, 2027-02-02, Economy, 1 traveler, blank times | `DEMO01A`; 179 available seats; PHP 2,457 per traveler |
| Same search, max fare PHP 2,456 | No match |
| Same search, max fare PHP 2,457, 2 travelers | One match; fare ceiling remains per traveler |
| Same search, departure from 08:01 | No match; the seeded flight departs at 08:00 PHT |
| Same route/date, Business | No match; seeded Business availability is zero |
| MNL → CEB, 2026-11-20 | No match; no schedule exists |
| CEB → MNL, 2027-02-06 | Two matching return schedules |

These are **demo inventory fares**. The original PHP 4,914 round-trip snapshot is allocated equally between legs; PHP 2,457 is the seeded one-leg allocation, not a newly verified live one-way airline quote.

## Validation and rollout

All **91 tests** and the **production build** pass. Tests cover the actual captured, non-personal seeded flight rows, UTC/offset boundary dates, display labels, lowercased cabin joins, optional times, seat and fare limits, all sort modes, safe date clearing, explicit date preservation, one-way, round-trip and multi-city page behavior.

The source changes are local and included in the updated source ZIP. Push them to the GitHub branch connected to Vercel and wait for a successful deployment. The database itself required no changes. The production page was not modified through browser automation, and a signed-in production-browser test has not been performed.
