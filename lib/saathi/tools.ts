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
  "transactionDescription?":"string",
  "transactionAmount?": number,
  "transactionDate?":"ISO date",
  "transactionParty?":"string",
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

28) view_goals
- input: {}
- Returns all goals with progress (currentAmount vs targetAmount).

29) create_goal
- input: {
    "name": "string",
    "targetAmount": number,
    "targetDate?": "ISO date",
    "monthlyContribution?": number,
    "priority?": "low|medium|high",
    "accountId?": "string",
    "notes?": "string"
  }

30) update_goal
- input: {
    "id": "string",
    "name?": "string",
    "targetAmount?": number,
    "currentAmount?": number,
    "targetDate?": "ISO date",
    "monthlyContribution?": number,
    "priority?": "low|medium|high",
    "accountId?": "string",
    "notes?": "string"
  }

31) delete_goal
- input: { "id": "string", "confirm": true }

32) view_watchlists
- input: {}
- Returns category/tag/payee watchlists with budget limits and alert config.

33) create_watchlist
- input: {
    "name": "string",
    "type": "category|tag|payee",
    "value": "string",
    "budgetLimit?": number,
    "period?": "monthly|yearly|custom",
    "alertEnabled?": boolean,
    "alertThreshold?": number
  }
- Note: if type=category and budgetLimit provided, auto-links active monthly budget.

34) update_watchlist
- input: {
    "id": "string",
    "name?": "string",
    "budgetLimit?": number,
    "alertEnabled?": boolean,
    "alertThreshold?": number,
    "isActive?": boolean
  }

35) delete_watchlist
- input: { "id": "string", "confirm": true }

36) view_recurring
- input: {}
- Returns recurring transactions with next due dates and frequency.

37) create_recurring
- input: {
    "description": "string",
    "amount": number,
    "category": "string",
    "type": "income|expense",
    "accountId": "string",
    "frequency": "daily|weekly|biweekly|monthly|quarterly|yearly",
    "startDate": "ISO date",
    "autoCreate?": boolean,
    "reminderDays?": number,
    "notes?": "string",
    "tags?": ["string"]
  }

38) update_recurring
- input: {
    "id": "string",
    "description?": "string",
    "amount?": number,
    "frequency?": "daily|weekly|biweekly|monthly|quarterly|yearly",
    "nextDueDate?": "ISO date",
    "isActive?": boolean,
    "autoCreate?": boolean,
    "reminderDays?": number,
    "notes?": "string"
  }

39) delete_recurring
- input: { "id": "string", "confirm": true }

40) view_notifications
- input: { "unreadOnly?": boolean }
- Returns notifications ordered by timestamp desc.

41) mark_notifications_read
- input: { "ids": ["string"] }
- Mark one or more notifications as read.

42) view_settlements
- input: {}
- Returns personal settlements (i_owe / owed_to_me) with settlement status.

43) create_settlement
- input: {
    "party": "string",
    "amount": number,
    "type": "i_owe|owed_to_me",
    "reason?": "string",
    "notes?": "string"
  }

44) update_settlement
- input: {
    "id": "string",
    "party?": "string",
    "amount?": number,
    "type?": "i_owe|owed_to_me",
    "reason?": "string",
    "isSettled?": boolean
  }

45) delete_settlement
- input: { "id": "string", "confirm": true }

46) view_settlement_groups
- input: {}
- Returns settlement groups you belong to with member balances and payoff suggestions.

47) create_settlement_group
- input: { "name": "string", "description?": "string" }

48) view_settings
- input: {}
- Returns the user's app settings (currency, locale, theme preferences, etc.).

49) update_settings
- input: { [setting key]: value }
- Update one or more user settings fields.

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
- For update_transaction/delete_transaction, when id is unknown include selectors (description + amount/date/party) so backend can resolve it safely.
- For create_template, amount is optional. If the user did not provide amount, create a flexible template instead of blocking on a follow-up.
- Prefer exact IDs over names whenever both are available.
- Never call delete_* directly unless confirm=true and the user explicitly approved.
- For "delete everything"/"clear all" intents, use clear_core_data with a confirm card summary first.
- Keep destructive batches to at most one delete per reply unless user explicitly asked for multiple deletions.
`.trim()
