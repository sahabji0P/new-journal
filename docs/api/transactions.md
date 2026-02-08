# Transactions API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Transactions represent income and expenses. They automatically update account balances and can be linked to recurring transactions, budgets, and receipts.

## Endpoints

### Get All Transactions

```http
GET /api/transactions
```

Returns all transactions for the authenticated user with optional filtering.

**Authentication**: Required

**Query Parameters**:
- `accountId` (string): Filter by account ID
- `category` (string): Filter by category
- `type` (string): Filter by "income" or "expense"
- `startDate` (string): ISO date, filter transactions after this date
- `endDate` (string): ISO date, filter transactions before this date

**Response**: `200 OK`
```json
[
  {
    "id": "txn123",
    "userId": "user123",
    "accountId": "acc456",
    "description": "Grocery shopping",
    "amount": 127.50,
    "date": "2024-02-08T00:00:00.000Z",
    "category": "Groceries",
    "type": "expense",
    "party": "Walmart",
    "notes": "Weekly groceries",
    "tags": ["food", "essentials"],
    "recurringId": null,
    "createdAt": "2024-02-08T10:30:00.000Z",
    "updatedAt": "2024-02-08T10:30:00.000Z",
    "account": {
      "name": "Chase Checking"
    }
  }
]
```

**Example with filters**:
```
GET /api/transactions?type=expense&category=Food&startDate=2024-02-01&endDate=2024-02-28
```

---

### Create Transaction

```http
POST /api/transactions
```

Creates a new transaction and automatically updates the account balance.

**Authentication**: Required

**Request Body**:
```json
{
  "description": "Coffee at Starbucks",
  "amount": 5.75,
  "date": "2024-02-08T14:30:00.000Z",
  "category": "Dining",
  "type": "expense",
  "accountId": "acc456",
  "party": "Starbucks",
  "notes": "Morning coffee",
  "tags": ["coffee", "dining"],
  "recurringId": null
}
```

**Required Fields**:
- `description` (string): Transaction description
- `amount` (number): Transaction amount (positive number)
- `date` (string): ISO date string
- `category` (string): Category name
- `type` (string): "income" or "expense"
- `accountId` (string): Account ID

**Optional Fields**:
- `party` (string): Payee or payer name (auto-creates if new)
- `notes` (string): Additional notes
- `tags` (array): Array of tag strings
- `recurringId` (string): Link to recurring transaction

**Response**: `201 Created`
```json
{
  "id": "txn789",
  "userId": "user123",
  "accountId": "acc456",
  "description": "Coffee at Starbucks",
  "amount": 5.75,
  "date": "2024-02-08T14:30:00.000Z",
  "category": "Dining",
  "type": "expense",
  "party": "Starbucks",
  "notes": "Morning coffee",
  "tags": ["coffee", "dining"],
  "recurringId": null,
  "createdAt": "2024-02-08T14:30:00.000Z",
  "updatedAt": "2024-02-08T14:30:00.000Z"
}
```

**Side Effects**:
- Account balance updated automatically
- New party created if doesn't exist
- Budget spending updated
- Watchlist alerts triggered if thresholds exceeded

**Errors**:
- `400`: Missing required fields or invalid data
- `401`: Unauthorized
- `404`: Account not found

---

### Get Single Transaction

```http
GET /api/transactions/[id]
```

Returns a specific transaction by ID.

**Authentication**: Required

**Parameters**:
- `id` (path): Transaction ID

**Response**: `200 OK`
```json
{
  "id": "txn123",
  "userId": "user123",
  "accountId": "acc456",
  "description": "Grocery shopping",
  "amount": 127.50,
  "date": "2024-02-08T00:00:00.000Z",
  "category": "Groceries",
  "type": "expense",
  "party": "Walmart",
  "notes": "Weekly groceries",
  "tags": ["food", "essentials"],
  "recurringId": null,
  "createdAt": "2024-02-08T10:30:00.000Z",
  "updatedAt": "2024-02-08T10:30:00.000Z",
  "account": {
    "id": "acc456",
    "name": "Chase Checking"
  }
}
```

---

### Update Transaction

```http
PATCH /api/transactions/[id]
```

Updates an existing transaction. Automatically adjusts account balance.

**Authentication**: Required

**Parameters**:
- `id` (path): Transaction ID

