# AI Chatbot API

> **Audience**: Developers  
> **Last Updated**: February 13, 2026

## Overview

Saathi is CORE's assistant layer with:
- provider switching (`Gemini` or `OpenRouter`) via environment variables
- structured JSON outputs validated server-side
- interactive UI cards returned through message metadata
- tool-driven operations for categories, parties, templates, transactions, and budgets

## Endpoints

### GET `/api/chat`
Returns chat history.

Query parameters:
- `limit` (optional, default `50`, max `100`)

### POST `/api/chat`
Sends a user message to Saathi.

Request body:
```json
{
  "message": "Create an expense transaction for Starbucks $8.50 today",
  "recentConversation": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "attachments": {
    "images": [
      {
        "name": "receipt.jpg",
        "mimeType": "image/jpeg",
        "dataUrl": "data:image/jpeg;base64,..."
      }
    ],
    "audio": []
  }
}
```

Response:
```json
{
  "message": {
    "id": "msg_123",
    "userId": "user_123",
    "role": "assistant",
    "content": "Created the transaction and summarized your budget impact.",
    "metadata": {
      "uiVersion": "v1",
      "provider": "gemini",
      "cards": [],
      "executedTools": []
    },
    "createdAt": "2026-02-13T12:34:56.000Z"
  },
  "userMessage": {
    "id": "msg_122",
    "role": "user",
    "content": "Create an expense transaction for Starbucks $8.50 today"
  }
}
```

### DELETE `/api/chat`
Clears all chat messages for the authenticated user.

## Structured Assistant Contract

The model is required to produce JSON:
```json
{
  "assistantText": "string",
  "cards": [],
  "toolCalls": []
}
```

Server validates and may execute tool calls, then persists:
- final assistant text in `content`
- interactive cards + execution info in `metadata`

## Tool Capabilities

Saathi currently supports these action families:
- create party/category
- create/update template
- create/update transaction
- create transaction from template
- create/update budget
- view budget snapshot

## Provider Configuration

Environment variables:
- `SAATHI_LLM_PROVIDER` = `gemini` or `openrouter`
- `GEMINI_API_KEY`
- `SAATHI_GEMINI_MODEL`
- `OPENROUTER_API_KEY`
- `SAATHI_OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_APP_NAME`

## Prompt Modules

Saathi prompt composition is separated into:
- personality (`/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/personality.ts`)
- card catalog (`/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/cards.ts`)
- tool catalog (`/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/tools.ts`)
- core product knowledge document (`/Users/shashwatjain/Desktop/coding_stuff/new-journal/docs/saathi/CORE_KNOWLEDGE.md`)
