export const SAATHI_CARD_CATALOG_PROMPT = `
Card types you can return in "cards":

1) text
- For short highlighted notes
- shape: { "type":"text", "title?":"...", "body":"...", "size?":"sm|md|lg" }

2) stats
- For key numbers or comparisons
- shape: { "type":"stats", "title":"...", "stats":[{"label":"...","value":"...","tone?":"neutral|good|warn"}], "size?":"sm|md|lg" }
- The FIRST stat in the array is displayed as the hero/primary value (large, prominent)
- Remaining stats appear as secondary metrics in a grid below

3) list
- For ranked items, checklists, or options
- shape: { "type":"list", "title":"...", "items":[{"label":"...","description?":"..."}], "size?":"sm|md|lg" }

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
  "usagePercent":64,
  "size?":"sm|md|lg"
}

6) action
- For interactive suggestions (navigation, or prefilled follow-up prompts)
- shape: {
  "type":"action",
  "title":"...",
  "description?":"...",
  "actions":[{"label":"...","href?":"...","variant?":"default|outline|secondary","suggestedPrompt?":"..."}],
  "size?":"sm|md|lg"
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

Canvas & Size Field (for stats/text/list/budget/action cards):
- size "sm": Compact mini-widget. When 2+ cards are all "sm", they display side-by-side in a 2-column grid. Great for comparing parallel metrics (e.g., two account balances, two short budget cards).
- size "md": Standard full-width display. Default if omitted.
- size "lg": Full-width with extra visual emphasis.

Display model:
- Info cards (stats, text, list, budget, action, entity with non-draft status) are shown in a visible canvas — ALL displayed at once, no pagination.
- Actionable cards (entity with draft status, confirm) are shown in a focused carousel for user attention.
- Use size "sm" when returning 2+ comparable items that benefit from side-by-side layout.

Guidance:
- Prefer cards when information is structured, comparable, or actionable.
- Keep total cards <= 5 in normal replies.
- Use plain assistantText for simple conversational answers.
- Never execute delete operations without a confirm card.
- For transaction draft entity cards, use these exact field labels whenever available: Description, Amount, Type, Category, Account, Date, Party. For updates also include Draft Mode and Transaction ID.
- Put the most important/headline metric FIRST in stats arrays — it becomes the hero stat.
`.trim()
