# Insights API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

AI-generated financial insights analyze spending patterns, budget usage, and goals. Powered by automatic analysis of user data.

## Endpoints

### GET /api/insights
Returns all insights.

**Query Parameters**:
- `unreadOnly=true`: Only unread insights
- `type`: Filter by insight type

**Response**:
```json
[
  {
    "id": "ins123",
    "userId": "user123",
    "type": "spending_pattern",
    "title": "Dining Spending Increased",
    "description": "Your dining expenses increased 25% this month compared to last month ($450 vs $360)",
    "severity": "info",
    "category": "Dining",
    "data": {
      "currentMonth": 450,
      "previousMonth": 360,
      "percentChange": 25
    },
    "isRead": false,
    "createdAt": "2024-02-08T10:00:00.000Z"
  }
]
```

### POST /api/insights/generate
Generates new insights based on current financial data.

**Response**:
```json
{
  "success": true,
  "count": 5,
  "insights": [...]
}
```

### PATCH /api/insights/mark-read
Marks insights as read.

**Request Body**:
```json
{
  "ids": ["ins1", "ins2"]
}
```

## Insight Types

- `spending_pattern`: Spending trends and changes
- `budget_alert`: Budget threshold warnings
- `goal_progress`: Goal milestone achievements
- `recommendation`: AI-generated suggestions
- `anomaly`: Unusual transaction detection

## Severity Levels

- `info`: Informational insights
- `warning`: Attention needed
- `critical`: Urgent action required
- `success`: Positive achievements

## Generation Frequency

Insights are generated:
- On-demand via POST /api/insights/generate
- Automatically when significant events occur
- Typically once per day in production

## Related Documentation
- [AI Integration](../architecture/ai-integration.md)
- [User Guide: AI Features](../user-guide/ai-features.md)

---