**Request Body** (all fields optional):
```json
{
  "description": "Updated description",
  "amount": 150.00,
  "date": "2024-02-09T00:00:00.000Z",
  "category": "Shopping",
  "type": "expense",
  "accountId": "acc789",
  "party": "Target",
  "notes": "Updated notes",
  "tags": ["shopping", "household"]
}
```

**Response**: `200 OK`
```json
{
  "id": "txn123",
  "userId": "user123",
  "accountId": "acc789",
  "description": "Updated description",
  "amount": 150.00,
  ...
}
```

**Side Effects**:
- Old account balance adjusted (reverses old amount)
- New account balance updated (applies new amount)
- If account changed, both accounts updated
- Budget spending recalculated
- Watchlist alerts re-evaluated

---

### Delete Transaction

```http
DELETE /api/transactions/[id]
```

Deletes a transaction and reverses its balance effect.

**Authentication**: Required

**Parameters**:
- `id` (path): Transaction ID

**Response**: `200 OK`
```json
{
  "message": "Transaction deleted successfully"
}
```

**Side Effects**:
- Account balance adjusted (reverses transaction)
- Budget spending updated
- Watchlist calculations updated

---

## Transaction Types

| Type | Description | Effect on Balance |
|------|-------------|-------------------|
| `income` | Money received | Increases balance |
| `expense` | Money spent | Decreases balance |

## Automatic Features

### Auto-Party Creation

When creating a transaction with a new party name, the party is automatically created:

```json
{
  "party": "New Coffee Shop"
}
```

If "New Coffee Shop" doesn't exist, it's created automatically.

### Balance Updates

Transaction operations automatically update account balances:

```javascript
// Create expense
POST /api/transactions { amount: 50, type: "expense" }
→ Account balance decreases by $50

// Create income
POST /api/transactions { amount: 100, type: "income" }
→ Account balance increases by $100

// Update transaction amount from $50 to $75
PATCH /api/transactions/[id] { amount: 75 }
→ Balance adjusted by difference ($25)

// Delete transaction
DELETE /api/transactions/[id]
→ Balance change reversed
```

### Budget Integration

Expense transactions automatically update budget spending:
- Matches transaction category to budget sub-categories
- Updates `spent` amount in real-time
- Triggers alerts when thresholds exceeded

### Watchlist Integration

Transactions trigger watchlist evaluations:
- Category-based watchlists
- Tag-based watchlists
- Party-based watchlists
- Sends notifications when limits exceeded

## Data Validation

- **description**: 1-500 characters
- **amount**: Must be positive number
- **date**: Valid ISO 8601 date
- **type**: Must be "income" or "expense"
- **category**: 1-100 characters
- **party**: Optional, 1-100 characters
- **tags**: Array of strings, each 1-50 characters
- **notes**: Optional, up to 5000 characters

## Filtering Examples

### Get all expenses in February 2024

```bash
GET /api/transactions?type=expense&startDate=2024-02-01&endDate=2024-02-29
```

### Get all grocery transactions

```bash
GET /api/transactions?category=Groceries
```

### Get all transactions from specific account

```bash
GET /api/transactions?accountId=acc456
```

### Combined filters

```bash
GET /api/transactions?type=expense&category=Dining&startDate=2024-02-01
```

## cURL Examples

### Create Income Transaction

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-token" \
  -d '{
    "description": "Salary",
    "amount": 3000,
    "date": "2024-02-01T00:00:00.000Z",
    "category": "Salary",
    "type": "income",
    "accountId": "acc456",
    "party": "Acme Corp"
  }'
```

### Update Transaction

```bash
curl -X PATCH http://localhost:3000/api/transactions/txn123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-token" \
  -d '{
    "amount": 3500
  }'
```

### Delete Transaction

```bash
curl -X DELETE http://localhost:3000/api/transactions/txn123 \
  -H "Cookie: next-auth.session-token=your-token"
```

## Related Documentation

- [Accounts API](./accounts.md) - For balance management
- [Budgets API](./budgets.md) - Budget integration
- [Recurring API](./recurring.md) - Recurring transactions
- [Receipts API](./receipts.md) - Attach receipts
- [User Guide: Transactions](../user-guide/transactions.md) - For end users

---

*Next: [Budgets API](./budgets.md)*
