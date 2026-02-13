import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import { POST as categoriesPOST } from "@/app/api/categories/route"
import { POST as partiesPOST } from "@/app/api/parties/route"
import { POST as templatesPOST, PUT as templatesPUT } from "@/app/api/templates/route"
import { GET as budgetsGET, POST as budgetsPOST, PUT as budgetsPUT } from "@/app/api/budgets/route"
import { POST as transactionsPOST, PUT as transactionsPUT } from "@/app/api/transactions/route"
import { SAATHI_PERSONALITY_PROMPT } from "@/lib/saathi/personality"
import { SAATHI_CARD_CATALOG_PROMPT } from "@/lib/saathi/cards"
import { SAATHI_TOOL_CATALOG_PROMPT } from "@/lib/saathi/tools"
import { getSaathiCoreKnowledge } from "@/lib/saathi/core-knowledge"
import { generateSaathiResponse, type SaathiAttachmentPayload, type SaathiProvider } from "@/lib/saathi/providers"
import {
  SaathiAssistantMetadataSchema,
  SaathiToolCallSchema,
  type SaathiAssistantMetadata,
  type SaathiCard,
  type SaathiToolCall,
  type SaathiToolExecution,
} from "@/lib/saathi/schema"

interface FinancialAccountData {
  id: string
  name: string
  type: string
  balance: number
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
}

interface ConversationMessageWithMetadata {
  role: "user" | "assistant"
  content: string
  metadata?: unknown
}

const MAX_RECENT_CONVERSATION_MESSAGES = 6
const MAX_ATTACHMENTS_PER_TYPE = 3
const MAX_ATTACHMENT_DATA_URL_LENGTH = 8_000_000

const LocalConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  metadata: z.object({
    cards: z.array(z.unknown()).max(6).optional(),
    executedTools: z.array(z.unknown()).max(6).optional(),
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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

  return toolCalls.slice(0, 4)
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

function buildEntityCard(input: {
  entityType: "party" | "category" | "template" | "transaction" | "budget"
  title: string
  status: "info" | "draft" | "created" | "updated" | "error"
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

async function fetchChatContext(userId: string, now: Date) {
  const monthKey = format(now, "yyyy-MM")

  return getCachedUserData({
    userId,
    scope: USER_CACHE_SCOPES.chatContext,
    keyParts: [monthKey],
    revalidateSeconds: 30,
    loader: async () => {
      const [accounts, transactions, budgets, goals, recentInsights, categories, parties, templates] = await Promise.all([
        prisma.financialAccount.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            type: true,
            balance: true,
          },
          orderBy: { name: "asc" },
        }) as Promise<FinancialAccountData[]>,
        prisma.transaction.findMany({
          where: {
            userId,
            date: { gte: subMonths(now, 3) },
          },
          orderBy: { date: "desc" },
          take: 120,
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
        }))) as Promise<TransactionData[]>,
        prisma.budget.findMany({
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
        }) as Promise<BudgetData[]>,
        prisma.goal.findMany({
          where: { userId, isActive: true },
          select: {
            id: true,
            name: true,
            currentAmount: true,
            targetAmount: true,
          },
          orderBy: { createdAt: "desc" },
        }) as Promise<GoalData[]>,
        prisma.insight.findMany({
          where: { userId, isArchived: false },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            title: true,
            description: true,
          },
        }) as Promise<InsightData[]>,
        prisma.category.findMany({
          where: { userId },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
          },
        }) as Promise<CategoryData[]>,
        prisma.party.findMany({
          where: { userId },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }) as Promise<PartyData[]>,
        prisma.transactionTemplate.findMany({
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
        }) as Promise<TemplateData[]>,
      ])

      return { accounts, transactions, budgets, goals, recentInsights, categories, parties, templates }
    },
  })
}

async function executeToolCall(
  userId: string,
  origin: string,
  toolCall: SaathiToolCall,
  context: Awaited<ReturnType<typeof fetchChatContext>>
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
  })

  const buildRequest = (path: string, method: "GET" | "POST" | "PUT", payload?: unknown) =>
    new NextRequest(`${origin}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    })

  switch (toolCall.tool) {
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
      }
    }

    case "update_transaction": {
      const transactionId = typeof toolCall.input.transactionId === "string" ? toolCall.input.transactionId : ""
      const updates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}

      if (!transactionId) return executeError("transactionId is required to update transaction")

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

    default:
      return executeError(`Unsupported tool call: ${toolCall.tool}`)
  }
}

async function executeToolCalls(
  userId: string,
  origin: string,
  toolCalls: SaathiToolCall[],
  context: Awaited<ReturnType<typeof fetchChatContext>>
) {
  const executions: SaathiToolExecution[] = []
  const cards: SaathiCard[] = []

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(userId, origin, toolCall, context)
    executions.push(result.execution)
    cards.push(...result.cards)
  }

  return { executions, cards }
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
    const dbRecentMessages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_RECENT_CONVERSATION_MESSAGES,
      select: {
        role: true,
        content: true,
        metadata: true,
      },
    })

    const localRecentConversation = parsedBody.data.recentConversation || []
    const normalizedRecentConversation = normalizeConversationMessages(localRecentConversation)
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

    const [context, coreKnowledge] = await Promise.all([
      fetchChatContext(user.id, now),
      getSaathiCoreKnowledge(),
    ])

    const attachmentSummary = `
Images: ${images.length}
Audio: ${audio.length}
Image names: ${images.map(item => item.name).join(", ") || "none"}
Audio names: ${audio.map(item => item.name).join(", ") || "none"}
`.trim()

    const origin = new URL(req.url).origin
    const provider = resolveSaathiProvider()

    let generated = {
      assistantText: "I hit a temporary parsing issue, but I can still help. Please retry or rephrase in one line.",
      cards: [] as SaathiCard[],
      toolCalls: [] as SaathiToolCall[],
    }

    if (toolRequests.length === 0) {
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
    }

    const inferredToolCalls = toolRequests.length > 0
      ? []
      : buildDraftToolCallsFromConversation(message, [
          ...normalizedDbRecentMessages,
          ...normalizedRecentConversation,
        ])
    const toolCalls = (toolRequests.length > 0
      ? toolRequests
      : (generated.toolCalls.length > 0 ? generated.toolCalls : inferredToolCalls)
    ).slice(0, 8)
    const toolResults = await executeToolCalls(user.id, origin, toolCalls, context)

    const combinedCards = reconcileGeneratedCards([...generated.cards, ...toolResults.cards], toolResults.executions).slice(0, 10)
    const toolSummaryLines = toolResults.executions.map(
      execution => `${execution.status === "success" ? "Completed" : "Failed"} ${execution.tool}: ${execution.summary}`
    )

    const generatedText = toolRequests.length > 0
      ? "Executed your requested draft changes."
      : toolResults.executions.length === 0 && /\b(created|recorded|added|updated|saved)\b/i.test(generated.assistantText)
        ? `I prepared drafts but did not execute any data changes yet.\n\n${generated.assistantText}`
        : generated.assistantText

    const finalText = toolSummaryLines.length > 0
      ? `${generatedText}\n\n${toolSummaryLines.join("\n")}`
      : generatedText

    const metadataCandidate: SaathiAssistantMetadata = {
      uiVersion: "v1",
      provider,
      cards: combinedCards,
      executedTools: toolResults.executions,
    }
    const metadata = SaathiAssistantMetadataSchema.parse(metadataCandidate)

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: finalText,
        metadata,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.chatHistory, USER_CACHE_SCOPES.chatContext])

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
