import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES, type UserCacheScope } from "@/lib/server-cache"
import { GET as categoriesGET, POST as categoriesPOST, PUT as categoriesPUT, DELETE as categoriesDELETE } from "@/app/api/categories/route"
import { GET as partiesGET, POST as partiesPOST, PUT as partiesPUT, DELETE as partiesDELETE } from "@/app/api/parties/route"
import { GET as templatesGET, POST as templatesPOST, PUT as templatesPUT, DELETE as templatesDELETE } from "@/app/api/templates/route"
import { GET as budgetsGET, POST as budgetsPOST, PUT as budgetsPUT, DELETE as budgetsDELETE } from "@/app/api/budgets/route"
import { GET as accountsGET, POST as accountsPOST, PUT as accountsPUT, DELETE as accountsDELETE } from "@/app/api/accounts/route"
import { GET as transactionsGET, POST as transactionsPOST, PUT as transactionsPUT, DELETE as transactionsDELETE } from "@/app/api/transactions/route"
import { SAATHI_PERSONALITY_PROMPT } from "@/lib/saathi/personality"
import { SAATHI_CARD_CATALOG_PROMPT } from "@/lib/saathi/cards"
import { SAATHI_TOOL_CATALOG_PROMPT } from "@/lib/saathi/tools"
import { getSaathiCoreKnowledge } from "@/lib/saathi/core-knowledge"
import { generateSaathiResponse, type SaathiAttachmentPayload, type SaathiProvider } from "@/lib/saathi/providers"
import {
  SaathiAssistantMetadataSchema,
  SaathiCardSchema,
  SaathiToolCallSchema,
  type SaathiAssistantMetadata,
  type SaathiCard,
  type SaathiMutation,
  type SaathiToolCall,
  type SaathiToolExecution,
} from "@/lib/saathi/schema"

interface FinancialAccountData {
  id: string
  name: string
  type: string
  balance: number
  color?: string | null
  icon?: string | null
  isActive?: boolean
}

interface TransactionData {
  id: string
  date: Date | string
  type: string
  amount: number
  description: string
  category: string
  accountId: string
  accountName: string
  party: string | null
}

interface BudgetData {
  id: string
  name: string
  type: string
  method: string
  periodType: string
  totalAllocated: number
  totalSpent: number
  warningThreshold: number
  criticalThreshold: number
  isActive: boolean
  subBudgets: { categoryId: string | null; category: string; allocated: number; spent: number }[]
}

interface GoalData {
  id: string
  name: string
  currentAmount: number
  targetAmount: number
}

interface InsightData {
  title: string
  description: string
}

interface CategoryData {
  id: string
  name: string
  type: string
}

interface PartyData {
  id: string
  name: string
}

interface TemplateData {
  id: string
  name: string
  description: string | null
  amount: number | null
  type: string
  category: string
  accountId: string | null
  party: string | null
  tags: string[]
  notes: string | null
  isActive: boolean
}

interface ToolExecutionResult {
  execution: SaathiToolExecution
  cards: SaathiCard[]
  mutations?: SaathiMutation[]
}

interface GeneratedToolBlock {
  tool: SaathiToolCall["tool"]
  reason: string
}

interface SaathiChatContext {
  accounts: FinancialAccountData[]
  transactions: TransactionData[]
  budgets: BudgetData[]
  goals: GoalData[]
  recentInsights: InsightData[]
  categories: CategoryData[]
  parties: PartyData[]
  templates: TemplateData[]
}

interface ConversationMessageWithMetadata {
  role: "user" | "assistant"
  content: string
  metadata?: unknown
}

const MAX_RECENT_CONVERSATION_MESSAGES = 6
const MAX_ATTACHMENTS_PER_TYPE = 3
const MAX_ATTACHMENT_DATA_URL_LENGTH = 8_000_000

const CONTEXT_RESOURCES = {
  accounts: "accounts",
  transactions: "transactions",
  budgets: "budgets",
  goals: "goals",
  insights: "insights",
  categories: "categories",
  parties: "parties",
  templates: "templates",
} as const

type ContextResource = (typeof CONTEXT_RESOURCES)[keyof typeof CONTEXT_RESOURCES]

const EMPTY_CONTEXT: SaathiChatContext = {
  accounts: [],
  transactions: [],
  budgets: [],
  goals: [],
  recentInsights: [],
  categories: [],
  parties: [],
  templates: [],
}

const LocalConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  metadata: z.object({
    cards: z.array(z.unknown()).max(6).optional(),
    executedTools: z.array(z.unknown()).max(6).optional(),
    mutations: z.array(z.unknown()).max(8).optional(),
    provider: z.string().optional(),
  }).passthrough().optional(),
})

const AttachmentSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  dataUrl: z.string().min(1),
})

const ChatPostBodySchema = z.object({
  message: z.string().optional(),
  recentConversation: z.array(LocalConversationMessageSchema).max(MAX_RECENT_CONVERSATION_MESSAGES).optional(),
  toolRequests: z.array(SaathiToolCallSchema).max(8).optional(),
  attachments: z.object({
    images: z.array(AttachmentSchema).max(MAX_ATTACHMENTS_PER_TYPE).optional(),
    audio: z.array(AttachmentSchema).max(MAX_ATTACHMENTS_PER_TYPE).optional(),
  }).optional(),
})

function resolveSaathiProvider(): SaathiProvider {
  const configured = (process.env.SAATHI_LLM_PROVIDER || "gemini").toLowerCase()

  if (configured === "openrouter" && process.env.OPENROUTER_API_KEY) {
    return "openrouter"
  }

  if (configured === "gemini" && process.env.GEMINI_API_KEY) {
    return "gemini"
  }

  if (process.env.GEMINI_API_KEY) return "gemini"
  if (process.env.OPENROUTER_API_KEY) return "openrouter"

  throw new Error("No AI provider key configured (GEMINI_API_KEY or OPENROUTER_API_KEY)")
}

function toCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function normalizeDateValue(input: Date | string): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }

  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function normalizeConversationMessages(
  messages: Array<{ role: string; content: string; metadata?: unknown }>
): ConversationMessageWithMetadata[] {
  return messages
    .filter(message => (message.role === "user" || message.role === "assistant") && Boolean(message.content.trim()))
    .map(message => ({
      role: message.role as "user" | "assistant",
      content: message.content.trim(),
      metadata: message.metadata,
    }))
}

function isConfirmationMessage(input: string): boolean {
  const normalized = input.trim().toLowerCase()
  if (!normalized) return false
  return /^(yes|yup|yeah|ok|okay|done|confirm|confirmed|proceed|go ahead|do it|create it|save it|yes done)[.!]*$/.test(normalized)
}

function parseNumericAmount(input: string): number | null {
  const cleaned = input.replace(/[^0-9.\-]/g, "")
  if (!cleaned) return null
  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.abs(parsed)
}

function normalizeTypeValue(input: string | null): "income" | "expense" {
  if (!input) return "expense"
  return input.trim().toLowerCase().includes("income") ? "income" : "expense"
}

function normalizeCategoryValue(input: string | null): string | null {
  if (!input) return null
  const value = input.trim()
  if (!value || value.toLowerCase() === "missing") return null
  return value
}

