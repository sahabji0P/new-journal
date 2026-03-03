# Budget Implementation Master Plan

## Document Status
- Owner: Engineering (Codex execution)
- Date: 2026-02-23
- Scope: End-to-end budget upgrade integration across data model, APIs, transaction engine, settlements, watchlists, notifications, UI, exports, and onboarding touchpoints.
- Source of requirements: `Budget Feature Specification for Finance App` (Feb 2026, v1.0)
- Execution status: P0 + planned P1 implementation completed on 2026-02-23
- Verification status: `npm run lint` and `npm run build` passed; manual path checks still pending
- Phase expansion status (wave 1): Insights upgraded with watchlist trend, watchlist frequency, and pace-forecast signals.

## Objectives
1. Make budget accounting correct under personal, shared, and settlement scenarios.
2. Enforce a single active monthly budget and make period behavior predictable.
3. Integrate budgets deeply with transactions, settlements, watchlists, dashboard, insights, and notifications.
4. Add operational controls and UX needed for daily use (filters, pending states, proactive warnings).
5. Lay durable groundwork for advanced phases (event/shared budgets, paycheck mode, lifecycle history).

## Current Baseline (Before This Implementation)
- Budget CRUD exists (`/api/budgets`) with sub-budgets and thresholds.
- Budget summary exists (`/api/budgets/summary`) with at-risk / over-limit metrics.
- Transaction engine updates budget totals by category.
- Shared expense fields exist (`isShared`, `splits`, `totalAmount`) but budget debit logic is not user-share aware.
- Settlements exist (personal + group) but budget adjustment pathways are minimal.
- Watchlists exist but budget linkage is shallow.

## Guiding Principles For This Execution
1. Correctness over cosmetics: budget math must be reliable first.
2. Backward-safe rollout: changes should degrade gracefully when optional data is missing.
3. Server-authoritative accounting: UI hints are not accounting truth.
4. Progressive enhancement: implement robust foundation now, with future-ready extension points.

## Implementation Scope In This Pass

### A. Accounting Engine Hardening (P0)
- [x] Implement canonical `budget impact amount` calculation for expense transactions:
  - Non-shared expense: full absolute amount.
  - Shared expense: user-share only (`max(0, total - othersShare)`), derived from splits.
- [x] Apply impact-based deltas in transaction create/update/delete budget sync.
- [x] Ensure update path handles transitions (expense->income, category/date/account change, shared/non-shared toggles).
- [x] Ensure impact math is used consistently in summary and insights computations.

### B. Monthly Budget Governance (P0)
- [x] Enforce exactly one active monthly budget at any given time.
- [x] On creating a monthly budget, deactivate prior active monthly budget(s).
- [x] On updates that re-activate a monthly budget, auto-deactivate peers.
- [x] Keep event/trip budget activity independent.

### C. Budget Summary & Visibility Layer (P1)
- [x] Extend `/api/budgets/summary` with expense scope filtering:
  - `all` (default), `personal` (exclude shared), `shared` (include only shared).
- [x] Return pending settlement snapshot (payables + receivables) in summary payload.
- [x] Include impact-normalized spend in budget and sub-budget totals.
- [x] Preserve existing response compatibility where possible.

### D. Budget UI Integration (P1)
- [x] Add scope selector (All / Personal / Shared) in budget management page.
- [x] Fetch summary by selected scope.
- [x] Show pending settlement snapshot in budget UI.
- [x] Keep existing category and policy flows intact.

### E. Transaction Form & Shared Semantics (P1)
- [x] Ensure transaction form submits shared metadata explicitly when split is used:
  - `isShared`
  - `splits`
  - `totalAmount`
- [x] Ensure update flow preserves these fields.
- [x] Keep backward compatibility for non-shared expenses.

### F. Watchlist-to-Budget Deep Linking (P1)
- [x] On watchlist creation for `category` with a limit:
  - auto-link by creating missing sub-budget allocation in active monthly budget, OR
  - create a new monthly budget when none exists.
- [x] Keep watchlist CRUD behavior intact when no limit is provided.

### G. Budget Alerting (P1)
- [x] Add server-side threshold crossing detection during budget delta updates.
- [x] Create notification records on warning/critical threshold crossings.
- [x] Keep noise controlled by triggering only on threshold crossing, not every transaction.

### H. Insights Consistency (P1)
- [x] Align budget-alert insight generation to impact-normalized shared logic.
- [x] Reuse same budget impact semantics used by transaction engine and summary.

### I. Documentation Update (P1)
- [x] Update API/user docs to match implemented behavior:
  - shared expense budget impact
  - summary scopes
  - pending settlement visibility
  - monthly budget exclusivity

