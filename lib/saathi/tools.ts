export const SAATHI_TOOL_CATALOG_PROMPT = `
Tools you can call in "toolCalls" when the user asks to create/update/manage data:

1) view_accounts
- input: { "limit?": number }

2) create_account
- input: { "name":"string", "type":"checking|savings|credit", "balance?": number, "color?":"string", "icon?":"string" }

3) update_account
- input: { "accountId?":"string", "accountName?":"string", "updates": { "name?":"string", "type?":"checking|savings|credit", "balance?": number, "color?":"string", "icon?":"string", "isActive?": boolean } }

4) delete_account
- input: { "accountId?":"string", "accountName?":"string", "confirm": true }

5) view_categories
- input: { "type?":"income|expense|both", "limit?": number }

6) create_party
- input: { "name": "string" }

7) update_party
- input: { "partyId?":"string", "partyName?":"string", "updates":{"name":"string"} }

8) delete_party
- input: { "partyId?":"string", "partyName?":"string", "confirm": true }

9) view_parties
- input: { "limit?": number }

10) create_category
- input: { "name": "string", "type?": "income|expense|both" }

11) update_category
- input: { "categoryId?":"string", "categoryName?":"string", "updates": { "name?":"string", "type?":"income|expense|both", "color?":"string", "icon?":"string" } }

12) delete_category
- input: { "categoryId?":"string", "categoryName?":"string", "confirm": true }

13) view_templates
- input: { "includeInactive?": boolean, "limit?": number }

14) create_template
- input: {
  "name":"string",
  "type":"income|expense",
  "category":"string",
  "amount?": number,
  "description?":"string",
  "accountId?":"string",
  "party?":"string",
  "tags?":["string"],
  "notes?":"string"
}

15) update_template
- input: {
  "templateId?":"string",
  "templateName?":"string",
  "updates": {
    "name?":"string",
    "type?":"income|expense",
    "category?":"string",
    "amount?": number,
    "description?":"string",
    "accountId?":"string",
    "party?":"string",
    "tags?":["string"],
    "notes?":"string",
    "isActive?": boolean
  }
}

16) delete_template
- input: { "templateId?":"string", "templateName?":"string", "confirm": true }

17) view_transactions
- input: {
  "limit?": number,
  "accountId?":"string",
  "category?":"string",
  "type?":"income|expense",
  "startDate?":"ISO date",
  "endDate?":"ISO date"
}

18) create_transaction
- input: {
  "description":"string",
  "amount": number,
  "type":"income|expense",
  "category":"string",
  "accountId?":"string",
  "accountName?":"string",
  "date?":"ISO date",
  "party?":"string",
  "notes?":"string",
  "tags?":["string"]
}

19) update_transaction
- input: {
  "transactionId?":"string",
  "description?":"string",
  "amount?": number,
  "date?":"ISO date",
  "type?":"income|expense",
  "category?":"string",
  "accountId?":"string",
  "party?":"string",
  "notes?":"string",
  "tags?":["string"],
  "updates?": {
    "description?":"string",
    "amount?": number,
    "type?":"income|expense",
    "category?":"string",
    "accountId?":"string",
    "date?":"ISO date",
    "party?":"string",
    "notes?":"string",
    "tags?":["string"]
  }
}

20) delete_transaction
- input: { "transactionId?":"string", "description?":"string", "confirm": true }

21) create_transaction_from_template
- input: {
  "templateId?":"string",
  "templateName?":"string",
  "overrides?": {
    "description?":"string",
    "amount?": number,
    "category?":"string",
    "type?":"income|expense",
    "accountId?":"string",
    "date?":"ISO date",
    "party?":"string",
    "notes?":"string",
    "tags?":["string"]
  }
}

22) view_budgets
- input: { "includeInactive?": boolean, "limit?": number }

23) create_budget
- input: {
  "name":"string",
  "type?":"monthly|event|trip",
  "totalAllocated": number,
  "method?":"envelope|fixed_cap|goal_linked",
  "periodType?":"monthly|custom|rolling",
  "startDate?":"ISO date",
  "endDate?":"ISO date",
  "subBudgets?":[{"categoryId?":"string","category?":"string","allocated":number,"alertThreshold?":number}]
}

24) update_budget
- input: {
  "budgetId?":"string",
  "budgetName?":"string",
  "updates": {
    "name?":"string",
    "type?":"monthly|event|trip",
    "totalAllocated?": number,
    "method?":"envelope|fixed_cap|goal_linked",
    "periodType?":"monthly|custom|rolling",
    "startDate?":"ISO date",
    "endDate?":"ISO date",
    "warningThreshold?": number,
    "criticalThreshold?": number,
    "rollover?": boolean,
    "isActive?": boolean
  }
}

25) delete_budget
- input: { "budgetId?":"string", "budgetName?":"string", "confirm": true }

26) view_budget_snapshot
- input: { "includeInactive?": boolean }

27) clear_core_data
- input: { "confirm": true, "include?": ["accounts","transactions","categories","parties","templates","budgets"] }
- Purpose: clear core financial workspace data in one operation after explicit confirmation.

Backward compatibility aliases are supported:
- old names like create_party/create_category/create_template/update_template/create_transaction/update_transaction/create_transaction_from_template/create_budget/update_budget/view_budget_snapshot still work.

When using old update_transaction shape, server accepts:
- input: {
  "transactionId":"string",
  "updates": {
    "description?":"string",
    "amount?": number,
    "type?":"income|expense",
    "category?":"string",
    "accountId?":"string",
    "date?":"ISO date",
    "party?":"string",
    "notes?":"string",
    "tags?":["string"]
  }
}

Tool rules:
- Only call tools when the user intent clearly asks for operation/data manipulation.
- For read-only analysis questions, do not call a tool.
- If the user explicitly lists multiple creates/updates, include one tool call per requested item (up to 8).
- Keep toolCalls <= 8.
- If critical identifiers are unknown, ask a clarification instead of guessing.
- For create_template, amount is optional. If the user did not provide amount, create a flexible template instead of blocking on a follow-up.
- Prefer exact IDs over names whenever both are available.
- Never call delete_* directly unless confirm=true and the user explicitly approved.
- For "delete everything"/"clear all" intents, use clear_core_data with a confirm card summary first.
- Keep destructive batches to at most one delete per reply unless user explicitly asked for multiple deletions.
`.trim()