function normalizeDateString(input: string | null): string | null {
  if (!input) return null
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function getEntityFieldValue(card: Record<string, unknown>, label: string): string | null {
  const fields = card.fields
  if (!Array.isArray(fields)) return null

  const found = fields.find(field => {
    if (!field || typeof field !== "object") return false
    const candidate = field as { label?: unknown }
    return typeof candidate.label === "string" && candidate.label.trim().toLowerCase() === label.toLowerCase()
  })

  if (!found || typeof found !== "object") return null
  const value = (found as { value?: unknown }).value
  return typeof value === "string" ? value : null
}

function buildDraftToolCallsFromConversation(
  message: string,
  messages: ConversationMessageWithMetadata[]
): SaathiToolCall[] {
  if (!isConfirmationMessage(message)) return []

  const latestAssistantWithDraft = [...messages]
    .reverse()
    .find(item => {
      if (item.role !== "assistant" || !item.metadata || typeof item.metadata !== "object") return false
      const raw = item.metadata as { cards?: unknown }
      if (!Array.isArray(raw.cards)) return false
      return raw.cards.some(card => {
        if (!card || typeof card !== "object") return false
        const candidate = card as { type?: unknown; status?: unknown }
        return candidate.type === "entity" && typeof candidate.status === "string" && candidate.status === "draft"
      })
    })

  if (!latestAssistantWithDraft || !latestAssistantWithDraft.metadata || typeof latestAssistantWithDraft.metadata !== "object") {
    return []
  }

  const cards = Array.isArray((latestAssistantWithDraft.metadata as { cards?: unknown }).cards)
    ? ((latestAssistantWithDraft.metadata as { cards?: unknown[] }).cards || [])
    : []

  const toolCalls: SaathiToolCall[] = []

  const categoryCards = cards.filter(card => {
    if (!card || typeof card !== "object") return false
    const candidate = card as { type?: unknown; entityType?: unknown; status?: unknown }
    return candidate.type === "entity" && candidate.entityType === "category" && candidate.status === "draft"
  })

  for (const card of categoryCards) {
    if (!card || typeof card !== "object") continue
    const raw = card as Record<string, unknown>
    const nameFromField = getEntityFieldValue(raw, "Name")
    const title = typeof raw.title === "string" ? raw.title : ""
    const nameFromTitle = title.includes(":") ? title.split(":").slice(1).join(":").trim() : title.trim()
    const categoryName = (nameFromField || nameFromTitle || "").trim()
    if (!categoryName || categoryName.toLowerCase() === "missing") continue

    const typeField = getEntityFieldValue(raw, "Type")
    const normalizedType = typeField?.toLowerCase().includes("income")
      ? "income"
      : typeField?.toLowerCase().includes("both")
        ? "both"
        : "expense"

    toolCalls.push({
      tool: "create_category",
      rationale: "Confirmed from prior draft card",
      input: {
        name: categoryName,
        type: normalizedType,
      },
    })
  }

  const transactionCards = cards.filter(card => {
    if (!card || typeof card !== "object") return false
    const candidate = card as { type?: unknown; entityType?: unknown; status?: unknown }
    return candidate.type === "entity" && candidate.entityType === "transaction" && candidate.status === "draft"
  })

  const transactionDedup = new Set<string>()

  for (const card of transactionCards) {
    if (!card || typeof card !== "object") continue
    const raw = card as Record<string, unknown>
    const description = (getEntityFieldValue(raw, "Description") || "").trim()
    const amount = parseNumericAmount(getEntityFieldValue(raw, "Amount") || "")
    const category = normalizeCategoryValue(getEntityFieldValue(raw, "Category"))
    const accountName = normalizeCategoryValue(getEntityFieldValue(raw, "Account"))
    const party = normalizeCategoryValue(getEntityFieldValue(raw, "Party"))
    const type = normalizeTypeValue(getEntityFieldValue(raw, "Type"))
    const date = normalizeDateString(getEntityFieldValue(raw, "Date"))

    if (!description || !amount || !category || !accountName) continue

    const dedupKey = `${description}|${amount}|${category}|${accountName}|${date || ""}|${party || ""}|${type}`
    if (transactionDedup.has(dedupKey)) continue
    transactionDedup.add(dedupKey)

    toolCalls.push({
      tool: "create_transaction",
      rationale: "Confirmed from prior draft card",
      input: {
        description,
        amount,
        category,
        accountName,
        type,
        ...(party ? { party } : {}),
        ...(date ? { date } : {}),
      },
    })
  }

  return toolCalls.slice(0, 8)
}

function reconcileGeneratedCards(
  cards: SaathiCard[],
  executions: SaathiToolExecution[]
): SaathiCard[] {
  if (executions.length > 0) return cards

  return cards.map(card => {
    if (card.type !== "entity") return card
    if (card.status !== "created" && card.status !== "updated") return card
    return {
      ...card,
      status: "draft",
    }
  })
}

function sanitizeCards(cards: SaathiCard[]): SaathiCard[] {
  const sanitized: SaathiCard[] = []

  cards.forEach((card, index) => {
    const parsed = SaathiCardSchema.safeParse(card)
    if (parsed.success) {
      sanitized.push(parsed.data)
      return
    }

    console.warn("Dropping invalid Saathi card at index", index, parsed.error.flatten())
  })

  return sanitized
}

function cleanDataUrl(attachment: SaathiAttachmentPayload): SaathiAttachmentPayload | null {
  if (!attachment.dataUrl.startsWith("data:")) return null
  if (attachment.dataUrl.length > MAX_ATTACHMENT_DATA_URL_LENGTH) return null
  return attachment
}

function normalizeRoleContentMessages(
  messages: Array<{ role: string; content: string; metadata?: unknown }>
): Array<{ role: "user" | "assistant"; content: string }> {
  const summarizeMetadata = (metadata: unknown): string | null => {
    if (!metadata || typeof metadata !== "object") return null

    const raw = metadata as {
      cards?: unknown
      executedTools?: unknown
      mutations?: unknown
      provider?: unknown
    }

    const summaryParts: string[] = []

    if (Array.isArray(raw.cards)) {
      const cardSummary = raw.cards
        .slice(0, 4)
        .map(card => {
          if (!card || typeof card !== "object") return null
          const candidate = card as { type?: unknown; title?: unknown; entityType?: unknown; status?: unknown; name?: unknown }
          const type = typeof candidate.type === "string" ? candidate.type : "card"
          const title = typeof candidate.title === "string"
            ? candidate.title
            : typeof candidate.name === "string"
              ? candidate.name
              : ""
          const entityType = typeof candidate.entityType === "string" ? candidate.entityType : ""
          const status = typeof candidate.status === "string" ? candidate.status : ""
          return [type, title, entityType, status].filter(Boolean).join(" | ")
        })
        .filter((item): item is string => Boolean(item))

      if (cardSummary.length > 0) {
        summaryParts.push(`Cards: ${cardSummary.join("; ")}`)
      }
    }

    if (Array.isArray(raw.executedTools)) {
      const toolSummary = raw.executedTools
        .slice(0, 4)
        .map(tool => {
          if (!tool || typeof tool !== "object") return null
          const candidate = tool as { tool?: unknown; status?: unknown; summary?: unknown }
          const toolName = typeof candidate.tool === "string" ? candidate.tool : ""
          const status = typeof candidate.status === "string" ? candidate.status : ""
          const summary = typeof candidate.summary === "string" ? candidate.summary : ""
          const composed = [toolName, status, summary].filter(Boolean).join(" | ")
          return composed || null
        })
        .filter((item): item is string => Boolean(item))

      if (toolSummary.length > 0) {
        summaryParts.push(`Tools: ${toolSummary.join("; ")}`)
      }
    }

    if (Array.isArray(raw.mutations)) {
      const mutationSummary = raw.mutations
        .slice(0, 6)
        .map(item => {
          if (!item || typeof item !== "object") return null
          const candidate = item as { resource?: unknown; operation?: unknown; entityId?: unknown }
          const resource = typeof candidate.resource === "string" ? candidate.resource : ""
          const operation = typeof candidate.operation === "string" ? candidate.operation : ""
          const entityId = typeof candidate.entityId === "string" ? candidate.entityId : ""
          return [operation, resource, entityId].filter(Boolean).join(" | ") || null
        })
        .filter((item): item is string => Boolean(item))

      if (mutationSummary.length > 0) {
        summaryParts.push(`Mutations: ${mutationSummary.join("; ")}`)
      }
    }

    if (typeof raw.provider === "string" && raw.provider.trim()) {
      summaryParts.push(`Provider: ${raw.provider}`)
    }

    if (summaryParts.length === 0) return null
    return summaryParts.join(" || ")
  }

  return messages
    .filter(message => (message.role === "user" || message.role === "assistant") && Boolean(message.content.trim()))
    .map(message => ({
      role: message.role as "user" | "assistant",
      content: [
        message.content.trim(),
        summarizeMetadata(message.metadata),
      ].filter(Boolean).join("\n[Previous card context] "),
    }))
}

function findAccountByName(accounts: FinancialAccountData[], name?: string): FinancialAccountData | null {
  if (!name) return null
  const query = name.trim().toLowerCase()
  if (!query) return null
  return accounts.find(account => account.name.toLowerCase() === query) || null
}

function isMissingTokenValue(input: unknown): boolean {
  if (typeof input !== "string") return true
  const normalized = input.trim().toLowerCase()
  if (!normalized) return true
  return new Set([
    "missing",
    "unknown",
    "n/a",
    "na",
    "none",
    "null",
    "undefined",
    "tbd",
    "?",
  ]).has(normalized)
}

function preflightGeneratedToolCalls(toolCalls: SaathiToolCall[]): {
  executableToolCalls: SaathiToolCall[]
  blockedToolCalls: GeneratedToolBlock[]
} {
  const executableToolCalls: SaathiToolCall[] = []
  const blockedToolCalls: GeneratedToolBlock[] = []

  for (const toolCall of toolCalls) {
    if (toolCall.tool !== "create_transaction") {
      executableToolCalls.push(toolCall)
      continue
    }

    const description = typeof toolCall.input.description === "string" ? toolCall.input.description : ""
    const category = typeof toolCall.input.category === "string" ? toolCall.input.category : ""
    const amount = typeof toolCall.input.amount === "number" && Number.isFinite(toolCall.input.amount)
      ? Math.abs(toolCall.input.amount)
      : 0

    const missingFields: string[] = []
    if (isMissingTokenValue(description)) missingFields.push("description")
    if (isMissingTokenValue(category)) missingFields.push("category")
    if (amount <= 0) missingFields.push("amount")

    if (missingFields.length === 0) {
      executableToolCalls.push(toolCall)
      continue
    }

    blockedToolCalls.push({
      tool: toolCall.tool,
      reason: `Missing required fields: ${missingFields.join(", ")}`,
    })
  }

  return { executableToolCalls, blockedToolCalls }
}

async function toJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T
  } catch {
    return null
  }
}

function getErrorFromApiPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const maybeError = (payload as { error?: unknown }).error
    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError
    }
  }
  return fallback
}

function hasDeleteConfirmation(toolCall: SaathiToolCall): boolean {
  return toolCall.input.confirm === true
}

function makeMutation(
  resource: SaathiMutation["resource"],
  operation: SaathiMutation["operation"],
  entityId?: string
): SaathiMutation {
  const cacheScopesByResource: Record<SaathiMutation["resource"], SaathiMutation["cacheScopes"]> = {
    accounts: ["accounts", "transactions", "budgets", "chat-context", "sync-core", "sync-advanced"],
    transactions: ["transactions", "budgets", "budget-summary", "chat-context", "sync-core", "sync-advanced"],
    budgets: ["budgets", "budget-summary", "chat-context", "sync-core"],
    categories: ["categories", "transactions", "budget-summary", "chat-context", "sync-core"],
    parties: ["parties", "chat-context", "sync-advanced"],
    templates: ["templates", "chat-context", "sync-advanced"],
  }

  return {
    resource,
    operation,
    entityId,
    cacheScopes: cacheScopesByResource[resource],
  }
}

function buildDeleteConfirmationCard(toolCall: SaathiToolCall, preview: string[]): SaathiCard {
  return {
    type: "confirm",
    title: "Confirm deletion",
    body: "This action is destructive and cannot be undone.",
    riskLevel: "high",
    preview,
    confirmToolRequests: [
      {
        ...toolCall,
        input: {
          ...toolCall.input,
          confirm: true,
        },
      },
    ],
    cancelSuggestedPrompt: "Cancel this deletion.",
    suggestChangesPrompt: "Suggest a safer alternative.",
  }
}

function isClearEverythingIntent(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return false
  const hasDeleteVerb = /(clear|delete|wipe|remove|reset)/.test(normalized)
  const hasAllTarget = /(everything|all data|all records|all entries|entire workspace|clean slate)/.test(normalized)
  return hasDeleteVerb && hasAllTarget
}

function getGenerationContextResources(message: string): Set<ContextResource> {
  const normalized = message.trim().toLowerCase()
  const resources = new Set<ContextResource>()
  const add = (...values: ContextResource[]) => values.forEach(value => resources.add(value))

  if (!normalized) {
    add(
      CONTEXT_RESOURCES.accounts,
      CONTEXT_RESOURCES.transactions,
      CONTEXT_RESOURCES.categories,
      CONTEXT_RESOURCES.budgets
    )
    return resources
  }

  const wantsBroadAnalysis = /\b(analyze|analysis|insight|insights|pattern|trend|overview|summary|forecast|health check)\b/.test(normalized)
  if (wantsBroadAnalysis) {
    return new Set(Object.values(CONTEXT_RESOURCES))
  }

  if (/\b(account|accounts|balance|cash|wallet)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.accounts)
  }

  if (/\b(transaction|transactions|expense|expenses|income|spent|spend|payment|purchase)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.transactions, CONTEXT_RESOURCES.accounts, CONTEXT_RESOURCES.categories)
  }

  if (/\b(category|categories)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.categories)
  }

  if (/\b(party|parties|merchant|vendor|payee)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.parties)
  }

  if (/\b(template|templates)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.templates, CONTEXT_RESOURCES.accounts)
  }

  if (/\b(budget|budgets|allocated|remaining|limit)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.budgets, CONTEXT_RESOURCES.categories, CONTEXT_RESOURCES.transactions)
  }

  if (/\b(goal|goals|target)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.goals)
  }

  if (/\b(insight|insights)\b/.test(normalized)) {
    add(CONTEXT_RESOURCES.insights)
  }

  if (resources.size === 0) {
    const looksLikeQuickEntry = /\d/.test(normalized) && (/\b(today|yesterday|tomorrow)\b/.test(normalized) || /[(),]/.test(normalized))
    if (looksLikeQuickEntry) {
      add(
        CONTEXT_RESOURCES.accounts,
        CONTEXT_RESOURCES.categories
      )
      return resources
    }

    add(
      CONTEXT_RESOURCES.accounts,
      CONTEXT_RESOURCES.transactions,
      CONTEXT_RESOURCES.categories,
      CONTEXT_RESOURCES.budgets
    )
  }

  return resources
}

