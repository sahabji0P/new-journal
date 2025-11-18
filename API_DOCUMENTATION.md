# API Documentation

This document describes the backend API routes for the Money Management Application.

## Authentication

All API routes (except `/api/auth/*`) require authentication via NextAuth.js. Include the session cookie in requests.

### Authentication Endpoints

#### `POST /api/auth/signin`
Sign in with Google OAuth

#### `POST /api/auth/signout`
Sign out the current user

---

## Financial Accounts

### `GET /api/accounts`
Get all financial accounts for the authenticated user.

**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "name": "string",
    "balance": 0,
    "type": "checking" | "savings" | "credit",
    "color": "string",
    "icon": "string",
    "isActive": true,
    "createdAt": "date",
    "updatedAt": "date"
  }
]
```

### `POST /api/accounts`
Create a new financial account.

**Request Body:**
```json
{
  "name": "string",
  "balance": 0,
  "type": "checking" | "savings" | "credit",
  "color": "string",
  "icon": "string"
}
```

### `GET /api/accounts/[id]`
Get a specific account by ID.

### `PATCH /api/accounts/[id]`
Update an account.

### `DELETE /api/accounts/[id]`
Delete an account.

---

## Transactions

### `GET /api/transactions`
Get all transactions with optional filters.

**Query Parameters:**
- `accountId` - Filter by account ID
- `category` - Filter by category
- `type` - Filter by type (income/expense)
- `startDate` - Filter by start date (ISO string)
- `endDate` - Filter by end date (ISO string)

**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "accountId": "string",
    "description": "string",
    "amount": 0,
    "date": "date",
    "category": "string",
    "type": "income" | "expense",
    "party": "string",
    "notes": "string",
    "tags": ["string"],
    "account": {
      "name": "string"
    }
  }
]
```

### `POST /api/transactions`
Create a new transaction. Automatically updates account balance and creates party if new.

**Request Body:**
```json
{
  "description": "string",
  "amount": 0,
  "date": "ISO date string",
  "category": "string",
  "type": "income" | "expense",
  "accountId": "string",
  "party": "string",
  "notes": "string",
  "tags": ["string"],
  "recurringId": "string"
}
```

### `PATCH /api/transactions/[id]`
Update a transaction. Automatically adjusts account balance.

### `DELETE /api/transactions/[id]`
Delete a transaction. Reverses the balance change.

---

## Budgets

### `GET /api/budgets`
Get all budgets with sub-budgets.

### `POST /api/budgets`
Create a new budget with sub-budgets.

**Request Body:**
```json
{
  "name": "string",
  "type": "monthly" | "event" | "trip",
  "totalAllocated": 0,
  "startDate": "ISO date string",
  "endDate": "ISO date string",
  "rollover": false,
  "subBudgets": [
    {
      "category": "string",
      "allocated": 0,
      "alertThreshold": 80
    }
  ]
}
```

---

## Categories

### `GET /api/categories`
Get all categories.

### `POST /api/categories`
Create a new category.

**Request Body:**
```json
{
  "name": "string",
  "type": "income" | "expense" | "both",
  "color": "string",
  "icon": "string"
}
```

---

## Parties

### `GET /api/parties`
Get all parties (payees/payers).

### `POST /api/parties`
Create a new party.

**Request Body:**
```json
{
  "name": "string"
}
```

---

## Goals

### `GET /api/goals`
Get all savings goals.

### `POST /api/goals`
Create a new goal.

**Request Body:**
```json
{
  "name": "string",
  "targetAmount": 0,
  "targetDate": "ISO date string",
  "monthlyContribution": 0,
  "priority": "low" | "medium" | "high",
  "color": "string",
  "icon": "string",
  "accountId": "string",
  "includeInSpendingPlan": true,
  "notes": "string"
}
```

---

## Watchlists

### `GET /api/watchlists`
Get all watchlists.

### `POST /api/watchlists`
Create a new watchlist.

**Request Body:**
```json
{
  "name": "string",
  "type": "category" | "tag" | "payee",
  "value": "string",
  "budgetLimit": 0,
  "period": "monthly" | "yearly" | "custom",
  "startDate": "ISO date string",
  "endDate": "ISO date string",
  "alertEnabled": true,
  "alertThreshold": 80,
  "color": "string"
}
```

---

## Recurring Transactions

### `GET /api/recurring`
Get all recurring transactions.

### `POST /api/recurring`
Create a new recurring transaction.

**Request Body:**
```json
{
  "description": "string",
  "amount": 0,
  "category": "string",
  "type": "income" | "expense",
  "accountId": "string",
  "frequency": "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
  "startDate": "ISO date string",
  "endDate": "ISO date string",
  "nextDueDate": "ISO date string",
  "autoCreate": false,
  "reminderDays": 3,
  "notes": "string",
  "tags": ["string"]
}
```

---

## Notifications

### `GET /api/notifications`
Get all notifications.

**Query Parameters:**
- `unreadOnly=true` - Only return unread notifications

### `POST /api/notifications`
Create a new notification.

### `PATCH /api/notifications/mark-read`
Mark notifications as read.

**Request Body:**
```json
{
  "ids": ["string"]
}
```

---

## Insights

### `GET /api/insights`
Get AI-generated insights.

**Query Parameters:**
- `unreadOnly=true` - Only return unread insights
- `type` - Filter by insight type

**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "type": "spending_pattern" | "budget_alert" | "goal_progress" | "recommendation" | "anomaly",
    "title": "string",
    "description": "string",
    "severity": "info" | "warning" | "critical" | "success",
    "category": "string",
    "data": {},
    "isRead": false,
    "createdAt": "date"
  }
]
```

### `POST /api/insights/generate`
Generate new insights based on user's financial data.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "insights": [...]
}
```

### `PATCH /api/insights/mark-read`
Mark insights as read.

---

## AI Chatbot

### `GET /api/chat`
Get chat history.

**Query Parameters:**
- `limit` - Number of messages to return (default: 50)

### `POST /api/chat`
Send a message to the AI chatbot.

**Request Body:**
```json
{
  "message": "string"
}
```

**Response:**
```json
{
  "message": {
    "id": "string",
    "userId": "string",
    "role": "assistant",
    "content": "string",
    "createdAt": "date"
  }
}
```

The chatbot has access to:
- All user accounts and balances
- Transaction history (last 3 months)
- Active budgets and spending
- Goals and progress
- Recent insights
- Category breakdowns
- Recent transactions

### `DELETE /api/chat`
Clear entire chat history.

---

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models:

- **User** - User accounts (Google OAuth)
- **FinancialAccount** - Bank accounts, credit cards
- **Transaction** - Income and expense transactions
- **Category** - Transaction categories
- **Party** - Payees and payers
- **Budget** - Monthly/event budgets with sub-budgets
- **Goal** - Savings goals
- **Watchlist** - Custom spending tracking
- **RecurringTransaction** - Recurring bills and income
- **Notification** - User notifications
- **Insight** - AI-generated insights
- **ChatMessage** - Chatbot conversation history

All models include proper relations and indexes for performance.

---

## Environment Variables

Required environment variables (see `.env.example`):

```
DATABASE_URL - PostgreSQL connection string (Neon)
NEXTAUTH_SECRET - NextAuth secret key
NEXTAUTH_URL - Application URL
GOOGLE_CLIENT_ID - Google OAuth client ID
GOOGLE_CLIENT_SECRET - Google OAuth client secret
GEMINI_API_KEY - Google Gemini API key
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error
