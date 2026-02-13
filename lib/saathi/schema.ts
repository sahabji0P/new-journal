import { z } from "zod"

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
  status: z.enum(["info", "draft", "created", "updated", "error"]).default("info"),
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

export const SaathiCardSchema = z.discriminatedUnion("type", [
  SaathiTextCardSchema,
  SaathiStatsCardSchema,
  SaathiListCardSchema,
  SaathiEntityCardSchema,
  SaathiBudgetCardSchema,
  SaathiActionCardSchema,
])

export const SaathiToolNameSchema = z.enum([
  "create_party",
  "create_category",
  "create_template",
  "update_template",
  "create_transaction",
  "update_transaction",
  "create_transaction_from_template",
  "create_budget",
  "update_budget",
  "view_budget_snapshot",
])

export const SaathiToolCallSchema = z.object({
  tool: SaathiToolNameSchema,
  rationale: z.string().optional(),
  input: z.record(z.string(), z.unknown()).default({}),
})

export const SaathiStructuredResponseSchema = z.object({
  assistantText: z.string().min(1),
  cards: z.array(SaathiCardSchema).max(10).default([]),
  toolCalls: z.array(SaathiToolCallSchema).max(4).default([]),
})

export const SaathiToolExecutionSchema = z.object({
  tool: SaathiToolNameSchema,
  status: z.enum(["success", "error"]),
  summary: z.string().min(1),
})

export const SaathiAssistantMetadataSchema = z.object({
  uiVersion: z.literal("v1"),
  provider: z.enum(["gemini", "openrouter"]),
  cards: z.array(SaathiCardSchema).default([]),
  executedTools: z.array(SaathiToolExecutionSchema).default([]),
})

export type SaathiCard = z.infer<typeof SaathiCardSchema>
export type SaathiToolCall = z.infer<typeof SaathiToolCallSchema>
export type SaathiToolName = z.infer<typeof SaathiToolNameSchema>
export type SaathiStructuredResponse = z.infer<typeof SaathiStructuredResponseSchema>
export type SaathiToolExecution = z.infer<typeof SaathiToolExecutionSchema>
export type SaathiAssistantMetadata = z.infer<typeof SaathiAssistantMetadataSchema>