function getRequiredContextResourcesForTools(toolCalls: SaathiToolCall[]): Set<ContextResource> {
  const resources = new Set<ContextResource>()

  for (const toolCall of toolCalls) {
    switch (toolCall.tool) {
      case "view_accounts":
      case "create_account":
      case "update_account":
      case "delete_account":
        resources.add(CONTEXT_RESOURCES.accounts)
        break
      case "view_categories":
      case "create_category":
      case "update_category":
      case "delete_category":
        resources.add(CONTEXT_RESOURCES.categories)
        break
      case "view_parties":
      case "create_party":
      case "update_party":
      case "delete_party":
        resources.add(CONTEXT_RESOURCES.parties)
        break
      case "view_templates":
      case "create_template":
      case "update_template":
      case "delete_template":
      case "create_transaction_from_template":
        resources.add(CONTEXT_RESOURCES.templates)
        resources.add(CONTEXT_RESOURCES.accounts)
        break
      case "view_transactions":
      case "create_transaction":
      case "update_transaction":
      case "delete_transaction":
        resources.add(CONTEXT_RESOURCES.transactions)
        resources.add(CONTEXT_RESOURCES.accounts)
        resources.add(CONTEXT_RESOURCES.categories)
        break
      case "view_budgets":
      case "create_budget":
      case "update_budget":
      case "delete_budget":
      case "view_budget_snapshot":
        resources.add(CONTEXT_RESOURCES.budgets)
        resources.add(CONTEXT_RESOURCES.categories)
        break
      case "clear_core_data":
        resources.add(CONTEXT_RESOURCES.accounts)
        resources.add(CONTEXT_RESOURCES.transactions)
        resources.add(CONTEXT_RESOURCES.categories)
        resources.add(CONTEXT_RESOURCES.parties)
        resources.add(CONTEXT_RESOURCES.templates)
        resources.add(CONTEXT_RESOURCES.budgets)
        break
      default:
        break
    }
  }

  return resources
}

function normalizeUpdateTransactionInput(input: Record<string, unknown>): {
  transactionId: string
  updates: Record<string, unknown>
} | null {
  const transactionId = typeof input.transactionId === "string" ? input.transactionId : ""
  if (!transactionId) return null

  const updates = typeof input.updates === "object" && input.updates
    ? { ...(input.updates as Record<string, unknown>) }
    : {}

  const topLevelKeys = ["description", "amount", "type", "category", "accountId", "date", "party", "notes", "tags"]
  for (const key of topLevelKeys) {
    if (input[key] !== undefined && updates[key] === undefined) {
      updates[key] = input[key]
    }
  }

  return {
    transactionId,
    updates,
  }
}

function buildEntityCard(input: {
  entityType: "party" | "category" | "template" | "transaction" | "budget"
  title: string
  status: "info" | "draft" | "created" | "updated" | "deleted" | "error"
  entityId?: string
  fields: Array<{ label: string; value: string }>
}): SaathiCard {
  return {
    type: "entity",
    entityType: input.entityType,
    title: input.title,
    status: input.status,
    entityId: input.entityId,
    fields: input.fields,
  }
}

