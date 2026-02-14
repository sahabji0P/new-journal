import { z } from "zod"

export const SaathiToolNameSchema = z.enum([
  "view_accounts",
  "create_account",
  "update_account",
  "delete_account",
  "view_categories",
  "create_category",
  "update_category",
  "delete_category",
  "view_parties",
  "create_party",
  "update_party",
  "delete_party",
  "view_templates",
  "create_template",
  "update_template",
  "delete_template",
  "view_transactions",
  "create_transaction",
  "update_transaction",
  "delete_transaction",
  "create_transaction_from_template",
  "view_budgets",
  "create_budget",
  "update_budget",
  "delete_budget",
  "view_budget_snapshot",
  "clear_core_data",
])

export const SaathiToolCallSchema = z.object({
  tool: SaathiToolNameSchema,
  rationale: z.string().optional(),
  input: z.record(z.string(), z.unknown()).default({}),
})

export const SaathiActionSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1).optional(),
  variant: z.enum(["default", "outline", "secondary"]).optional(),
  suggestedPrompt: z.string().min(1).optional(),
})

export const SaathiTextCardSchema = z.object({
  type: z.literal("text"),
  title: z.string().min(1).optional(),
  body: z.string().min(1),
})

export const SaathiStatsCardSchema = z.object({
  type: z.literal("stats"),
  title: z.string().min(1),
  stats: z.array(z.object({
    label: z.string().min(1),
    value: z.string().min(1),
    tone: z.enum(["neutral", "good", "warn"]).optional(),
  })).min(1).max(8),
})

export const SaathiListCardSchema = z.object({
  type: z.literal("list"),
  title: z.string().min(1),
  items: z.array(z.object({
    label: z.string().min(1),
    description: z.string().optional(),
  })).min(1).max(10),
})

export const SaathiEntityCardSchema = z.object({
  type: z.literal("entity"),
  entityType: z.enum(["party", "category", "template", "transaction", "budget"]),
  title: z.string().min(1),
  status: z.enum(["info", "draft", "created", "updated", "deleted", "error"]).default("info"),
  entityId: z.string().optional(),
  fields: z.array(z.object({
    label: z.string().min(1),
    value: z.string().min(1),
  })).min(1).max(12),
})

export const SaathiBudgetCardSchema = z.object({
  type: z.literal("budget"),
  budgetId: z.string().optional(),
  name: z.string().min(1),
  allocated: z.number().finite(),
  spent: z.number().finite(),
  remaining: z.number().finite(),
  usagePercent: z.number().finite(),
})

export const SaathiActionCardSchema = z.object({
  type: z.literal("action"),
  title: z.string().min(1),
  description: z.string().optional(),
  actions: z.array(SaathiActionSchema).min(1).max(4),
})

export const SaathiConfirmCardSchema = z.object({
  type: z.literal("confirm"),
  title: z.string().min(1),
  body: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  preview: z.array(z.string().min(1)).max(8).default([]),
  confirmToolRequests: z.array(SaathiToolCallSchema).min(1).max(8),
  cancelSuggestedPrompt: z.string().min(1).optional(),
  suggestChangesPrompt: z.string().min(1).optional(),
})

export const SaathiCardSchema = z.discriminatedUnion("type", [
  SaathiTextCardSchema,
  SaathiStatsCardSchema,
  SaathiListCardSchema,
  SaathiEntityCardSchema,
  SaathiBudgetCardSchema,
  SaathiActionCardSchema,
  SaathiConfirmCardSchema,
])

export const SaathiMutationResourceSchema = z.enum([
  "accounts",
  "transactions",
  "budgets",
  "categories",
  "parties",
  "templates",
])

export const SaathiMutationOperationSchema = z.enum(["create", "update", "delete"])

export const SaathiCacheScopeSchema = z.enum([
  "accounts",
  "transactions",
  "budgets",
  "budget-summary",
  "categories",
  "parties",
  "goals",
  "watchlists",
  "recurring",
  "notifications",
  "settings",
  "templates",
  "settlements",
  "receipts",
  "insights",
  "chat-history",
  "chat-context",
  "sync-core",
  "sync-advanced",
])

export const SaathiMutationSchema = z.object({
  resource: SaathiMutationResourceSchema,
  operation: SaathiMutationOperationSchema,
  entityId: z.string().optional(),
  cacheScopes: z.array(SaathiCacheScopeSchema).min(1).max(8),
})

export const SaathiStructuredResponseSchema = z.object({
  assistantText: z.string().min(1),
  cards: z.array(SaathiCardSchema).max(10).default([]),
  toolCalls: z.array(SaathiToolCallSchema).max(8).default([]),
})

export const SaathiToolExecutionSchema = z.object({
  tool: SaathiToolNameSchema,
  status: z.enum(["success", "error"]),
  summary: z.string().min(1),
})

export const SaathiAssistantMetadataSchema = z.object({
  uiVersion: z.enum(["v1", "v2"]),
  provider: z.enum(["gemini", "openrouter"]),
  cards: z.array(SaathiCardSchema).default([]),
  executedTools: z.array(SaathiToolExecutionSchema).default([]),
  mutations: z.array(SaathiMutationSchema).default([]),
})

export type SaathiCard = z.infer<typeof SaathiCardSchema>
export type SaathiToolCall = z.infer<typeof SaathiToolCallSchema>
export type SaathiToolName = z.infer<typeof SaathiToolNameSchema>
export type SaathiStructuredResponse = z.infer<typeof SaathiStructuredResponseSchema>
export type SaathiToolExecution = z.infer<typeof SaathiToolExecutionSchema>
export type SaathiAssistantMetadata = z.infer<typeof SaathiAssistantMetadataSchema>
export type SaathiMutation = z.infer<typeof SaathiMutationSchema>