### J. Verification & Quality Gate (P0)
- [x] TypeScript compile sanity via lint/build.
- [ ] Manual path checks:
  - personal expense -> budget increments
  - shared split expense -> only user share increments
  - update/delete transaction -> budget reverses correctly
  - watchlist category with limit -> budget allocation auto-link works
  - monthly budget create -> only one active monthly remains
  - summary scope toggles produce expected totals
- [x] Record any known follow-ups explicitly.
- Note: Full manual QA execution deferred by product request; to be run as a dedicated end-to-end pass later.

## Deferred (Not Fully Delivered In This Pass, But Prepared)
These are substantial features requiring larger model expansion or additional orchestration layers:
1. Full per-category rollover modes (`accumulate`, `reset`, `negative carry`) with period cycle ledger tables.
2. Event budget lifecycle model (`planning`, `active`, `settling`, `archived`) with participant roles.
3. Shared budget permission model (`owner`, `editor`, `viewer`) and access governance across all actions.
4. Paycheck mode + Ready-to-Assign zero-based allocation flow.
5. Weekly/monthly digest scheduling infrastructure and tone profile framework.
6. Dedicated budget report export stack (PDF + budget-native CSV schema).

## Detailed Task Breakdown

### Task 1: Introduce Budget Impact Utility Functions
Files:
- `app/api/transactions/route.ts`
- `app/api/budgets/summary/route.ts`
- `app/api/insights/generate/route.ts`

Changes:
- Add robust parsers for split payloads.
- Add `resolveBudgetImpactAmount` helper and use everywhere budget spend is computed.

Acceptance:
- Shared transactions do not inflate budgets with full amount.

### Task 2: Harden Transaction-to-Budget Sync
Files:
- `app/api/transactions/route.ts`

Changes:
- Use impact amount in create/update/delete deltas.
- Keep category-matched sub-budget updates and overall budget totals consistent.

Acceptance:
- CRUD operations preserve budget correctness under shared/non-shared toggles.

### Task 3: Enforce One Active Monthly Budget
Files:
- `app/api/budgets/route.ts`

Changes:
- Add transactional enforcement on create/update.

Acceptance:
- Querying budgets never returns more than one active monthly budget.

### Task 4: Extend Budget Summary with Scope + Pending
Files:
- `app/api/budgets/summary/route.ts`

Changes:
- `scope` query param handling.
- Pending settlement aggregation and payload addition.

Acceptance:
- Scope changes affect totals as expected.
- Pending data available for UI.

### Task 5: Budget UI Scope + Pending Card
Files:
- `components/budget/BudgetManagement.tsx`

Changes:
- Scope selector state.
- Scope-aware summary fetch.
- Pending section rendering.

Acceptance:
- User can toggle views and see pending debt/receivable context.

### Task 6: Shared Metadata Submission in Transaction Form
Files:
- `components/transactions/TransactionFormModern.tsx`

Changes:
- Send `isShared` + `totalAmount` when splits are present.

Acceptance:
- API receives enough data to compute user-share impact consistently.

### Task 7: Watchlist->Budget Auto-Link
Files:
- `app/api/watchlists/route.ts`

Changes:
- On category watchlist with limit, ensure active monthly budget has matching sub-budget allocation.

Acceptance:
- Creating a watchlist limit for category creates budget linkage automatically.

### Task 8: Threshold Crossing Notifications
Files:
- `app/api/transactions/route.ts`

Changes:
- Detect warning/critical crossings after delta and write notifications.

Acceptance:
- Notifications trigger only when crossing thresholds.

### Task 9: Insights Alignment
Files:
- `app/api/insights/generate/route.ts`

Changes:
- Use shared-aware impact logic in budget alert insight computation.

Acceptance:
- Insight percentages align with budget summary and dashboard.

### Task 10: Docs Update
Files:
- `docs/api/budgets.md` (and related docs where relevant)

Changes:
- Reflect new behavior and parameters.

Acceptance:
- Docs match shipped behavior.

## Risk Register
1. Shared split interpretation ambiguity
- Mitigation: Treat split rows as non-user shares; user share is remainder.

2. Historical transactions without `totalAmount`
- Mitigation: fallback to absolute `amount`.

3. Budget notification noise
- Mitigation: trigger only on threshold crossing.

4. Runtime schema drift
- Mitigation: avoid mandatory new DB columns in this pass.

## Rollback Strategy
- Feature behavior changes are mostly additive and logic-level.
- If regressions appear:
  - disable scope param in UI (fall back to `all`).
  - temporarily bypass threshold notification creation.
  - keep budget impact helper with fallback to old full-amount behavior behind a local toggle if needed.

## Completion Definition
Implementation is considered complete for this pass when:
1. All P0 and P1 checklist items above are implemented.
2. App builds and lint passes.
3. Manual verification scenarios in section J all pass.
4. Any deferred items remain clearly documented with no silent gaps.
