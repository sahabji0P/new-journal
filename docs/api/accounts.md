# Accounts API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Financial Accounts represent bank accounts, credit cards, and savings accounts. They track balances that are automatically updated when transactions are created.

## Endpoints

### Get All Accounts

```http
GET /api/accounts
```

Returns all financial accounts for the authenticated user.

**Authentication**: Required

**Response**: `200 OK`
```json
[
  {
    "id": "cla1234",
    "userId": "user123",
    "name": "Chase Checking",
    "balance": 2500.00,
    "type": "checking",
    "color": "#0066CC",
    "icon": "wallet",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-02-08T15:30:00.000Z"
  },
  {
    "id": "cla5678",
    "userId": "user123",
    "name": "Savings Account",
    "balance": 10000.00,
    "type": "savings",
    "color": "#00AA66",
    "icon": "piggy-bank",
    "isActive": true,
    "createdAt": "2024-01-15T10:05:00.000Z",
    "updatedAt": "2024-02-08T15:30:00.000Z"
  }
]
```

---

### Create Account

```http
POST /api/accounts
```

Creates a new financial account.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "My Checking Account",
  "balance": 1000.00,
  "type": "checking",
  "color": "#0066CC",
  "icon": "wallet"
}
```

**Required Fields**:
- `name` (string): Account name
- `type` (string): One of "checking", "savings", "credit"

**Optional Fields**:
- `balance` (number): Initial balance (default: 0)
- `color` (string): Hex color code
- `icon` (string): Icon identifier

**Response**: `201 Created`
```json
{
  "id": "cla9999",
  "userId": "user123",
  "name": "My Checking Account",
  "balance": 1000.00,
  "type": "checking",
  "color": "#0066CC",
  "icon": "wallet",
  "isActive": true,
  "createdAt": "2024-02-08T16:00:00.000Z",
  "updatedAt": "2024-02-08T16:00:00.000Z"
}
```

**Errors**:
- `400`: Missing required fields
- `401`: Unauthorized

---

### Get Single Account

```http
GET /api/accounts/[id]
```

Returns a specific account by ID.

**Authentication**: Required

**Parameters**:
- `id` (path): Account ID

**Response**: `200 OK`
```json
{
  "id": "cla1234",
  "userId": "user123",
  "name": "Chase Checking",
  "balance": 2500.00,
  "type": "checking",
  "color": "#0066CC",
  "icon": "wallet",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-02-08T15:30:00.000Z"
}
```

**Errors**:
- `404`: Account not found
- `401`: Unauthorized

---

### Update Account

```http
PATCH /api/accounts/[id]
```

Updates an existing account.

**Authentication**: Required

**Parameters**:
- `id` (path): Account ID

**Request Body** (all fields optional):
```json
{
  "name": "Updated Account Name",
  "type": "savings",
  "color": "#00AA66",
  "icon": "piggy-bank",
  "isActive": true
}
```

**Note**: `balance` cannot be updated directly. Use transactions to modify balance.

**Response**: `200 OK`
```json
{
  "id": "cla1234",
  "userId": "user123",
  "name": "Updated Account Name",
  "balance": 2500.00,
  "type": "savings",
  "color": "#00AA66",
  "icon": "piggy-bank",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-02-08T16:10:00.000Z"
}
```

**Errors**:
- `400`: Invalid data
- `404`: Account not found
- `401`: Unauthorized

---

### Delete Account

```http
DELETE /api/accounts/[id]
```

Deletes an account. **Warning**: This also deletes all associated transactions.

**Authentication**: Required

**Parameters**:
- `id` (path): Account ID

**Response**: `200 OK`
```json
{
  "message": "Account deleted successfully"
}
```

**Errors**:
- `404`: Account not found
- `401`: Unauthorized

---

## Account Types

| Type | Description | Use Case |
|------|-------------|----------|
| `checking` | Day-to-day spending account | Bank checking accounts |
| `savings` | Savings account | High-yield savings, emergency funds |
| `credit` | Credit card account | Credit cards (balance typically negative) |

## Balance Management

Account balances are **automatically updated** when transactions are created, updated, or deleted:

- **Income transaction**: Increases account balance
- **Expense transaction**: Decreases account balance
- **Transaction update**: Adjusts balance by difference
- **Transaction delete**: Reverses balance change

**Example**:
```
Initial balance: $1000
Add expense (-$50) → New balance: $950
Add income (+$200) → New balance: $1150
Delete expense (+$50) → New balance: $1200
```

## Data Validation

- **name**: 1-100 characters
- **balance**: Any number (can be negative for credit cards)
- **type**: Must be "checking", "savings", or "credit"
- **color**: Valid hex color code (e.g., "#FF0000")
- **icon**: Any string (validated on frontend)

## Examples

### Create a Checking Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-token" \
  -d '{
    "name": "Wells Fargo Checking",
    "balance": 5000,
    "type": "checking",
    "color": "#D71E28",
    "icon": "wallet"
  }'
```

### Update Account Name

```bash
curl -X PATCH http://localhost:3000/api/accounts/cla1234 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-token" \
  -d '{
    "name": "Wells Fargo Business Checking"
  }'
```

### Delete Account

```bash
curl -X DELETE http://localhost:3000/api/accounts/cla1234 \
  -H "Cookie: next-auth.session-token=your-token"
```

## Related Documentation

- [Transactions API](./transactions.md) - For balance updates
- [Goals API](./goals.md) - Link goals to accounts
- [User Guide: Accounts](../user-guide/accounts.md) - For end users

---

*Next: [Transactions API](./transactions.md)*
