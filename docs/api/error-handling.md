# Error Handling

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Error Response Format

All API errors return a consistent JSON format:

```json
{
  "error": "Error message describing what went wrong"
}
```

## HTTP Status Codes

### Success Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |

### Client Error Codes

| Code | Name | Description |
|------|------|-------------|
| 400 | Bad Request | Invalid request data or parameters |
| 401 | Unauthorized | Authentication required or session expired |
| 403 | Forbidden | Authenticated but access denied |
| 404 | Not Found | Resource does not exist |

### Server Error Codes

| Code | Name | Description |
|------|------|-------------|
| 500 | Internal Server Error | Unexpected server error |

## Common Error Scenarios

### 400 Bad Request

**Causes**:
- Missing required fields
- Invalid data types
- Validation failures
- Malformed JSON

**Example**:
```json
{
  "error": "Missing required field: amount"
}
```

**Resolution**:
- Verify all required fields are included
- Check data types match schema
- Ensure JSON is properly formatted

### 401 Unauthorized

**Causes**:
- No session cookie present
- Session expired
- Invalid session token

**Example**:
```json
{
  "error": "Unauthorized"
}
```

**Resolution**:
- Sign in through the frontend
- Check session cookie is being sent
- Refresh the page to get new session

### 403 Forbidden

**Causes**:
- Attempting to access another user's resource
- Insufficient permissions

**Example**:
```json
{
  "error": "Access denied"
}
```

**Resolution**:
- Verify you own the resource
- Check user permissions

### 404 Not Found

**Causes**:
- Resource ID doesn't exist
- Resource was deleted
- Incorrect endpoint URL

**Example**:
```json
{
  "error": "Account not found"
}
```

**Resolution**:
- Verify resource ID is correct
- Check if resource was deleted
- Confirm endpoint URL is correct

### 500 Internal Server Error

**Causes**:
- Database connection failure
- Unexpected runtime error
- External service failure (e.g., Gemini API)

**Example**:
```json
{
  "error": "Internal server error"
}
```

**Resolution**:
- Check server logs for details
- Verify database connection
- Retry the request
- Contact support if persists

## Error Handling Best Practices

### Client-Side

```typescript
try {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  // Handle success
} catch (error) {
  // Handle error
  console.error('API Error:', error.message);
  toast.error(error.message);
}
```

### Server-Side

```typescript
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Validate input
    if (!body.name) {
      return Response.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Process request
    const result = await prisma.account.create({
      data: { ...body, userId: user.id },
    });

    return Response.json(result, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Validation Errors

Validation errors return specific messages about what failed:

```json
{
  "error": "Invalid amount: must be greater than 0"
}
```

```json
{
  "error": "Invalid date format: use ISO 8601 (YYYY-MM-DD)"
}
```

```json
{
  "error": "Category 'XYZ' does not exist"
}
```

## Rate Limiting (Future)

Rate limiting is not currently implemented but will return:

```json
{
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

**Status Code**: 429 Too Many Requests

## Debugging Tips

### Check Browser Console

Look for:
- Network request details
- Response status codes
- Error messages
- Stack traces (development mode)

### Check Server Logs

```bash
npm run dev
```

Server logs show:
- Incoming requests
- Database queries
- Error stack traces
- Performance metrics

### Use API Clients

Test endpoints with Postman/Insomnia to isolate frontend issues.

## Related Documentation

- [API Overview](./README.md)
- [Authentication](./authentication.md)
- [Troubleshooting Guide](../troubleshooting/common-issues.md)

---

*For common issues, see [Troubleshooting](../troubleshooting/common-issues.md)*
