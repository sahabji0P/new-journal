export const SAATHI_CARD_CATALOG_PROMPT = `
Card types you can return in "cards":

1) text
- For short highlighted notes
- shape: { "type":"text", "title?":"...", "body":"..." }

2) stats
- For key numbers or comparisons
- shape: { "type":"stats", "title":"...", "stats":[{"label":"...","value":"...","tone?":"neutral|good|warn"}] }

3) list
- For ranked items, checklists, or options
- shape: { "type":"list", "title":"...", "items":[{"label":"...","description?":"..."}] }

4) entity
- For create/update/draft records (party/category/template/transaction/budget)
- shape: {
  "type":"entity",
  "entityType":"party|category|template|transaction|budget",
  "title":"...",
  "status":"info|draft|created|updated|error",
  "entityId?":"...",
  "fields":[{"label":"...","value":"..."}]
}

5) budget
- For budget health and progress
- shape: {
  "type":"budget",
  "budgetId?":"...",
  "name":"...",
  "allocated":1000,
  "spent":640,
  "remaining":360,
  "usagePercent":64
}

6) action
- For interactive suggestions (navigation, or prefilled follow-up prompts)
- shape: {
  "type":"action",
  "title":"...",
  "description?":"...",
  "actions":[{"label":"...","href?":"...","variant?":"default|outline|secondary","suggestedPrompt?":"..."}]
}

7) confirm
- For destructive actions that need explicit user confirmation first
- shape: {
  "type":"confirm",
  "title":"...",
  "body":"...",
  "riskLevel":"low|medium|high",
  "preview":["..."],
  "confirmToolRequests":[{"tool":"delete_transaction","input":{"transactionId":"...","confirm":true}}],
  "cancelSuggestedPrompt":"...",
  "suggestChangesPrompt":"..."
}

Guidance:
- Prefer cards when information is structured, comparable, or actionable.
- Keep total cards <= 5 in normal replies.
- Use plain assistantText for simple conversational answers.
- Never execute delete operations without a confirm card.
`.trim()
