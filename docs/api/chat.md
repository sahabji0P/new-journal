# AI Chatbot API

> **Audience**: Developers
> **Last Updated**: March 28, 2026

## Overview

Saathi is CORE's assistant layer with:
- provider switching (`Gemini` or `OpenRouter`) via environment variables
- structured JSON outputs validated server-side
- interactive UI cards returned through message metadata
- tool-driven CRUD operations for accounts, categories, parties, templates, transactions, and budgets
- safe delete flow via explicit confirmation cards
- write-action guardrails: model-generated create/update/delete calls are staged and require explicit user confirmation

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
      "uiVersion": "v2",
      "provider": "gemini",
      "cards": [],
      "executedTools": [],
      "mutations": []
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
- mutation summaries in `metadata.mutations` for targeted client refreshes

Execution guardrails:
- read-only tool calls (`view_*`) may run automatically
- model-generated write tool calls are converted into pending draft/confirm cards
- write execution happens only after explicit user action (card action or confirmation reply)

## Tool Capabilities

Saathi currently supports these action families:

**Core financial domains (Milestone 1)**
- accounts: view/create/update/delete
- categories: view/create/update/delete
- parties: view/create/update/delete
- templates: view/create/update/delete
- transactions: view/create/update/delete
- transaction creation from template
- budgets: view/create/update/delete
- budget snapshot read
- core data bulk clear (`clear_core_data`)

**Extended domains (Milestone 2)**
- goals: view/create/update/delete
- watchlists: view/create/update/delete
- recurring transactions: view/create/update/delete
- notifications: view / mark read
- settlements (personal): view/create/update/delete
- settlement groups: view / create
- settings: view / update

Delete safety:
- destructive tool calls must include `confirm: true`
- model should first return a `confirm` card and execute only after user confirmation

## Mutation Tracking

After any write operation, `metadata.mutations` lists affected resources and cache scopes:
```json
{
  "mutations": [
    {
      "resource": "transactions",
      "operation": "create",
      "entityId": "txn_abc123",
      "cacheScopes": ["transactions", "budget-summary", "chat-context", "sync-core"]
    }
  ]
}
```

The client (`AppContext`) listens for the `saathi:mutations` window event emitted by `SaathiWorkspace` and performs targeted refetches of the affected state slices, avoiding a full page reload.

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
