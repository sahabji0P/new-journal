# Budgets API

> **Audience**: Developers  
> **Last Updated**: February 23, 2026

## Overview

Budgets support monthly, event, and trip planning with category-level allocations (`subBudgets`).
Budget spending is transaction-driven and shared-expense aware.

## Key Behavior

- Only **one active monthly budget** can exist at a time.
- Creating or re-activating a monthly budget auto-deactivates other active monthly budgets.
- Expense sync uses **budget impact amount**:
  - Personal expense: full expense amount
  - Shared expense: user share only (derived from `totalAmount - sum(splits[].amount)`)
- Budget threshold notifications trigger only when usage crosses warning/critical boundaries.

## Endpoints

### GET `/api/budgets`

Returns all budgets for the authenticated user with embedded `subBudgets`.

### POST `/api/budgets`

Creates a budget.

```json
{
  "name": "Main Monthly Budget",
  "type": "monthly",
  "method": "envelope",
  "periodType": "monthly",
  "totalAllocated": 2500,
  "warningThreshold": 80,
  "criticalThreshold": 100,
  "alertWindowDays": 5,
  "enforcementMode": "soft",
  "isActive": true,
  "subBudgets": [
    {
      "categoryId": "cat_food_id",
      "category": "Food",
      "allocated": 500,
      "alertThreshold": 80
    }
  ]
}
```

### PUT `/api/budgets`

Updates an existing budget by `id`.

```json
{
  "id": "budget_id",
  "name": "Updated Budget Name",
  "isActive": true,
  "warningThreshold": 85
}
```

### DELETE `/api/budgets`

Deletes a budget by `id`.

```json
{
  "id": "budget_id"
}
```

### GET `/api/budgets/summary`

Returns computed budget health for the selected period with optional expense scope filters and pending settlement context.

#### Query Parameters

- `period`: `month` (default) | `last30` | `custom`
- `start`: required when `period=custom`
- `end`: required when `period=custom`
- `scope`: `all` (default) | `personal` | `shared`

#### Response Shape

```json
{
  "scope": "all",
  "range": {
    "start": "2026-02-01T00:00:00.000Z",
    "end": "2026-02-28T23:59:59.999Z"
  },
  "totals": {
    "allocated": 3000,
    "spent": 1725.5,
    "remaining": 1274.5,
    "usagePercent": 57.52,
    "atRiskCount": 1,
    "overLimitCount": 0
  },
  "pending": {
    "payables": 220,
    "receivables": 145,
    "net": -75,
    "count": 4
  },
  "budgets": []
}
```

## Notes

- `scope=personal` excludes shared transactions from spend totals.
- `scope=shared` includes only shared transactions.
- `pending` is informational and does not alter budget `spent`.

## Related Documentation

- [Transactions API](./transactions.md)
- [Watchlists API](./watchlists.md)
- [User Guide: Budgets](../user-guide/budgets.md)
