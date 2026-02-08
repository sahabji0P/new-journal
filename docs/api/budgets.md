# Budgets API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Budgets help track spending limits with sub-budget allocations by category. Supports monthly, event-based, and trip budgets.

## Endpoints

### GET /api/budgets
Returns all budgets with sub-budgets for the authenticated user.

**Response**: Array of budget objects with embedded sub-budgets.

### POST /api/budgets
Creates a new budget with sub-budget allocations.

**Request Body**:
```json
{
  "name": "February 2024",
  "type": "monthly",
  "totalAllocated": 2000,
  "startDate": "2024-02-01",
  "endDate": "2024-02-29",
  "rollover": false,
  "subBudgets": [
    {
      "category": "Groceries",
      "allocated": 500,
      "alertThreshold": 80
    },
    {
      "category": "Dining",
      "allocated": 300,
      "alertThreshold": 80
    }
  ]
}
```

### PATCH /api/budgets/[id]
Updates budget details.

### DELETE /api/budgets/[id]
Deletes budget and all sub-budgets.

## Budget Types
- `monthly`: Recurring monthly budget
- `event`: One-time event budget
- `trip`: Travel/trip budget

## Automatic Features
- Real-time spending calculation
- Alert triggers at 80% (configurable)
- Sub-budget tracking by category
- Rollover support (unused budget to next period)

## Related Documentation
- [Transactions API](./transactions.md)
- [User Guide: Budgets](../user-guide/budgets.md)

---
