# Notifications API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Notifications alert users about important events (budget alerts, bill reminders, goal milestones).

## Endpoints

### GET /api/notifications
Returns all notifications.

**Query Parameters**:
- `unreadOnly=true`: Only return unread notifications

### POST /api/notifications
Creates a new notification (typically system-generated).

**Request Body**:
```json
{
  "type": "budget",
  "title": "Budget Alert",
  "message": "You've reached 90% of your Groceries budget",
  "actionLink": "/budget"
}
```

**Types**: "budget", "bill", "goal", "recurring", "info", "warning"

### PATCH /api/notifications/mark-read
Marks notifications as read.

**Request Body**:
```json
{
  "ids": ["notif1", "notif2"]
}
```

### DELETE /api/notifications/[id]
Deletes notification.

## Automatic Notifications

System automatically creates notifications for:
- Budget threshold exceeded (80%)
- Bill reminders (3 days before)
- Goal milestones (25%, 50%, 75%, 100%)
- Recurring transaction due
- Watchlist alerts

## Related Documentation
- [User Guide: Notifications](../user-guide/README.md#notifications)

---
