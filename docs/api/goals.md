# Goals API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Goals represent savings targets with progress tracking. Can be linked to accounts and include monthly contribution targets.

## Endpoints

### GET /api/goals
Returns all goals for the user.

### POST /api/goals
Creates a new savings goal.

**Request Body**:
```json
{
  "name": "Emergency Fund",
  "targetAmount": 10000,
  "targetDate": "2024-12-31",
  "monthlyContribution": 500,
  "priority": "high",
  "color": "#00AA66",
  "icon": "shield",
  "accountId": "acc456",
  "includeInSpendingPlan": true,
  "notes": "3-month emergency fund"
}
```

**Required**: `name`, `targetAmount`

### PATCH /api/goals/[id]
Updates goal details and progress.

### DELETE /api/goals/[id]
Deletes goal.

## Goal Contribution

To update goal progress, send PATCH request:

```json
{
  "currentAmount": 5000
}
```

## Milestone Notifications

Automatic notifications at:
- 25% progress
- 50% progress
- 75% progress
- 100% completion

## Related Documentation
- [User Guide: Goals](../user-guide/goals.md)
- [Accounts API](./accounts.md)

---
