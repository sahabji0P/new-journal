# Settlements API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Settlements track money owed between people, typically created from split expense transactions.

## Endpoints

### GET /api/settlements
Returns all settlements.

### POST /api/settlements
Creates a new settlement.

**Request Body**:
```json
{
  "party": "John Doe",
  "amount": 50.00,
  "type": "owed_to_me",
  "reason": "Split dinner at Italian restaurant",
  "isSettled": false
}
```

**Type values**: "owed_to_me" (they owe you), "i_owe" (you owe them)

### PATCH /api/settlements/[id]
Updates settlement, typically to mark as settled.

**Request Body**:
```json
{
  "isSettled": true,
  "settledAt": "2024-02-08T15:00:00.000Z"
}
```

### DELETE /api/settlements/[id]
Deletes settlement.

## Auto-Creation from Splits

Frontend can auto-create settlements from split transactions via the "Create Settlements" button in TransactionDetail.

## Net Debts Calculation

To calculate who owes whom overall:

```javascript
const netDebts = settlements.reduce((acc, s) => {
  if (!s.isSettled) {
    const existing = acc[s.party] || 0;
    acc[s.party] = s.type === 'owed_to_me' 
      ? existing + s.amount 
      : existing - s.amount;
  }
  return acc;
}, {});
```

## Related Documentation
- [User Guide: Split Bills](../user-guide/split-bills.md)
- [Transactions API](./transactions.md)

---
