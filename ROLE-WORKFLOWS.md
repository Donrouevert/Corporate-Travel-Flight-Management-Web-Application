# Role dashboards and travel workflow

Every role uses the shared Unilever shell, cards, forms, responsive rules, dark/light themes and module transitions. Its dashboard content and primary actions are specific to its responsibilities.

| Role | Dashboard and actions | Modules |
| --- | --- | --- |
| REQUESTOR | Personal journeys, upcoming ticket, corrections and rebooking | Dashboard, My requests, New request/revision wizard, shared flight reference/status |
| ADMIN | Intake queue, correction tracking and completeness/cost-center/policy checklist | Dashboard, Request administration, shared flight reference/status |
| MANAGER | Assigned decisions, estimates/final quotes and approved spending exposure | Dashboard, Team approvals, shared flight reference/status |
| TMC | Approved dispatch, missing inventory, replacement tickets and billing balances | Dashboard, Travel records, Flight operations/dispatch, Payments & billing, shared flight reference/status |

Direct request-editor URLs are restricted to Requestors. Flight operations and billing URLs are TMC-only. Shared flight search remains available for reference; only Requestors receive request-creation actions. Database functions independently enforce actor role, ownership, assigned manager and workflow stage. Client navigation does not grant permissions.

## Normal requests and spending limits

Requestor submits → Admin validates completeness/policy/cost center → assigned Manager approves business need, total booking budget and baggage authorization → TMC assigns flights and issues within the approved limit → TMC reconciles billing.

The Requestor may supply an estimated total for all travelers/legs; search handoffs prefill it from selected fares. The Manager must explicitly approve a non-negative total booking cap, including employee-payable baggage. A final quote above that cap returns directly to the assigned Manager for budget approval without repeating Admin intake. Quotes are server-calculated/validated and do not reserve seats; ticketing checks current availability and the budget again. Reviewed quote details prefill fulfillment after approval.

## Corrections

Admin or the assigned Manager can return an actionable request with remarks. Only its Requestor can correct and resubmit it. The same UUID/reference is retained, its revision increases and prior details remain in protected history. Revised submissions repeat Admin and Manager review; old budget/approvals cannot carry over. Stale drafts are rejected. Protected account identity and assigned-manager data come from profiles, while editable department/position/contact/cost-center snapshots are validated and retained.

## Inline flight sourcing

TMC can add a matching flight directly from fulfillment. The shared schedule editor prefills route/date, travel type, preferred times and minimum cabin seats from that approved leg; the consultant confirms actual carrier details, times, fare and capacity. Saving selects the new flight for the leg. A nested schedule form cannot accidentally submit ticket issuance. Inventory is still mandatory for every leg.

## Rebooking and billing

The owner can submit a revised itinerary from a ticketed journey. It returns through Admin/Manager review while the issued ticket and seat reservations remain held. TMC then issues a replacement atomically: old booking/legs are archived, old seats released and new seats reserved in the same transaction. A failure or concurrent change leaves the original ticket/seats intact. A booking can retain its own last held seat. The owner can withdraw unfinished changes and return to the original ticket.

Previously reconciled company/employee amounts remain tracked. Rebooking shows only the difference from those amounts, including negative credit adjustments and transfers between company and employee baggage responsibility. Reconciliation posts signed adjustments and updates the balances instead of recording the full fare twice. Historical bookings and references remain readable in revision history. No airline reservation/payment-provider integration is introduced.

## Activation and verification

`202611180001_role_workflows.sql` is applied to the linked Supabase project. All 12 affected function bodies match the tested source; public RPCs grant signed-in execution, private helpers and anonymous access remain restricted. Three new audit tables have RLS enabled. The remote verification retained 10 tickets, opened 6 historical paid balances without discrepancies and archived/returned 1 unticketed approval for an explicit budget review. Existing tickets were not reissued during verification.

232 Vitest tests pass, including role dashboards/navigation/direct URL guards, correction forms, budget decisions, quote handoff, nested inventory entry, local lifecycle parity, stale drafts and numeric credit export. There are 47 isolated PostgreSQL scenarios (24 fulfillment + 23 workflow), plus migration checks preserving existing references/fares/settlements and returning only unticketed approvals for budget review. The production build passes. Production-browser visual/device/frame-rate verification remains pending: Windows Computer Use stopped because it could not reliably determine the current browser URL.

Optional isolated PostgreSQL test setup:

```powershell
npm install --no-save --package-lock=false @electric-sql/pglite
node supabase/tests/tmc-fulfillment.mjs
node supabase/tests/role-workflows.mjs
node supabase/tests/role-migration.mjs
```

Publish the frontend by pushing the current source to the Vercel-connected main branch. The updated Manager screen is required to enter a budget; older clients cannot approve without it. No environment-variable changes or new accounts/roles are needed.
