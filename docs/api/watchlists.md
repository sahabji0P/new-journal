# Watchlists API

> **Audience**: Developers  
> **Last Updated**: February 23, 2026

## Overview

Watchlists monitor category, tag, or payee spending and can trigger alerts against optional limits.

## Endpoints

### GET `/api/watchlists`

Returns all watchlists for the authenticated user.

### POST `/api/watchlists`

Creates a watchlist.

```json
{
  "name": "Coffee Spending",
  "type": "category",
  "value": "Dining",
  "budgetLimit": 200,
  "period": "monthly",
  "startDate": "2026-02-01",
  "endDate": "2026-02-29",
  "alertEnabled": true,
  "alertThreshold": 80,
  "color": "#FF9900"
}
```

### PUT `/api/watchlists`

Updates a watchlist by `id`.

```json
{
  "id": "watchlist_id",
  "budgetLimit": 250,
  "alertThreshold": 85
}
```

### DELETE `/api/watchlists`

Deletes a watchlist by `id`.

```json
{
  "id": "watchlist_id"
}
```

## Types and Periods

- `type`: `category` | `tag` | `payee`
- `period`: `monthly` | `yearly` | `custom`

## Budget Integration

When a watchlist is `type="category"` and includes a positive `budgetLimit`:

- The backend ensures the active monthly budget has a matching sub-budget allocation.
- If no active monthly budget exists, one is created automatically.
- Existing sub-budget allocation is not reduced; the limit acts as a minimum allocation floor.

## Alert Behavior

When watchlist spend reaches `alertThreshold` percent of `budgetLimit`, the app raises a warning notification and UI toast.

## Related Documentation

- [Budgets API](./budgets.md)
- [Transactions API](./transactions.md)
- [Notifications API](./notifications.md)
