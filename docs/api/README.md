# API Documentation

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Money Tracker provides a comprehensive REST API for managing personal finances. All endpoints follow RESTful principles with consistent request/response patterns.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

All API routes (except `/api/auth/*`) require authentication via NextAuth.js session cookies. Users must sign in with Google OAuth before making API requests.

See [Authentication Documentation](./authentication.md) for details.

## Request Format

- **Content-Type**: `application/json`
- **Method**: Standard HTTP methods (GET, POST, PATCH, DELETE)
- **Authentication**: Session cookie (automatic in browser)

## Response Format

All successful responses return JSON with the relevant data:

```json
{
  "id": "cuid123",
  "name": "Example",
  ...
}
```

Arrays of resources:

```json
[
  { "id": "1", ... },
  { "id": "2", ... }
]
```

## API Resources

### Financial Management
- [Accounts](./accounts.md) - Financial accounts CRUD
- [Transactions](./transactions.md) - Income/expense tracking
- [Categories](./categories.md) - Transaction categorization
- [Parties](./parties.md) - Payees and payers
- [Budgets](./budgets.md) - Budget management

### Planning & Goals
- [Goals](./goals.md) - Savings goals tracking
- [Watchlists](./watchlists.md) - Custom spending alerts
- [Recurring Transactions](./recurring.md) - Recurring bills/income

### Features
- [Templates](./templates.md) - Transaction templates
- [Settlements](./settlements.md) - Split expense settlements
- [Receipts](./receipts.md) - Receipt management
- [Notifications](./notifications.md) - User notifications

### AI Features
- [Insights](./insights.md) - AI-generated financial insights
- [Chat](./chat.md) - AI assistant (Saathi)

### Reference
- [Error Handling](./error-handling.md) - Error codes and responses

## Common Patterns

### Filtering

Many `GET` endpoints support query parameters for filtering:

```
GET /api/transactions?type=expense&category=Food&startDate=2024-01-01
```

### Pagination

Currently not implemented. All endpoints return complete datasets. Future versions will include pagination for large result sets.

### Sorting

Results are typically sorted by creation date (newest first) or relevance to the query.

## Rate Limiting

Currently no rate limiting is enforced. This may be added in future versions.

## API Versioning

The API is currently unversioned. Breaking changes will be communicated through release notes.

## Common HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

See [Error Handling](./error-handling.md) for detailed error responses.

## Testing the API

### Using the Frontend

The easiest way to test the API is through the frontend application after signing in with Google.

### Using API Clients (Postman/Insomnia)

1. Sign in through the frontend to establish a session
2. Copy the session cookie from browser DevTools
3. Include the cookie in your API client requests
4. Make requests to any `/api/*` endpoint

### Using cURL

```bash
# Example: Get all accounts
curl -X GET http://localhost:3000/api/accounts \
  -H "Cookie: next-auth.session-token=your-session-token"
```

## Next Steps

- Browse individual resource documentation
- Review [Architecture](../architecture/README.md) for system design
- Check [Development Guide](../development/local-development.md) for local setup

---

*For authentication details, see [Authentication Documentation](./authentication.md)*
*For error handling, see [Error Handling](./error-handling.md)*
