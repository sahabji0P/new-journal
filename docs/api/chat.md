# AI Chatbot API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Saathi is an AI financial assistant powered by Google Gemini 2.0 Flash. Provides personalized advice with full context of user's financial data.

## Endpoints

### GET /api/chat
Returns chat message history.

**Query Parameters**:
- `limit`: Number of messages (default: 50)

**Response**: Array of chat messages (user and assistant)

### POST /api/chat
Sends a message to the AI assistant.

**Request Body**:
```json
{
  "message": "How much did I spend on groceries this month?"
}
```

**Response**:
```json
{
  "message": {
    "id": "msg123",
    "userId": "user123",
    "role": "assistant",
    "content": "You spent $487.50 on groceries this month. This is 12% less than last month ($554).",
    "createdAt": "2024-02-08T10:30:00.000Z"
  }
}
```

### DELETE /api/chat
Clears entire chat history.

## AI Context

The assistant has access to:
- All accounts and balances
- Transaction history (last 3 months)
- Active budgets and spending
- Goals and progress
- Recent insights
- Category breakdowns

## Example Queries

- "How much did I spend on dining last month?"
- "Am I on track with my savings goal?"
- "What's my biggest expense category?"
- "Should I be worried about my spending?"
- "How much can I afford to spend this week?"
- "Compare this month to last month"

## Technical Details

**Model**: Google Gemini 2.0 Flash (`gemini-2.0-flash-exp`)
**Context Window**: ~1M tokens
**Response Time**: 1-3 seconds
**Streaming**: Not currently implemented

## Rate Limiting

Gemini API has rate limits. Excessive usage may result in temporary blocks.

## Related Documentation
- [AI Integration](../architecture/ai-integration.md)
- [User Guide: AI Features](../user-guide/ai-features.md)

---
