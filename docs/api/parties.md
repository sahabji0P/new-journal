# Parties API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Parties represent payees (who you pay) and payers (who pays you). Automatically created when transactions reference new party names.

## Endpoints

### GET /api/parties
Returns all parties for the authenticated user.

### POST /api/parties
Creates a new party.

**Request Body**:
```json
{
  "name": "Amazon"
}
```

### PATCH /api/parties/[id]
Updates party name.

### DELETE /api/parties/[id]
Deletes party. Existing transactions keep party name as string.

## Auto-Creation

Parties are automatically created when you create a transaction with a new party name:

```json
POST /api/transactions
{
  "party": "New Store Name",
  ...
}
```

If "New Store Name" doesn't exist, it's automatically created.

## Related Documentation
- [Transactions API](./transactions.md)
- [User Guide: Managing Parties](../user-guide/transactions.md#parties)

---
