# Watchlists API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Watchlists track spending on specific categories, tags, or payees with custom alerts.

## Endpoints

### GET /api/watchlists
Returns all watchlists.

### POST /api/watchlists
Creates a new watchlist.

**Request Body**:
```json
{
  "name": "Coffee Spending",
  "type": "category",
  "value": "Dining",
  "budgetLimit": 200,
  "period": "monthly",
  "startDate": "2024-02-01",
  "endDate": "2024-02-29",
  "alertEnabled": true,
  "alertThreshold": 80,
  "color": "#FF9900"
}
```

**Types**: "category", "tag", "payee"
**Periods**: "monthly", "yearly", "custom"

### PATCH /api/watchlists/[id]
Updates watchlist settings.

### DELETE /api/watchlists/[id]
Deletes watchlist.

## Alert Behavior

When spending exceeds `alertThreshold` percentage:
- Notification created
- Toast alert shown (real-time)

Example: 80% threshold on $200 limit = Alert at $160

## Related Documentation
- [Transactions API](./transactions.md)
- [Notifications API](./notifications.md)
- [User Guide: Watchlists](../user-guide/watchlists.md)

---
