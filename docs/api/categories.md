# Categories API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Categories organize transactions into groups (e.g., Groceries, Dining, Salary). Support income, expense, or both types.

## Endpoints

### GET /api/categories
Returns all categories for the user.

### POST /api/categories
Creates a new category.

**Request Body**:
```json
{
  "name": "Entertainment",
  "type": "expense",
  "color": "#FF5733",
  "icon": "film"
}
```

**Required Fields**: `name`, `type`
**Type values**: "income", "expense", "both"

### PATCH /api/categories/[id]
Updates category details.

### DELETE /api/categories/[id]
Deletes category. Existing transactions keep category name as string.

## Related Documentation
- [Transactions API](./transactions.md)
- [Budgets API](./budgets.md)
- [User Guide: Categories](../user-guide/transactions.md#categories)

---
