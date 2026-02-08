# Transaction Templates API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Templates save common transaction patterns for quick reuse (e.g., "Monthly Rent", "Gym Membership").

## Endpoints

### GET /api/templates
Returns all templates.

### POST /api/templates
Creates a new template.

**Request Body**:
```json
{
  "name": "Monthly Rent",
  "description": "Apartment rent payment",
  "amount": 1500,
  "type": "expense",
  "category": "Housing",
  "accountId": "acc456",
  "party": "Landlord",
  "tags": ["rent", "housing"],
  "notes": "Due 1st of month"
}
```

**Required**: `name`, `type`, `category`
**Optional**: All other transaction fields

### PATCH /api/templates/[id]
Updates template.

### DELETE /api/templates/[id]
Deletes template.

## Using Templates

Templates are applied via the frontend. The API just stores template definitions.

Frontend workflow:
1. User selects template
2. Template populates transaction form
3. User reviews and modifies if needed
4. Creates transaction via POST /api/transactions

## Related Documentation
- [Transactions API](./transactions.md)
- [User Guide: Templates](../user-guide/templates.md)

---
