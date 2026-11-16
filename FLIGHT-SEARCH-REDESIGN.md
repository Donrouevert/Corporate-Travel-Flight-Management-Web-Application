# Flight search redesign

The Find a flight page uses deep navy `oklch(0.26 0.11 260)`, white and ice blue, with a dual-month Base UI calendar, structured fare directory and corporate destination showcase.

- Dates are drafts until DONE. CLEAR resets the draft; DONE applies the cleared state. Escape/outside dismissal discards changes. Round trips advance from departure to return; multi-city legs retain independent dates. Past dates use the Philippine date boundary. Arrow keys navigate calendar days.
- From and To use anchored dropdowns showing city names and IATA codes; keyboard typeahead selects matching city labels. Cabin and sort use accessible Base UI menus. Existing fare, seat, baggage, time, airline and CO₂ filters remain in place.
- Results still come from the existing Supabase `flight_schedules` joined with `flight_cabins`. No new provider lookup or polling was added.
- Each leg reveals six matching rows at a time. One-way BOOK NOW passes the full flight selection to `/bookings/new`. Round-trip and multi-city users select each required leg before requesting the itinerary. The wizard prefills Sections B/C and displays the selected fare estimate. Existing role restrictions and approval stages remain enforced.
- Prices are per traveler, including taxes and excluding additional baggage. A recorded inventory timestamp is used if present; otherwise the UI says `Seen: not recorded`. The existing database has no fare-observation timestamp, so the application does not invent relative quote ages. Demo schedules remain demo fares subject to reconfirmation.
- Destination pills set To and Domestic/International, scroll to the search panel (respecting reduced motion), and focus To. They do not create flights. Migration `202611160001_destination_airports.sql` expands the database whitelist to support the displayed airports; applied to the linked project. Existing rows/RLS unchanged.
- Mobile layouts stack calendar months and convert fare rows to two-column cards. Tablet controls use two columns; desktop controls use four. Reduced-motion preferences disable transitions.
- Coron photograph credited in `public/images/SOURCE.md` and visibly below the banner.

Validation: production TypeScript/Vite build, flight-search component/page tests, existing regression suite, and local PGlite validation of all migrations, including repeated application and new/invalid airport constraint checks. Browser/device visual QA could not finish because Computer Use could not establish the browser URL confidently. Frontend changes require pushing to the connected GitHub repository to deploy on Vercel.

Follow-up: native browser airport suggestions and native time inputs were replaced with consistent Base UI dropdowns/time popovers. See **FLIGHT-CONTROL-FIX.md**.
