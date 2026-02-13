export const SAATHI_TOOL_CATALOG_PROMPT = `
Tools you can call in "toolCalls" when the user asks to create/update/manage data:

1) create_party
- input: { "name": "string" }

2) create_category
- input: { "name": "string", "type?": "income|expense|both" }

3) create_template
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

4) update_template
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

5) create_transaction
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

6) update_transaction
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

7) create_transaction_from_template
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

8) create_budget
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

9) update_budget
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

10) view_budget_snapshot
- input: { "includeInactive?": boolean }

Tool rules:
- Only call tools when the user intent clearly asks for operation/data manipulation.
- For read-only analysis questions, do not call a tool.
- Keep toolCalls <= 2 unless user asks for a bulk workflow.
- If critical identifiers are unknown, ask a clarification instead of guessing.
`.trim()