async function fetchChatContext(
  userId: string,
  now: Date,
  {
    resources,
    includeRuntimeSlices = true,
  }: {
    resources?: Set<ContextResource>
    includeRuntimeSlices?: boolean
  } = {}
): Promise<SaathiChatContext> {
  const monthKey = format(now, "yyyy-MM")
  const selected = resources || new Set<ContextResource>(Object.values(CONTEXT_RESOURCES))

  if (selected.size === 0) {
    return EMPTY_CONTEXT
  }

  return getCachedUserData({
    userId,
    scope: USER_CACHE_SCOPES.chatContext,
    keyParts: [monthKey, ...[...selected].sort(), includeRuntimeSlices ? "runtime:1" : "runtime:0"],
    revalidateSeconds: 30,
    loader: async () => {
      const shouldLoad = (resource: ContextResource) => selected.has(resource)

      const [
        accounts,
        transactions,
        budgets,
        goals,
        recentInsights,
        categories,
        parties,
        templates,
      ] = await Promise.all([
        shouldLoad(CONTEXT_RESOURCES.accounts)
          ? prisma.financialAccount.findMany({
              where: { userId },
              select: {
                id: true,
                name: true,
                type: true,
                balance: true,
                color: true,
                icon: true,
                isActive: true,
              },
              orderBy: { name: "asc" },
            }) as Promise<FinancialAccountData[]>
          : Promise.resolve([] as FinancialAccountData[]),
        shouldLoad(CONTEXT_RESOURCES.transactions)
          ? prisma.transaction.findMany({
              where: {
                userId,
                date: { gte: subMonths(now, includeRuntimeSlices ? 3 : 24) },
              },
              orderBy: { date: "desc" },
              take: includeRuntimeSlices ? 120 : 500,
              include: {
                account: {
                  select: {
                    name: true,
                  },
                },
              },
            }).then(rows => rows.map(row => ({
              id: row.id,
              date: row.date,
              type: row.type,
              amount: row.amount,
              description: row.description,
              category: row.category,
              accountId: row.accountId,
              accountName: row.account.name,
              party: row.party,
            }))) as Promise<TransactionData[]>
          : Promise.resolve([] as TransactionData[]),
        shouldLoad(CONTEXT_RESOURCES.budgets)
          ? prisma.budget.findMany({
              where: { userId },
              include: {
                subBudgets: {
                  select: {
                    categoryId: true,
                    category: true,
                    allocated: true,
                    spent: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            }) as Promise<BudgetData[]>
          : Promise.resolve([] as BudgetData[]),
        includeRuntimeSlices && shouldLoad(CONTEXT_RESOURCES.goals)
          ? prisma.goal.findMany({
              where: { userId, isActive: true },
              select: {
                id: true,
                name: true,
                currentAmount: true,
                targetAmount: true,
              },
              orderBy: { createdAt: "desc" },
            }) as Promise<GoalData[]>
          : Promise.resolve([] as GoalData[]),
        includeRuntimeSlices && shouldLoad(CONTEXT_RESOURCES.insights)
          ? prisma.insight.findMany({
              where: { userId, isArchived: false },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: {
                title: true,
                description: true,
              },
            }) as Promise<InsightData[]>
          : Promise.resolve([] as InsightData[]),
        shouldLoad(CONTEXT_RESOURCES.categories)
          ? prisma.category.findMany({
              where: { userId },
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
                type: true,
              },
            }) as Promise<CategoryData[]>
          : Promise.resolve([] as CategoryData[]),
        shouldLoad(CONTEXT_RESOURCES.parties)
          ? prisma.party.findMany({
              where: { userId },
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
              },
            }) as Promise<PartyData[]>
          : Promise.resolve([] as PartyData[]),
        shouldLoad(CONTEXT_RESOURCES.templates)
          ? prisma.transactionTemplate.findMany({
              where: { userId, isActive: true },
              orderBy: { createdAt: "desc" },
              take: 40,
              select: {
                id: true,
                name: true,
                description: true,
                amount: true,
                type: true,
                category: true,
                accountId: true,
                party: true,
                tags: true,
                notes: true,
                isActive: true,
              },
            }) as Promise<TemplateData[]>
          : Promise.resolve([] as TemplateData[]),
      ])

      return { accounts, transactions, budgets, goals, recentInsights, categories, parties, templates }
    },
  })
}

async function executeToolCall(
  userId: string,
  origin: string,
  toolCall: SaathiToolCall,
  context: SaathiChatContext
): Promise<ToolExecutionResult> {
  const executeError = (message: string): ToolExecutionResult => ({
    execution: {
      tool: toolCall.tool,
      status: "error",
      summary: message,
    },
    cards: [
      buildEntityCard({
        entityType: "transaction",
        title: "Saathi Action Failed",
        status: "error",
        fields: [{ label: "Reason", value: message }],
      }),
    ],
    mutations: [],
  })

  const buildRequest = (path: string, method: "GET" | "POST" | "PUT" | "DELETE", payload?: unknown) =>
    new NextRequest(`${origin}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    })

  switch (toolCall.tool) {
    case "view_accounts": {
      const response = await accountsGET()
      const payload = await toJson<Array<{
        id: string
        name: string
        type: string
        balance: number
        isActive?: boolean
      }> | { error?: string }>(response)

      if (!response.ok || !payload || !Array.isArray(payload)) {
        return executeError(getErrorFromApiPayload(payload, "Unable to load accounts"))
      }

      const limit = typeof toolCall.input.limit === "number" ? Math.max(1, Math.min(10, Math.round(toolCall.input.limit))) : 6
      const selected = payload.slice(0, limit)

      return {
        execution: {
          tool: "view_accounts",
          status: "success",
          summary: `Loaded ${selected.length} account(s)`,
        },
        cards: [
          {
            type: "stats",
            title: "Accounts Overview",
            stats: [
              { label: "Total Accounts", value: String(payload.length) },
              {
                label: "Total Balance",
                value: toCurrency(payload.reduce((sum, account) => sum + account.balance, 0)),
                tone: payload.reduce((sum, account) => sum + account.balance, 0) >= 0 ? "good" : "warn",
              },
            ],
          },
          {
            type: "list",
            title: "Accounts",
            items: selected.map(account => ({
              label: `${account.name} (${account.type})`,
              description: `${toCurrency(account.balance)}${account.isActive === false ? " • inactive" : ""}`,
            })),
          },
        ],
      }
    }

    case "create_account": {
      const name = typeof toolCall.input.name === "string" ? toolCall.input.name.trim() : ""
      const type = toolCall.input.type === "checking" || toolCall.input.type === "savings" || toolCall.input.type === "credit"
        ? toolCall.input.type
        : "checking"
      const balance = typeof toolCall.input.balance === "number" ? toolCall.input.balance : 0

      if (!name) return executeError("Account name is required")

      const response = await accountsPOST(buildRequest("/api/accounts", "POST", {
        name,
        type,
        balance,
        color: typeof toolCall.input.color === "string" ? toolCall.input.color : undefined,
        icon: typeof toolCall.input.icon === "string" ? toolCall.input.icon : undefined,
      }))
      const payload = await toJson<{ id: string; name: string; type: string; balance: number; error?: string }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to create account"))
      }

      return {
        execution: {
          tool: "create_account",
          status: "success",
          summary: `Created account "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "transaction",
            title: "Account Created",
            status: "created",
            entityId: payload.id,
            fields: [
              { label: "Name", value: payload.name },
              { label: "Type", value: payload.type },
              { label: "Balance", value: toCurrency(payload.balance) },
            ],
          }),
        ],
        mutations: [makeMutation("accounts", "create", payload.id)],
      }
    }

    case "update_account": {
      const accountId = typeof toolCall.input.accountId === "string" ? toolCall.input.accountId : ""
      const accountName = typeof toolCall.input.accountName === "string" ? toolCall.input.accountName.trim() : ""
      const updates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}

      const resolved = accountId
        ? context.accounts.find(account => account.id === accountId)
        : context.accounts.find(account => account.name.toLowerCase() === accountName.toLowerCase())

      if (!resolved) return executeError("Account not found")

      const response = await accountsPUT(buildRequest("/api/accounts", "PUT", {
        id: resolved.id,
        ...updates,
      }))
      const payload = await toJson<{ id: string; name: string; type: string; balance: number; error?: string }>(response)
      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to update account"))
      }

      return {
        execution: {
          tool: "update_account",
          status: "success",
          summary: `Updated account "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "transaction",
            title: "Account Updated",
            status: "updated",
            entityId: payload.id,
            fields: [
              { label: "Name", value: payload.name },
              { label: "Type", value: payload.type },
              { label: "Balance", value: toCurrency(payload.balance) },
            ],
          }),
        ],
        mutations: [makeMutation("accounts", "update", payload.id)],
      }
    }

    case "delete_account": {
      const accountId = typeof toolCall.input.accountId === "string" ? toolCall.input.accountId : ""
      const accountName = typeof toolCall.input.accountName === "string" ? toolCall.input.accountName.trim() : ""
      const resolved = accountId
        ? context.accounts.find(account => account.id === accountId)
        : context.accounts.find(account => account.name.toLowerCase() === accountName.toLowerCase())

      if (!resolved) return executeError("Account not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: {
            tool: "delete_account",
            status: "error",
            summary: `Confirmation required to delete account "${resolved.name}"`,
          },
          cards: [buildDeleteConfirmationCard(toolCall, [
            `Account: ${resolved.name}`,
            `Type: ${resolved.type}`,
            `Balance: ${toCurrency(resolved.balance)}`,
          ])],
        }
      }

      const response = await accountsDELETE(buildRequest("/api/accounts", "DELETE", { id: resolved.id }))
      const payload = await toJson<{ success?: boolean; error?: string }>(response)
      if (!response.ok) {
        return executeError(getErrorFromApiPayload(payload, "Unable to delete account"))
      }

      return {
        execution: {
          tool: "delete_account",
          status: "success",
          summary: `Deleted account "${resolved.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "transaction",
            title: "Account Deleted",
            status: "deleted",
            entityId: resolved.id,
            fields: [
              { label: "Name", value: resolved.name },
              { label: "Type", value: resolved.type },
            ],
          }),
        ],
        mutations: [makeMutation("accounts", "delete", resolved.id)],
      }
    }

    case "view_parties": {
      const response = await partiesGET()
      const payload = await toJson<Array<{ id: string; name: string }> | { error?: string }>(response)
      if (!response.ok || !payload || !Array.isArray(payload)) {
        return executeError(getErrorFromApiPayload(payload, "Unable to load parties"))
      }

      const limit = typeof toolCall.input.limit === "number" ? Math.max(1, Math.min(12, Math.round(toolCall.input.limit))) : 8
      const selected = payload.slice(0, limit)

      return {
        execution: {
          tool: "view_parties",
          status: "success",
          summary: `Loaded ${selected.length} party(s)`,
        },
        cards: [{
          type: "list",
          title: "Parties",
          items: selected.map(item => ({
            label: item.name,
            description: item.id,
          })),
        }],
      }
    }

    case "create_party": {
      const name = typeof toolCall.input.name === "string" ? toolCall.input.name.trim() : ""
      if (!name) return executeError("Party name is required")

      const response = await partiesPOST(buildRequest("/api/parties", "POST", { name }))
      const payload = await toJson<{ id: string; name: string; error?: string }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to create party"))
      }

      return {
        execution: {
          tool: "create_party",
          status: "success",
          summary: `Created party "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "party",
            title: "Party Created",
            status: "created",
            entityId: payload.id,
            fields: [
              { label: "Name", value: payload.name },
            ],
          }),
        ],
        mutations: [makeMutation("parties", "create", payload.id)],
      }
    }

    case "update_party": {
      const partyId = typeof toolCall.input.partyId === "string" ? toolCall.input.partyId : ""
      const partyName = typeof toolCall.input.partyName === "string" ? toolCall.input.partyName.trim() : ""
      const updates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}

      const resolvedParty = partyId
        ? context.parties.find(party => party.id === partyId)
        : context.parties.find(party => party.name.toLowerCase() === partyName.toLowerCase())

      if (!resolvedParty) return executeError("Party not found")

      const updatedName = typeof updates.name === "string" ? updates.name : ""
      if (!updatedName.trim()) return executeError("Updated party name is required")

      const response = await partiesPUT(buildRequest("/api/parties", "PUT", {
        id: resolvedParty.id,
        name: updatedName.trim(),
      }))
      const payload = await toJson<{ id: string; name: string; error?: string }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to update party"))
      }

      return {
        execution: {
          tool: "update_party",
          status: "success",
          summary: `Updated party "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "party",
            title: "Party Updated",
            status: "updated",
            entityId: payload.id,
            fields: [{ label: "Name", value: payload.name }],
          }),
        ],
        mutations: [makeMutation("parties", "update", payload.id)],
      }
    }

    case "delete_party": {
      const partyId = typeof toolCall.input.partyId === "string" ? toolCall.input.partyId : ""
      const partyName = typeof toolCall.input.partyName === "string" ? toolCall.input.partyName.trim() : ""
      const resolvedParty = partyId
        ? context.parties.find(party => party.id === partyId)
        : context.parties.find(party => party.name.toLowerCase() === partyName.toLowerCase())

      if (!resolvedParty) return executeError("Party not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: {
            tool: "delete_party",
            status: "error",
            summary: `Confirmation required to delete party "${resolvedParty.name}"`,
          },
          cards: [
            buildDeleteConfirmationCard(toolCall, [
              `Party: ${resolvedParty.name}`,
            ]),
          ],
        }
      }

      const response = await partiesDELETE(buildRequest("/api/parties", "DELETE", { id: resolvedParty.id }))
      const payload = await toJson<{ success?: boolean; error?: string }>(response)
      if (!response.ok) {
        return executeError(getErrorFromApiPayload(payload, "Unable to delete party"))
      }

      return {
        execution: {
          tool: "delete_party",
          status: "success",
          summary: `Deleted party "${resolvedParty.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "party",
            title: "Party Deleted",
            status: "deleted",
            entityId: resolvedParty.id,
            fields: [{ label: "Name", value: resolvedParty.name }],
          }),
        ],
        mutations: [makeMutation("parties", "delete", resolvedParty.id)],
      }
    }

    case "view_categories": {
      const response = await categoriesGET()
      const payload = await toJson<Array<{ id: string; name: string; type: string }> | { error?: string }>(response)
      if (!response.ok || !payload || !Array.isArray(payload)) {
        return executeError(getErrorFromApiPayload(payload, "Unable to load categories"))
      }

      const requestedType = toolCall.input.type === "income" || toolCall.input.type === "expense" || toolCall.input.type === "both"
        ? toolCall.input.type
        : null
      const filtered = requestedType ? payload.filter(item => item.type === requestedType) : payload
      const limit = typeof toolCall.input.limit === "number" ? Math.max(1, Math.min(16, Math.round(toolCall.input.limit))) : 10

      return {
        execution: {
          tool: "view_categories",
          status: "success",
          summary: `Loaded ${Math.min(filtered.length, limit)} category(s)`,
        },
        cards: [
          {
            type: "list",
            title: requestedType ? `Categories (${requestedType})` : "Categories",
            items: filtered.slice(0, limit).map(item => ({
              label: item.name,
              description: item.type,
            })),
          },
        ],
      }
    }

    case "create_category": {
      const name = typeof toolCall.input.name === "string" ? toolCall.input.name.trim() : ""
      const type = toolCall.input.type === "income" || toolCall.input.type === "expense" || toolCall.input.type === "both"
        ? toolCall.input.type
        : "expense"

      if (!name) return executeError("Category name is required")

      const existingCategory = context.categories.find(
        category => category.name.trim().toLowerCase() === name.toLowerCase()
      )

      if (existingCategory) {
        return {
          execution: {
            tool: "create_category",
            status: "success",
            summary: `Category "${existingCategory.name}" already exists`,
          },
          cards: [
            buildEntityCard({
              entityType: "category",
              title: "Category Available",
              status: "info",
              entityId: existingCategory.id,
              fields: [
                { label: "Name", value: existingCategory.name },
                { label: "Type", value: existingCategory.type },
              ],
            }),
          ],
        }
      }

      const response = await categoriesPOST(buildRequest("/api/categories", "POST", { name, type }))
      const payload = await toJson<{ id: string; name: string; type: string; error?: string }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to create category"))
      }

      return {
        execution: {
          tool: "create_category",
          status: "success",
          summary: `Created category "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "category",
            title: "Category Created",
            status: "created",
            entityId: payload.id,
            fields: [
              { label: "Name", value: payload.name },
              { label: "Type", value: payload.type },
            ],
          }),
        ],
        mutations: [makeMutation("categories", "create", payload.id)],
      }
    }

    case "update_category": {
      const categoryId = typeof toolCall.input.categoryId === "string" ? toolCall.input.categoryId : ""
      const categoryName = typeof toolCall.input.categoryName === "string" ? toolCall.input.categoryName.trim() : ""
      const updates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}

      const resolvedCategory = categoryId
        ? context.categories.find(category => category.id === categoryId)
        : context.categories.find(category => category.name.toLowerCase() === categoryName.toLowerCase())

      if (!resolvedCategory) return executeError("Category not found")

      const response = await categoriesPUT(buildRequest("/api/categories", "PUT", {
        id: resolvedCategory.id,
        ...updates,
      }))
      const payload = await toJson<{ id: string; name: string; type: string; error?: string }>(response)
      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to update category"))
      }

      return {
        execution: {
          tool: "update_category",
          status: "success",
          summary: `Updated category "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "category",
            title: "Category Updated",
            status: "updated",
            entityId: payload.id,
            fields: [
              { label: "Name", value: payload.name },
              { label: "Type", value: payload.type },
            ],
          }),
        ],
        mutations: [makeMutation("categories", "update", payload.id)],
      }
    }

    case "delete_category": {
      const categoryId = typeof toolCall.input.categoryId === "string" ? toolCall.input.categoryId : ""
      const categoryName = typeof toolCall.input.categoryName === "string" ? toolCall.input.categoryName.trim() : ""
      const resolvedCategory = categoryId
        ? context.categories.find(category => category.id === categoryId)
        : context.categories.find(category => category.name.toLowerCase() === categoryName.toLowerCase())

      if (!resolvedCategory) return executeError("Category not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: {
            tool: "delete_category",
            status: "error",
            summary: `Confirmation required to delete category "${resolvedCategory.name}"`,
          },
          cards: [
            buildDeleteConfirmationCard(toolCall, [
              `Category: ${resolvedCategory.name}`,
              `Type: ${resolvedCategory.type}`,
            ]),
          ],
        }
      }

      const response = await categoriesDELETE(buildRequest("/api/categories", "DELETE", { id: resolvedCategory.id }))
      const payload = await toJson<{ success?: boolean; error?: string }>(response)
      if (!response.ok) {
        return executeError(getErrorFromApiPayload(payload, "Unable to delete category"))
      }

      return {
        execution: {
          tool: "delete_category",
          status: "success",
          summary: `Deleted category "${resolvedCategory.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "category",
            title: "Category Deleted",
            status: "deleted",
            entityId: resolvedCategory.id,
            fields: [
              { label: "Name", value: resolvedCategory.name },
              { label: "Type", value: resolvedCategory.type },
            ],
          }),
        ],
        mutations: [makeMutation("categories", "delete", resolvedCategory.id)],
      }
    }

    case "view_templates": {
      const response = await templatesGET()
      const payload = await toJson<Array<{
        id: string
        name: string
        type: string
        category: string
        amount: number | null
        isActive: boolean
      }> | { error?: string }>(response)
      if (!response.ok || !payload || !Array.isArray(payload)) {
        return executeError(getErrorFromApiPayload(payload, "Unable to load templates"))
      }

      const includeInactive = Boolean(toolCall.input.includeInactive)
      const filtered = includeInactive ? payload : payload.filter(item => item.isActive)
      const limit = typeof toolCall.input.limit === "number" ? Math.max(1, Math.min(12, Math.round(toolCall.input.limit))) : 8

      return {
        execution: {
          tool: "view_templates",
          status: "success",
          summary: `Loaded ${Math.min(filtered.length, limit)} template(s)`,
        },
        cards: [
          {
            type: "list",
            title: "Templates",
            items: filtered.slice(0, limit).map(item => ({
              label: item.name,
              description: `${item.type} • ${item.category}${item.amount ? ` • ${toCurrency(item.amount)}` : ""}${item.isActive ? "" : " • inactive"}`,
            })),
          },
        ],
      }
    }

    case "create_template": {
      const name = typeof toolCall.input.name === "string" ? toolCall.input.name.trim() : ""
      const type = toolCall.input.type === "income" || toolCall.input.type === "expense"
        ? toolCall.input.type
        : "expense"
      const category = typeof toolCall.input.category === "string" ? toolCall.input.category.trim() : ""
      const amount = typeof toolCall.input.amount === "number" ? toolCall.input.amount : undefined

      if (!name || !category) return executeError("Template requires name and category")

      const response = await templatesPOST(buildRequest("/api/templates", "POST", {
        name,
        type,
        category,
        amount,
        description: typeof toolCall.input.description === "string" ? toolCall.input.description : undefined,
        accountId: typeof toolCall.input.accountId === "string" ? toolCall.input.accountId : undefined,
        party: typeof toolCall.input.party === "string" ? toolCall.input.party : undefined,
        tags: Array.isArray(toolCall.input.tags) ? toolCall.input.tags : undefined,
        notes: typeof toolCall.input.notes === "string" ? toolCall.input.notes : undefined,
      }))
      const payload = await toJson<{ id: string; name: string; type: string; category: string; amount?: number | null; error?: string }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to create template"))
      }

      return {
        execution: {
          tool: "create_template",
          status: "success",
          summary: `Created template "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "template",
            title: "Template Created",
            status: "created",
            entityId: payload.id,
            fields: [
              { label: "Name", value: payload.name },
              { label: "Type", value: payload.type },
              { label: "Category", value: payload.category },
              { label: "Amount", value: payload.amount ? toCurrency(payload.amount) : "Flexible" },
            ],
          }),
        ],
        mutations: [makeMutation("templates", "create", payload.id)],
      }
    }

    case "update_template": {
      const templateId = typeof toolCall.input.templateId === "string" ? toolCall.input.templateId : null
      const templateName = typeof toolCall.input.templateName === "string" ? toolCall.input.templateName.trim() : ""

      const resolvedTemplate = templateId
        ? context.templates.find(template => template.id === templateId)
        : context.templates.find(template => template.name.toLowerCase() === templateName.toLowerCase())

      if (!resolvedTemplate) return executeError("Template not found")

      const updates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}

      const response = await templatesPUT(buildRequest("/api/templates", "PUT", {
        id: resolvedTemplate.id,
        ...updates,
      }))
      const payload = await toJson<{ id: string; name: string; category: string; type: string; amount?: number | null; error?: string }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to update template"))
      }

      return {
        execution: {
          tool: "update_template",
          status: "success",
          summary: `Updated template "${payload.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "template",
            title: "Template Updated",
            status: "updated",
            entityId: payload.id,
            fields: [
              { label: "Name", value: payload.name },
              { label: "Type", value: payload.type },
              { label: "Category", value: payload.category },
              { label: "Amount", value: payload.amount ? toCurrency(payload.amount) : "Flexible" },
            ],
          }),
        ],
        mutations: [makeMutation("templates", "update", payload.id)],
      }
    }

    case "delete_template": {
      const templateId = typeof toolCall.input.templateId === "string" ? toolCall.input.templateId : ""
      const templateName = typeof toolCall.input.templateName === "string" ? toolCall.input.templateName.trim() : ""

      const resolvedTemplate = templateId
        ? context.templates.find(template => template.id === templateId)
        : context.templates.find(template => template.name.toLowerCase() === templateName.toLowerCase())

      if (!resolvedTemplate) return executeError("Template not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: {
            tool: "delete_template",
            status: "error",
            summary: `Confirmation required to delete template "${resolvedTemplate.name}"`,
          },
          cards: [
            buildDeleteConfirmationCard(toolCall, [
              `Template: ${resolvedTemplate.name}`,
              `Type: ${resolvedTemplate.type}`,
              `Category: ${resolvedTemplate.category}`,
            ]),
          ],
        }
      }

      const response = await templatesDELETE(buildRequest("/api/templates", "DELETE", { id: resolvedTemplate.id }))
      const payload = await toJson<{ success?: boolean; error?: string }>(response)
      if (!response.ok) {
        return executeError(getErrorFromApiPayload(payload, "Unable to delete template"))
      }

      return {
        execution: {
          tool: "delete_template",
          status: "success",
          summary: `Deleted template "${resolvedTemplate.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "template",
            title: "Template Deleted",
            status: "deleted",
            entityId: resolvedTemplate.id,
            fields: [
              { label: "Name", value: resolvedTemplate.name },
              { label: "Type", value: resolvedTemplate.type },
              { label: "Category", value: resolvedTemplate.category },
            ],
          }),
        ],
        mutations: [makeMutation("templates", "delete", resolvedTemplate.id)],
      }
    }

    case "view_transactions": {
      const searchParams = new URLSearchParams()
      const limit = typeof toolCall.input.limit === "number" ? Math.max(1, Math.min(40, Math.round(toolCall.input.limit))) : 10
      searchParams.set("limit", String(limit))
      if (typeof toolCall.input.accountId === "string") searchParams.set("accountId", toolCall.input.accountId)
      if (typeof toolCall.input.category === "string") searchParams.set("category", toolCall.input.category)
      if (toolCall.input.type === "income" || toolCall.input.type === "expense") searchParams.set("type", toolCall.input.type)
      if (typeof toolCall.input.startDate === "string") searchParams.set("startDate", toolCall.input.startDate)
      if (typeof toolCall.input.endDate === "string") searchParams.set("endDate", toolCall.input.endDate)

      const response = await transactionsGET(buildRequest(`/api/transactions?${searchParams.toString()}`, "GET"))
      const payload = await toJson<
        { items: Array<{ id: string; description: string; amount: number; type: string; category: string; date: string; accountName?: string }> } |
        Array<{ id: string; description: string; amount: number; type: string; category: string; date: string; accountName?: string }> |
        { error?: string }
      >(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to load transactions"))
      }

      const transactions = Array.isArray(payload)
        ? payload
        : ("items" in payload && Array.isArray(payload.items) ? payload.items : [])

      return {
        execution: {
          tool: "view_transactions",
          status: "success",
          summary: `Loaded ${transactions.length} transaction(s)`,
        },
        cards: [
          {
            type: "list",
            title: "Recent Transactions",
            items: transactions.slice(0, limit).map(item => ({
              label: `${item.description} • ${toCurrency(Math.abs(item.amount))}`,
              description: `${item.type} • ${item.category}${item.accountName ? ` • ${item.accountName}` : ""} • ${format(new Date(item.date), "MMM dd, yyyy")}`,
            })),
          },
        ],
      }
    }

    case "create_transaction": {
      const description = typeof toolCall.input.description === "string" ? toolCall.input.description.trim() : ""
      const category = typeof toolCall.input.category === "string" ? toolCall.input.category.trim() : ""
      const type = toolCall.input.type === "income" || toolCall.input.type === "expense"
        ? toolCall.input.type
        : "expense"
      const amount = typeof toolCall.input.amount === "number" ? Math.abs(toolCall.input.amount) : 0
      const accountIdInput = typeof toolCall.input.accountId === "string" ? toolCall.input.accountId : null
      const accountNameInput = typeof toolCall.input.accountName === "string" ? toolCall.input.accountName : undefined
      const account = accountIdInput
        ? context.accounts.find(item => item.id === accountIdInput) || null
        : findAccountByName(context.accounts, accountNameInput) || context.accounts[0] || null

      if (!description || !category || !amount) {
        return executeError("Transaction requires description, amount, and category")
      }
      if (!account) return executeError("No account available to create transaction")

      const date = typeof toolCall.input.date === "string" ? toolCall.input.date : new Date().toISOString()

      const response = await transactionsPOST(buildRequest("/api/transactions", "POST", {
        description,
        amount,
        date,
        category,
        type,
        accountId: account.id,
        party: typeof toolCall.input.party === "string" ? toolCall.input.party : undefined,
        notes: typeof toolCall.input.notes === "string" ? toolCall.input.notes : undefined,
        tags: Array.isArray(toolCall.input.tags) ? toolCall.input.tags : undefined,
      }))
      const payload = await toJson<{
        id: string
        description: string
        amount: number
        type: string
        category: string
        accountId: string
        date: string
        error?: string
      }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to create transaction"))
      }

      return {
        execution: {
          tool: "create_transaction",
          status: "success",
          summary: `Created transaction "${payload.description}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "transaction",
            title: "Transaction Added",
            status: "created",
            entityId: payload.id,
            fields: [
              { label: "Description", value: payload.description },
              { label: "Amount", value: toCurrency(Math.abs(payload.amount)) },
              { label: "Type", value: payload.type },
              { label: "Category", value: payload.category },
              { label: "Account", value: account.name },
              { label: "Date", value: format(new Date(payload.date), "MMM dd, yyyy") },
            ],
          }),
        ],
        mutations: [makeMutation("transactions", "create", payload.id)],
      }
    }

    case "update_transaction": {
      const normalized = normalizeUpdateTransactionInput(toolCall.input)
      if (!normalized) return executeError("transactionId is required to update transaction")
      const { transactionId, updates } = normalized

      const response = await transactionsPUT(buildRequest("/api/transactions", "PUT", {
        id: transactionId,
        ...updates,
      }))
      const payload = await toJson<{ id: string; description: string; amount: number; type: string; category: string; error?: string }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to update transaction"))
      }

      return {
        execution: {
          tool: "update_transaction",
          status: "success",
          summary: `Updated transaction "${payload.description}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "transaction",
            title: "Transaction Updated",
            status: "updated",
            entityId: payload.id,
            fields: [
              { label: "Description", value: payload.description },
              { label: "Amount", value: toCurrency(Math.abs(payload.amount)) },
              { label: "Type", value: payload.type },
              { label: "Category", value: payload.category },
            ],
          }),
        ],
        mutations: [makeMutation("transactions", "update", payload.id)],
      }
    }

    case "delete_transaction": {
      const transactionId = typeof toolCall.input.transactionId === "string" ? toolCall.input.transactionId : ""
      const description = typeof toolCall.input.description === "string" ? toolCall.input.description.trim().toLowerCase() : ""

      const resolvedTransaction = transactionId
        ? context.transactions.find(item => item.id === transactionId)
        : description
          ? context.transactions.find(item => item.description.trim().toLowerCase() === description)
          : null

      if (!resolvedTransaction) return executeError("Transaction not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: {
            tool: "delete_transaction",
            status: "error",
            summary: `Confirmation required to delete transaction "${resolvedTransaction.description}"`,
          },
          cards: [
            buildDeleteConfirmationCard(toolCall, [
              `Description: ${resolvedTransaction.description}`,
              `Amount: ${toCurrency(Math.abs(resolvedTransaction.amount))}`,
              `Category: ${resolvedTransaction.category}`,
            ]),
          ],
        }
      }

      const response = await transactionsDELETE(buildRequest("/api/transactions", "DELETE", { id: resolvedTransaction.id }))
      const payload = await toJson<{ success?: boolean; error?: string }>(response)
      if (!response.ok) {
        return executeError(getErrorFromApiPayload(payload, "Unable to delete transaction"))
      }

      return {
        execution: {
          tool: "delete_transaction",
          status: "success",
          summary: `Deleted transaction "${resolvedTransaction.description}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "transaction",
            title: "Transaction Deleted",
            status: "deleted",
            entityId: resolvedTransaction.id,
            fields: [
              { label: "Description", value: resolvedTransaction.description },
              { label: "Amount", value: toCurrency(Math.abs(resolvedTransaction.amount)) },
              { label: "Category", value: resolvedTransaction.category },
            ],
          }),
        ],
        mutations: [makeMutation("transactions", "delete", resolvedTransaction.id)],
      }
    }

    case "create_transaction_from_template": {
      const templateId = typeof toolCall.input.templateId === "string" ? toolCall.input.templateId : ""
      const templateName = typeof toolCall.input.templateName === "string" ? toolCall.input.templateName.trim() : ""
      const overrides = typeof toolCall.input.overrides === "object" && toolCall.input.overrides
        ? toolCall.input.overrides as Record<string, unknown>
        : {}

      const template = templateId
        ? await prisma.transactionTemplate.findFirst({
            where: { id: templateId, userId },
          })
        : templateName
          ? await prisma.transactionTemplate.findFirst({
              where: { userId, name: { equals: templateName, mode: "insensitive" } },
            })
          : null

      if (!template) return executeError("Template not found for transaction creation")

      const accountId = typeof overrides.accountId === "string"
        ? overrides.accountId
        : template.accountId || context.accounts[0]?.id

      if (!accountId) return executeError("No account available for template transaction")

      const amount = typeof overrides.amount === "number"
        ? Math.abs(overrides.amount)
        : template.amount ? Math.abs(template.amount) : 0

      if (!amount) return executeError("Template transaction requires an amount")

      const type = overrides.type === "income" || overrides.type === "expense"
        ? overrides.type
        : template.type

      const category = typeof overrides.category === "string"
        ? overrides.category
        : template.category

      const description = typeof overrides.description === "string" && overrides.description.trim()
        ? overrides.description
        : template.description || template.name

      const response = await transactionsPOST(buildRequest("/api/transactions", "POST", {
        description,
        amount,
        date: typeof overrides.date === "string" ? overrides.date : new Date().toISOString(),
        category,
        type,
        accountId,
        party: typeof overrides.party === "string" ? overrides.party : template.party,
        notes: typeof overrides.notes === "string" ? overrides.notes : template.notes,
        tags: Array.isArray(overrides.tags) ? overrides.tags : template.tags,
      }))
      const payload = await toJson<{
        id: string
        description: string
        amount: number
        type: string
        category: string
        error?: string
      }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to create transaction from template"))
      }

      return {
        execution: {
          tool: "create_transaction_from_template",
          status: "success",
          summary: `Created transaction from template "${template.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "transaction",
            title: "Transaction Added From Template",
            status: "created",
            entityId: payload.id,
            fields: [
              { label: "Template", value: template.name },
              { label: "Description", value: payload.description },
              { label: "Amount", value: toCurrency(Math.abs(payload.amount)) },
              { label: "Category", value: payload.category },
              { label: "Type", value: payload.type },
            ],
          }),
        ],
        mutations: [makeMutation("transactions", "create", payload.id)],
      }
    }

    case "view_budgets": {
      const response = await budgetsGET()
      const payload = await toJson<Array<{
        id: string
        name: string
        isActive: boolean
        totalAllocated: number
        totalSpent: number
      }> | { error?: string }>(response)

      if (!response.ok || !payload || !Array.isArray(payload)) {
        return executeError(getErrorFromApiPayload(payload, "Unable to load budgets"))
      }

      const includeInactive = Boolean(toolCall.input.includeInactive)
      const filtered = payload.filter(item => includeInactive || item.isActive)
      const limit = typeof toolCall.input.limit === "number" ? Math.max(1, Math.min(10, Math.round(toolCall.input.limit))) : 6
      const selected = filtered.slice(0, limit)

      return {
        execution: {
          tool: "view_budgets",
          status: "success",
          summary: `Loaded ${selected.length} budget(s)`,
        },
        cards: selected.map(item => {
          const remaining = item.totalAllocated - item.totalSpent
          const usagePercent = item.totalAllocated > 0 ? (item.totalSpent / item.totalAllocated) * 100 : 0
          return {
            type: "budget" as const,
            budgetId: item.id,
            name: item.name,
            allocated: item.totalAllocated,
            spent: item.totalSpent,
            remaining,
            usagePercent,
          }
        }),
      }
    }

    case "create_budget": {
      const name = typeof toolCall.input.name === "string" ? toolCall.input.name.trim() : ""
      const totalAllocated = typeof toolCall.input.totalAllocated === "number" ? toolCall.input.totalAllocated : 0
      const type = toolCall.input.type === "monthly" || toolCall.input.type === "event" || toolCall.input.type === "trip"
        ? toolCall.input.type
        : "monthly"

      if (!name || totalAllocated <= 0) {
        return executeError("Budget requires a name and totalAllocated > 0")
      }

      const response = await budgetsPOST(buildRequest("/api/budgets", "POST", {
        ...toolCall.input,
        name,
        type,
        totalAllocated,
      }))
      const payload = await toJson<{
        id: string
        name: string
        totalAllocated: number
        totalSpent: number
        error?: string
      }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to create budget"))
      }

      const remaining = payload.totalAllocated - payload.totalSpent
      const usagePercent = payload.totalAllocated > 0 ? (payload.totalSpent / payload.totalAllocated) * 100 : 0

      return {
        execution: {
          tool: "create_budget",
          status: "success",
          summary: `Created budget "${payload.name}"`,
        },
        cards: [
          {
            type: "budget",
            budgetId: payload.id,
            name: payload.name,
            allocated: payload.totalAllocated,
            spent: payload.totalSpent,
            remaining,
            usagePercent,
          },
        ],
        mutations: [makeMutation("budgets", "create", payload.id)],
      }
    }

    case "update_budget": {
      const budgetId = typeof toolCall.input.budgetId === "string" ? toolCall.input.budgetId : ""
      const budgetName = typeof toolCall.input.budgetName === "string" ? toolCall.input.budgetName.trim() : ""
      const updates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}

      const resolvedBudgetId = budgetId || context.budgets.find(item => item.name.toLowerCase() === budgetName.toLowerCase())?.id
      if (!resolvedBudgetId) return executeError("Budget not found")

      const response = await budgetsPUT(buildRequest("/api/budgets", "PUT", {
        id: resolvedBudgetId,
        ...updates,
      }))
      const payload = await toJson<{
        id: string
        name: string
        totalAllocated: number
        totalSpent: number
        error?: string
      }>(response)

      if (!response.ok || !payload) {
        return executeError(getErrorFromApiPayload(payload, "Unable to update budget"))
      }

      const remaining = payload.totalAllocated - payload.totalSpent
      const usagePercent = payload.totalAllocated > 0 ? (payload.totalSpent / payload.totalAllocated) * 100 : 0

      return {
        execution: {
          tool: "update_budget",
          status: "success",
          summary: `Updated budget "${payload.name}"`,
        },
        cards: [
          {
            type: "budget",
            budgetId: payload.id,
            name: payload.name,
            allocated: payload.totalAllocated,
            spent: payload.totalSpent,
            remaining,
            usagePercent,
          },
        ],
        mutations: [makeMutation("budgets", "update", payload.id)],
      }
    }

    case "delete_budget": {
      const budgetId = typeof toolCall.input.budgetId === "string" ? toolCall.input.budgetId : ""
      const budgetName = typeof toolCall.input.budgetName === "string" ? toolCall.input.budgetName.trim() : ""
      const resolvedBudget = budgetId
        ? context.budgets.find(item => item.id === budgetId)
        : context.budgets.find(item => item.name.toLowerCase() === budgetName.toLowerCase())

      if (!resolvedBudget) return executeError("Budget not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: {
            tool: "delete_budget",
            status: "error",
            summary: `Confirmation required to delete budget "${resolvedBudget.name}"`,
          },
          cards: [
            buildDeleteConfirmationCard(toolCall, [
              `Budget: ${resolvedBudget.name}`,
              `Allocated: ${toCurrency(resolvedBudget.totalAllocated)}`,
              `Spent: ${toCurrency(resolvedBudget.totalSpent)}`,
            ]),
          ],
        }
      }

      const response = await budgetsDELETE(buildRequest("/api/budgets", "DELETE", { id: resolvedBudget.id }))
      const payload = await toJson<{ success?: boolean; error?: string }>(response)
      if (!response.ok) {
        return executeError(getErrorFromApiPayload(payload, "Unable to delete budget"))
      }

      return {
        execution: {
          tool: "delete_budget",
          status: "success",
          summary: `Deleted budget "${resolvedBudget.name}"`,
        },
        cards: [
          buildEntityCard({
            entityType: "budget",
            title: "Budget Deleted",
            status: "deleted",
            entityId: resolvedBudget.id,
            fields: [
              { label: "Name", value: resolvedBudget.name },
              { label: "Allocated", value: toCurrency(resolvedBudget.totalAllocated) },
              { label: "Spent", value: toCurrency(resolvedBudget.totalSpent) },
            ],
          }),
        ],
        mutations: [makeMutation("budgets", "delete", resolvedBudget.id)],
      }
    }

    case "view_budget_snapshot": {
      const includeInactive = Boolean(toolCall.input.includeInactive)
      const response = await budgetsGET()
      const payload = await toJson<Array<{
        id: string
        name: string
        isActive: boolean
        totalAllocated: number
        totalSpent: number
      }> | { error?: string }>(response)

      if (!response.ok || !payload || !Array.isArray(payload)) {
        return executeError(getErrorFromApiPayload(payload, "Unable to load budget snapshot"))
      }

      const selected = payload
        .filter(item => includeInactive || item.isActive)
        .slice(0, 5)

      if (selected.length === 0) {
        return {
          execution: {
            tool: "view_budget_snapshot",
            status: "success",
            summary: "No budgets available for snapshot",
          },
          cards: [
            {
              type: "text",
              title: "Budget Snapshot",
              body: "No matching budgets found.",
            },
          ],
        }
      }

      return {
        execution: {
          tool: "view_budget_snapshot",
          status: "success",
          summary: `Loaded ${selected.length} budget(s)`,
        },
        cards: selected.map(item => {
          const remaining = item.totalAllocated - item.totalSpent
          const usagePercent = item.totalAllocated > 0 ? (item.totalSpent / item.totalAllocated) * 100 : 0
          return {
            type: "budget" as const,
            budgetId: item.id,
            name: item.name,
            allocated: item.totalAllocated,
            spent: item.totalSpent,
            remaining,
            usagePercent,
          }
        }),
      }
    }

    case "clear_core_data": {
      const include = Array.isArray(toolCall.input.include)
        ? toolCall.input.include.filter((item): item is string => typeof item === "string")
        : ["accounts", "transactions", "categories", "parties", "templates", "budgets"]
      const includeSet = new Set(include)
      const includeAccounts = includeSet.has("accounts")
      const includeCategories = includeSet.has("categories")

      // Keep data graph consistent: clearing accounts/categories without transactions leaves orphan semantic records.
      if (includeAccounts || includeCategories) {
        includeSet.add("transactions")
      }

      if (includeSet.size === 0) {
        return executeError("No data groups selected for cleanup")
      }

      const transactionCount = includeSet.has("transactions") ? context.transactions.length : 0
      const templateCount = includeSet.has("templates") ? context.templates.length : 0
      const budgetCount = includeSet.has("budgets") ? context.budgets.length : 0
      const categoryCount = includeSet.has("categories") ? context.categories.length : 0
      const partyCount = includeSet.has("parties") ? context.parties.length : 0
      const accountCount = includeSet.has("accounts") ? context.accounts.length : 0

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: {
            tool: "clear_core_data",
            status: "error",
            summary: "Confirmation required before clearing workspace data",
          },
          cards: [
            {
              type: "confirm",
              title: "Clear CORE workspace",
              body: "Saathi will remove the selected data groups and dependent records. This cannot be undone.",
              riskLevel: "high",
              preview: [
                `Transactions: ${transactionCount}`,
                `Templates: ${templateCount}`,
                `Budgets: ${budgetCount}`,
                `Categories: ${categoryCount}`,
                `Parties: ${partyCount}`,
                `Accounts: ${accountCount}`,
                ...(includeAccounts || includeCategories
                  ? ["Dependency rule: Transactions are included because accounts/categories are selected"]
                  : []),
              ],
              confirmToolRequests: [
                {
                  ...toolCall,
                  input: {
                    ...toolCall.input,
                    include: [...includeSet],
                    confirm: true,
                  },
                },
              ],
              suggestChangesPrompt: "Suggest a safer partial cleanup plan.",
              cancelSuggestedPrompt: "Cancel this cleanup action.",
            },
          ],
        }
      }

      const deleted = await prisma.$transaction(async tx => {
        const summary = {
          transactions: 0,
          templates: 0,
          budgets: 0,
          categories: 0,
          parties: 0,
          accounts: 0,
        }

        if (includeSet.has("transactions")) {
          const res = await tx.transaction.deleteMany({ where: { userId } })
          summary.transactions = res.count
        }

        if (includeSet.has("templates")) {
          const res = await tx.transactionTemplate.deleteMany({ where: { userId } })
          summary.templates = res.count
        }

        if (includeSet.has("budgets")) {
          const res = await tx.budget.deleteMany({ where: { userId } })
          summary.budgets = res.count
        }

        if (includeSet.has("categories")) {
          const res = await tx.category.deleteMany({ where: { userId } })
          summary.categories = res.count
        }

        if (includeSet.has("parties")) {
          const res = await tx.party.deleteMany({ where: { userId } })
          summary.parties = res.count
        }

        if (includeSet.has("accounts")) {
          const res = await tx.financialAccount.deleteMany({ where: { userId } })
          summary.accounts = res.count
        }

        return summary
      })

      const summaryLines = [
        `Transactions removed: ${deleted.transactions}`,
        `Templates removed: ${deleted.templates}`,
        `Budgets removed: ${deleted.budgets}`,
        `Categories removed: ${deleted.categories}`,
        `Parties removed: ${deleted.parties}`,
        `Accounts removed: ${deleted.accounts}`,
      ]

      return {
        execution: {
          tool: "clear_core_data",
          status: "success",
          summary: "Core workspace data cleared successfully",
        },
        cards: [
          {
            type: "stats",
            title: "Workspace Cleared",
            stats: summaryLines.map(line => {
              const [label, value] = line.split(":")
              return { label, value: value.trim() }
            }),
          },
        ],
        mutations: [
          ...(includeSet.has("transactions") ? [makeMutation("transactions", "delete")] : []),
          ...(includeSet.has("templates") ? [makeMutation("templates", "delete")] : []),
          ...(includeSet.has("budgets") ? [makeMutation("budgets", "delete")] : []),
          ...(includeSet.has("categories") ? [makeMutation("categories", "delete")] : []),
          ...(includeSet.has("parties") ? [makeMutation("parties", "delete")] : []),
          ...(includeSet.has("accounts") ? [makeMutation("accounts", "delete")] : []),
        ],
      }
    }

    default:
      return executeError(`Unsupported tool call: ${toolCall.tool}`)
  }
}

async function executeToolCalls(
  userId: string,
  origin: string,
  toolCalls: SaathiToolCall[],
  context: SaathiChatContext
) {
  const executions: SaathiToolExecution[] = []
  const cards: SaathiCard[] = []
  const mutations: SaathiMutation[] = []

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(userId, origin, toolCall, context)
    executions.push(result.execution)
    cards.push(...result.cards)
    if (result.mutations && result.mutations.length > 0) {
      mutations.push(...result.mutations)
    }
  }

  const dedupedMutations = mutations.filter((item, index, array) => {
    const signature = `${item.resource}|${item.operation}|${item.entityId || ""}`
    return array.findIndex(candidate => `${candidate.resource}|${candidate.operation}|${candidate.entityId || ""}` === signature) === index
  })

  return { executions, cards, mutations: dedupedMutations }
}

function buildPrompt(input: {
  now: Date
  message: string
  coreKnowledge: string
  recentConversation: Array<{ role: "user" | "assistant"; content: string }>
  context: Awaited<ReturnType<typeof fetchChatContext>>
  attachmentSummary: string
}) {
  const thisMonthStart = startOfMonth(input.now)
  const thisMonthEnd = endOfMonth(input.now)

  const normalizedTransactions = input.context.transactions
    .map(tx => ({
      ...tx,
      normalizedDate: normalizeDateValue(tx.date),
    }))
    .filter((tx): tx is TransactionData & { normalizedDate: Date } => tx.normalizedDate !== null)

  const thisMonthTransactions = normalizedTransactions.filter(
    tx => tx.normalizedDate >= thisMonthStart && tx.normalizedDate <= thisMonthEnd
  )
  const thisMonthIncome = thisMonthTransactions
    .filter(tx => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const thisMonthExpenses = thisMonthTransactions
    .filter(tx => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const totalBalance = input.context.accounts.reduce((sum, account) => sum + account.balance, 0)

  const categoryBreakdown = thisMonthTransactions
    .filter(tx => tx.type === "expense")
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount)
      return acc
    }, {} as Record<string, number>)

  const runtimeContext = {
    financialSummary: {
      totalBalance,
      thisMonthIncome,
      thisMonthExpenses,
      thisMonthNet: thisMonthIncome - thisMonthExpenses,
      transactionCount: thisMonthTransactions.length,
      topCategories: Object.entries(categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([category, amount]) => ({ category, amount })),
    },
    accounts: input.context.accounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
    })),
    categories: input.context.categories.map(category => ({
      id: category.id,
      name: category.name,
      type: category.type,
    })),
    parties: input.context.parties.slice(0, 80).map(party => ({
      id: party.id,
      name: party.name,
    })),
    templates: input.context.templates.slice(0, 40).map(template => ({
      id: template.id,
      name: template.name,
      amount: template.amount,
      type: template.type,
      category: template.category,
      accountId: template.accountId,
      party: template.party,
      isActive: template.isActive,
    })),
    budgets: input.context.budgets.slice(0, 30).map(budget => ({
      id: budget.id,
      name: budget.name,
      type: budget.type,
      method: budget.method,
      periodType: budget.periodType,
      totalAllocated: budget.totalAllocated,
      totalSpent: budget.totalSpent,
      warningThreshold: budget.warningThreshold,
      criticalThreshold: budget.criticalThreshold,
      isActive: budget.isActive,
      subBudgets: budget.subBudgets.slice(0, 20),
    })),
    goals: input.context.goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
    })),
    recentInsights: input.context.recentInsights,
    recentTransactions: normalizedTransactions.slice(0, 30).map(tx => ({
      id: tx.id,
      date: tx.normalizedDate.toISOString(),
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      accountId: tx.accountId,
      accountName: tx.accountName,
      party: tx.party,
    })),
  }

  return `
${SAATHI_PERSONALITY_PROMPT}

## Core Product Knowledge
${input.coreKnowledge}

## Card Catalog
${SAATHI_CARD_CATALOG_PROMPT}

## Tool Catalog
${SAATHI_TOOL_CATALOG_PROMPT}

## Output Contract (strict)
Return ONLY valid JSON with this exact shape:
{
  "assistantText": "string",
  "cards": [],
  "toolCalls": []
}

Rules:
- No markdown outside JSON.
- If no cards or tools are needed, use empty arrays.
- For create/update requests, include toolCalls with concrete valid input.
- For delete requests, return a confirm card first and only include delete toolCalls with {"confirm":true} after explicit confirmation.
- Keep replies practical and tied to available data.

## Current Date
${input.now.toISOString()}

## Recent Conversation (last 3 turns)
${JSON.stringify(input.recentConversation, null, 2)}

## Runtime User Context
${JSON.stringify(runtimeContext, null, 2)}

## Attachment Context
${input.attachmentSummary}

## User Message
${input.message}
`.trim()
}

// GET /api/chat - Get chat history
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "50", 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50

    const messages = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.chatHistory,
      keyParts: [`limit=${limit}`],
      revalidateSeconds: 10,
      loader: async () => prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    })

    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error("Error fetching chat history:", error)
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    )
  }
}

// POST /api/chat - Send a message to Saathi
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const bodyRaw = await req.json()
    const parsedBody = ChatPostBodySchema.safeParse(bodyRaw)

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid chat payload" },
        { status: 400 }
      )
    }

    const message = typeof parsedBody.data.message === "string" ? parsedBody.data.message.trim() : ""
    const toolRequests = parsedBody.data.toolRequests || []

    if (!message && toolRequests.length === 0) {
      return NextResponse.json(
        { error: "Message or toolRequests are required" },
        { status: 400 }
      )
    }

    const images = (parsedBody.data.attachments?.images || [])
      .map(cleanDataUrl)
      .filter((item): item is SaathiAttachmentPayload => item !== null)

    const audio = (parsedBody.data.attachments?.audio || [])
      .map(cleanDataUrl)
      .filter((item): item is SaathiAttachmentPayload => item !== null)

    const now = new Date()
    const localRecentConversation = parsedBody.data.recentConversation || []
    const normalizedRecentConversation = normalizeConversationMessages(localRecentConversation)
    const shouldSkipDbHistory = normalizedRecentConversation.length >= MAX_RECENT_CONVERSATION_MESSAGES - 1
    const dbRecentMessages = shouldSkipDbHistory
      ? []
      : await prisma.chatMessage.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: MAX_RECENT_CONVERSATION_MESSAGES,
          select: {
            role: true,
            content: true,
            metadata: true,
          },
        })

    const normalizedDbRecentMessages = normalizeConversationMessages(dbRecentMessages.reverse())
    const normalizedHistory = [
      ...normalizeRoleContentMessages(normalizedDbRecentMessages),
      ...normalizeRoleContentMessages(normalizedRecentConversation),
    ].slice(-MAX_RECENT_CONVERSATION_MESSAGES)

    const attachmentsMetadata = {
      images: images.map(item => ({ name: item.name, mimeType: item.mimeType })),
      audio: audio.map(item => ({ name: item.name, mimeType: item.mimeType })),
    }
    const userMessageMetadata: Prisma.InputJsonValue = toolRequests.length > 0
      ? ({
          attachments: attachmentsMetadata,
          toolRequests,
        } as Prisma.InputJsonObject)
      : ({
          attachments: attachmentsMetadata,
        } as Prisma.InputJsonObject)

    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "user",
        content: message || "Saathi action request",
        metadata: userMessageMetadata,
      },
    })

    const attachmentSummary = `
Images: ${images.length}
Audio: ${audio.length}
Image names: ${images.map(item => item.name).join(", ") || "none"}
Audio names: ${audio.map(item => item.name).join(", ") || "none"}
`.trim()

    const origin = new URL(req.url).origin
    const provider = resolveSaathiProvider()
    let generationContext: SaathiChatContext = EMPTY_CONTEXT
    const inferredClearToolCalls: SaathiToolCall[] = toolRequests.length > 0 || !isClearEverythingIntent(message)
      ? []
      : [{
          tool: "clear_core_data",
          rationale: "User requested full workspace cleanup",
          input: {
            include: ["accounts", "transactions", "categories", "parties", "templates", "budgets"],
            confirm: false,
          },
        }]

    let generated = {
      assistantText: "I hit a temporary parsing issue, but I can still help. Please retry or rephrase in one line.",
      cards: [] as SaathiCard[],
      toolCalls: [] as SaathiToolCall[],
    }

    if (toolRequests.length === 0 && inferredClearToolCalls.length === 0) {
      const generationResources = getGenerationContextResources(message || "")
      const [context, coreKnowledge] = await Promise.all([
        fetchChatContext(user.id, now, {
          resources: generationResources,
          includeRuntimeSlices: true,
        }),
        getSaathiCoreKnowledge(),
      ])
      generationContext = context

      const prompt = buildPrompt({
        now,
        message: message || "Execute requested actions from current context.",
        coreKnowledge,
        recentConversation: normalizedHistory,
        context,
        attachmentSummary,
      })

      try {
        generated = await generateSaathiResponse({
          provider,
          prompt,
          images,
          audio,
        })
      } catch (error) {
        console.error("Structured generation failed:", error)
      }
    } else if (inferredClearToolCalls.length > 0) {
      generated = {
        assistantText: "I prepared a confirmation card with the exact cleanup summary. Review it before proceeding.",
        cards: [],
        toolCalls: inferredClearToolCalls,
      }
    }

    const inferredToolCalls = toolRequests.length > 0 || inferredClearToolCalls.length > 0
      ? []
      : buildDraftToolCallsFromConversation(message, [
          ...normalizedDbRecentMessages,
          ...normalizedRecentConversation,
        ])
    const selectedToolCalls = (toolRequests.length > 0
      ? toolRequests
      : inferredClearToolCalls.length > 0
        ? inferredClearToolCalls
        : (generated.toolCalls.length > 0 ? generated.toolCalls : inferredToolCalls)
    ).slice(0, 8)

    let toolCalls = selectedToolCalls
    let blockedGeneratedToolCalls: GeneratedToolBlock[] = []

    if (toolRequests.length === 0 && inferredClearToolCalls.length === 0 && generated.toolCalls.length > 0) {
      const preflight = preflightGeneratedToolCalls(toolCalls)
      toolCalls = preflight.executableToolCalls
      blockedGeneratedToolCalls = preflight.blockedToolCalls
    }

    const shouldFetchToolContext = toolCalls.length > 0 && (toolRequests.length > 0 || generationContext === EMPTY_CONTEXT)
    const toolContext = toolCalls.length === 0
      ? EMPTY_CONTEXT
      : shouldFetchToolContext
        ? await fetchChatContext(user.id, now, {
            resources: getRequiredContextResourcesForTools(toolCalls),
            includeRuntimeSlices: false,
          })
        : generationContext
    const toolResults = await executeToolCalls(user.id, origin, toolCalls, toolContext)

    const combinedCards = sanitizeCards(
      reconcileGeneratedCards([...generated.cards, ...toolResults.cards], toolResults.executions)
    ).slice(0, 10)
    const toolSummaryLines = toolResults.executions.map(
      execution => `${execution.status === "success" ? "Completed" : "Failed"} ${execution.tool}: ${execution.summary}`
    )

    const generatedText = toolRequests.length > 0
      ? "Executed your requested draft changes."
      : toolResults.executions.length === 0 && /\b(created|recorded|added|updated|saved)\b/i.test(generated.assistantText)
        ? `I prepared drafts but did not execute any data changes yet.\n\n${generated.assistantText}`
        : generated.assistantText

    const heldToolLines = blockedGeneratedToolCalls.map(
      blocked => `Held ${blocked.tool}: ${blocked.reason}`
    )

    const finalText = [
      generatedText,
      heldToolLines.length > 0 ? heldToolLines.join("\n") : null,
      toolSummaryLines.length > 0 ? toolSummaryLines.join("\n") : null,
    ].filter((item): item is string => Boolean(item)).join("\n\n")

    const metadataCandidate: SaathiAssistantMetadata = {
      uiVersion: "v2",
      provider,
      cards: combinedCards,
      executedTools: toolResults.executions,
      mutations: toolResults.mutations,
    }
    const metadataParse = SaathiAssistantMetadataSchema.safeParse(metadataCandidate)
    const metadata = metadataParse.success
      ? metadataParse.data
      : {
          uiVersion: "v2" as const,
          provider,
          cards: combinedCards,
          executedTools: [],
          mutations: [],
        }

    if (!metadataParse.success) {
      console.warn("Invalid Saathi assistant metadata. Falling back to safe metadata.", metadataParse.error.flatten())
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: finalText,
        metadata: metadata as Prisma.InputJsonValue,
      },
    })

    const invalidateScopes = new Set<UserCacheScope>([USER_CACHE_SCOPES.chatHistory])
    if (toolResults.mutations.length > 0) {
      invalidateScopes.add(USER_CACHE_SCOPES.chatContext)
      for (const mutation of toolResults.mutations) {
        for (const scope of mutation.cacheScopes) {
          invalidateScopes.add(scope)
        }
      }
    }
    invalidateUserCache(user.id, [...invalidateScopes])

    return NextResponse.json({
      message: assistantMessage,
      userMessage,
    })
  } catch (error) {
    console.error("Error processing chat message:", error)
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}

// DELETE /api/chat - Clear chat history
export async function DELETE() {
  try {
    const user = await requireAuth()

    await prisma.chatMessage.deleteMany({
      where: { userId: user.id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.chatHistory])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing chat history:", error)
    return NextResponse.json(
      { error: "Failed to clear chat history" },
      { status: 500 }
    )
  }
}
