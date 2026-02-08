# Recurring Transactions API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Recurring transactions represent regular bills and income (subscriptions, rent, salary). Can auto-create transactions or send reminders.

## Endpoints

### GET /api/recurring
Returns all recurring transactions.

### POST /api/recurring
Creates a new recurring transaction.

**Request Body**:
```json
{
  "description": "Netflix Subscription",
  "amount": 15.99,
  "category": "Entertainment",
  "type": "expense",
  "accountId": "acc456",
  "frequency": "monthly",
  "startDate": "2024-02-01",
  "nextDueDate": "2024-03-01",
  "autoCreate": true,
  "reminderDays": 3,
  "notes": "Premium plan",
  "tags": ["subscription"]
}
```

**Frequency options**: "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"

### PATCH /api/recurring/[id]
Updates recurring transaction details.

### DELETE /api/recurring/[id]
Deletes recurring transaction.

## Auto-Creation

When `autoCreate: true`, transactions are automatically created when `nextDueDate` arrives. The `nextDueDate` is then updated based on frequency.

## Reminders

When `reminderDays` is set, notification created N days before due date.

## Related Documentation
- [Transactions API](./transactions.md)
- [User Guide: Recurring Transactions](../user-guide/recurring-transactions.md)

---
