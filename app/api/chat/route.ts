import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
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
import { inferSaathiLogOperation, inferSaathiLogResource, getMatchingCardDetailsForLog } from "@/lib/saathi/audit-log"
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

interface ToolExecutionAuditItem {
  tool: string
  operation: string
  resource: string
  status: "success" | "error"
  summary: string
  details: string[]
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

const READ_ONLY_TOOLS = new Set<SaathiToolCall["tool"]>([
  "view_accounts",
  "view_categories",
  "view_parties",
  "view_templates",
  "view_transactions",
  "view_budgets",
  "view_budget_snapshot",
  "view_goals",
  "view_watchlists",
  "view_recurring",
  "view_notifications",
  "view_settlements",
  "view_settlement_groups",
  "view_settings",
  "mark_notifications_read",
])

const MUTATING_TOOLS = new Set<SaathiToolCall["tool"]>([
  "create_account",
  "update_account",
  "delete_account",
  "create_category",
  "update_category",
  "delete_category",
  "create_party",
  "update_party",
  "delete_party",
  "create_template",
  "update_template",
  "delete_template",
  "create_transaction",
  "update_transaction",
  "delete_transaction",
  "create_transaction_from_template",
  "create_budget",
  "update_budget",
  "delete_budget",
  "clear_core_data",
  "create_goal",
  "update_goal",
  "delete_goal",
  "create_watchlist",
  "update_watchlist",
  "delete_watchlist",
  "create_recurring",
  "update_recurring",
  "delete_recurring",
  "create_settlement",
  "update_settlement",
  "delete_settlement",
  "create_settlement_group",
  "update_settings",
])

const SETTLEMENT_CATEGORY_ALIASES = new Set([
  "settlement",
  "settlements",
  "reimbursement",
  "reimbursements",
])

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

function normalizeDateOnlyString(input: string | null): string | null {
  if (!input) return null
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

interface DraftTransactionSnapshot {
  description: string
  amount: number | null
  type: "income" | "expense"
  category: string
  account: string
  date: string | null
  party: string
}

function parseDraftTransactionSnapshot(input: string | null): DraftTransactionSnapshot | null {
  if (!input) return null

  try {
    const parsed = JSON.parse(input) as Record<string, unknown>
    return {
      description: typeof parsed.description === "string" ? parsed.description.trim() : "",
      amount: typeof parsed.amount === "number" && Number.isFinite(parsed.amount)
        ? Math.abs(parsed.amount)
        : null,
      type: parsed.type === "income" ? "income" : "expense",
      category: typeof parsed.category === "string" ? parsed.category.trim() : "",
      account: typeof parsed.account === "string" ? parsed.account.trim() : "",
      date: normalizeDateOnlyString(typeof parsed.date === "string" ? parsed.date : null),
      party: typeof parsed.party === "string" ? parsed.party.trim() : "",
    }
  } catch {
    return null
  }
}

function isSameNormalizedText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function isReadOnlyTool(tool: SaathiToolCall["tool"]): boolean {
  return READ_ONLY_TOOLS.has(tool)
}

function isMutatingTool(tool: SaathiToolCall["tool"]): boolean {
  return MUTATING_TOOLS.has(tool)
}

function findCategoryNameInsensitive(categories: CategoryData[], name: string): string | null {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return null

  const matched = categories.find(category => category.name.trim().toLowerCase() === normalized)
  return matched ? matched.name : null
}

function resolvePreferredSettlementsCategory(categories: CategoryData[]): string {
  const preferred = categories.find(category => category.name.trim().toLowerCase() === "settlements")
  if (preferred) return preferred.name

  const fallback = categories.find(category => category.name.trim().toLowerCase() === "settlement")
  if (fallback) return fallback.name

  return "settlements"
}

function isSettlementLike(value: string): boolean {
  return SETTLEMENT_CATEGORY_ALIASES.has(value.trim().toLowerCase())
}

function normalizeSettlementCategory(params: {
  category: string
  type: "income" | "expense"
  description: string
  party: string
  categories: CategoryData[]
}): string {
  const category = params.category.trim()
  if (!category) return category

  const normalizedCategory = category.toLowerCase()
  const normalizedDescription = params.description.trim().toLowerCase()
  const normalizedParty = params.party.trim().toLowerCase()
  const settlementIntent = isSettlementLike(normalizedCategory)
    || /\b(settle|settled|reimburse|reimbursed|repay|paid back)\b/.test(normalizedDescription)
    || (params.type === "income" && normalizedDescription.startsWith("from "))
    || (params.type === "income" && Boolean(normalizedParty))

  if (!settlementIntent) return category

  if (isSettlementLike(normalizedCategory)) {
    return findCategoryNameInsensitive(params.categories, resolvePreferredSettlementsCategory(params.categories))
      || resolvePreferredSettlementsCategory(params.categories)
  }

  if (params.type === "income") {
    return findCategoryNameInsensitive(params.categories, resolvePreferredSettlementsCategory(params.categories))
      || resolvePreferredSettlementsCategory(params.categories)
  }

  return category
}

function extractPartyFromDescription(description: string): string {
  const normalized = description.trim()
  if (!normalized) return ""

  const fromMatch = normalized.match(/^(?:received\s+)?from\s+(.+)$/i)
  if (fromMatch && fromMatch[1]) return fromMatch[1].trim()

  const settlementMatch = normalized.match(/^settlement\s+from\s+(.+)$/i)
  if (settlementMatch && settlementMatch[1]) return settlementMatch[1].trim()

  return ""
}

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ")
}

function joinHumanList(items: string[]): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

function normalizeSettlementDescription(params: {
  description: string
  type: "income" | "expense"
  category: string
  party: string
  date: string
  transactions: TransactionData[]
}): string {
  const description = params.description.trim()
  if (!description) return description
  if (params.type !== "income") return description
  if (!isSettlementLike(params.category)) return description

  const fallbackParty = params.party.trim() || extractPartyFromDescription(description)
  if (!fallbackParty) return description
  const normalizedParty = fallbackParty.toLowerCase()

  const genericDescription = new Set([
    "settlement",
    "settlements",
    "reimbursement",
    "reimbursements",
    `from ${normalizedParty}`,
    `received from ${normalizedParty}`,
    `settlement from ${normalizedParty}`,
  ])

  if (!genericDescription.has(description.toLowerCase())) {
    return description
  }

  const paymentDate = normalizeDateValue(params.date) || new Date()
  const relatedDescriptors = params.transactions
    .map(transaction => ({
      ...transaction,
      parsedDate: normalizeDateValue(transaction.date),
    }))
    .filter((transaction): transaction is TransactionData & { parsedDate: Date } => transaction.parsedDate !== null)
    .filter(transaction => transaction.type === "expense")
    .filter(transaction => {
      const byPartyField = (transaction.party || "").trim().toLowerCase() === normalizedParty
      const byDescription = transaction.description.trim().toLowerCase().includes(normalizedParty)
      if (!byPartyField && !byDescription) return false
      if (transaction.parsedDate > paymentDate) return false
      const millis = paymentDate.getTime() - transaction.parsedDate.getTime()
      const dayDiff = Math.floor(millis / (1000 * 60 * 60 * 24))
      return dayDiff >= 0 && dayDiff <= 14
    })
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
    .slice(-3)
    .map(transaction => `${format(transaction.parsedDate, "EEEE")} ${transaction.category.toLowerCase()}`)

  const uniqueDescriptors = [...new Set(relatedDescriptors)]
  const displayParty = toTitleCase(fallbackParty)

  if (uniqueDescriptors.length === 0) {
    return `Settlement received from ${displayParty}`
  }

  return `Settlement received from ${displayParty} for ${joinHumanList(uniqueDescriptors)}`
}

function buildToolCallSignature(toolCall: SaathiToolCall): string {
  return `${toolCall.tool}|${JSON.stringify(toolCall.input)}`
}

function withNormalizedDeleteConfirmInput(toolCall: SaathiToolCall): SaathiToolCall {
  if (toolCall.tool.startsWith("delete_") || toolCall.tool === "clear_core_data") {
    return {
      ...toolCall,
      input: {
        ...toolCall.input,
        confirm: true,
      },
    }
  }

  return toolCall
}

function buildGenericMutationConfirmationCard(toolCall: SaathiToolCall, preview: string[]): SaathiCard {
  const normalized = withNormalizedDeleteConfirmInput(toolCall)
  const title = toolCall.tool.startsWith("update_")
    ? "Review and confirm update"
    : toolCall.tool.startsWith("delete_") || toolCall.tool === "clear_core_data"
      ? "Confirm destructive action"
      : "Review and confirm action"

  const body = toolCall.tool.startsWith("delete_") || toolCall.tool === "clear_core_data"
    ? "This action may remove data. Confirm to continue."
    : "Please confirm this change before Saathi applies it."

  return {
    type: "confirm",
    title,
    body,
    riskLevel: toolCall.tool.startsWith("delete_") || toolCall.tool === "clear_core_data" ? "high" : "medium",
    preview,
    confirmToolRequests: [normalized],
    cancelSuggestedPrompt: "Cancel this action.",
    suggestChangesPrompt: "Adjust this action before applying.",
  }
}

function buildStagedMutationCards(
  toolCalls: SaathiToolCall[],
  context: SaathiChatContext,
  now: Date
): SaathiCard[] {
  const cards: SaathiCard[] = []
  const seenSignatures = new Set<string>()

  for (const rawToolCall of toolCalls) {
    const toolCall = withNormalizedDeleteConfirmInput(rawToolCall)
    const signature = buildToolCallSignature(toolCall)
    if (seenSignatures.has(signature)) continue
    seenSignatures.add(signature)

    if (toolCall.tool === "create_transaction") {
      const amount = typeof toolCall.input.amount === "number" ? Math.abs(toolCall.input.amount) : 0
      const type = toolCall.input.type === "income" || toolCall.input.type === "expense"
        ? toolCall.input.type
        : "expense"
      const party = typeof toolCall.input.party === "string" ? toolCall.input.party.trim() : ""
      const categoryInput = typeof toolCall.input.category === "string" ? toolCall.input.category : ""
      const descriptionInput = typeof toolCall.input.description === "string" ? toolCall.input.description : ""
      const date = typeof toolCall.input.date === "string" ? toolCall.input.date : now.toISOString()
      const parsedDate = normalizeDateValue(date) || now
      const category = normalizeSettlementCategory({
        category: categoryInput,
        type,
        description: descriptionInput,
        party,
        categories: context.categories,
      })
      const description = normalizeSettlementDescription({
        description: descriptionInput,
        type,
        category,
        party,
        date,
        transactions: context.transactions,
      })
      const accountName = typeof toolCall.input.accountName === "string"
        ? toolCall.input.accountName.trim()
        : typeof toolCall.input.accountId === "string"
          ? context.accounts.find(item => item.id === toolCall.input.accountId)?.name || ""
          : ""

      cards.push(withCardNavigationLink(buildEntityCard({
        entityType: "transaction",
        title: "Pending Transaction",
        status: "draft",
        fields: [
          { label: "Description", value: description || "Missing" },
          { label: "Amount", value: amount > 0 ? toCurrency(amount) : "Missing" },
          { label: "Type", value: type },
          { label: "Category", value: category || "Missing" },
          { label: "Account", value: accountName || "Missing" },
          { label: "Date", value: format(parsedDate, "yyyy-MM-dd") },
          ...(party ? [{ label: "Party", value: party }] : []),
        ],
      }), toolCall.tool))
      continue
    }

    if (toolCall.tool === "update_transaction") {
      const topLevelDescription = typeof toolCall.input.description === "string" ? toolCall.input.description.trim() : ""
      const explicitSelectorDescription =
        typeof toolCall.input.transactionDescription === "string" ? toolCall.input.transactionDescription.trim() : ""
      const explicitSelectorAmount =
        typeof toolCall.input.transactionAmount === "number" ? Math.abs(toolCall.input.transactionAmount) : undefined
      const explicitSelectorDate =
        typeof toolCall.input.transactionDate === "string" ? toolCall.input.transactionDate : undefined
      const explicitSelectorParty =
        typeof toolCall.input.transactionParty === "string" ? toolCall.input.transactionParty : undefined

      const hasTopLevelUpdateFields = ["amount", "type", "category", "accountId", "accountName", "date", "party", "notes", "tags"]
        .some(key => toolCall.input[key] !== undefined)
      const nestedUpdates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}
      const hasNestedDescriptionUpdate = typeof nestedUpdates.description === "string"
      const descriptionActsAsSelector = !toolCall.input.transactionId
        && Boolean(topLevelDescription)
        && hasTopLevelUpdateFields
        && !hasNestedDescriptionUpdate
        && !explicitSelectorDescription

      const normalized = normalizeUpdateTransactionInput(toolCall.input, {
        descriptionActsAsSelector,
      })

      const resolvedTransactionResult = resolveTransactionFromSelectors({
        context,
        transactionId: normalized.transactionId,
        description: explicitSelectorDescription || (descriptionActsAsSelector ? topLevelDescription : ""),
        amount: explicitSelectorAmount,
        date: explicitSelectorDate,
        party: explicitSelectorParty,
      })

      if (!resolvedTransactionResult.transaction) {
        cards.push(withCardNavigationLink(buildEntityCard({
          entityType: "transaction",
          title: "Pending Transaction Update",
          status: "error",
          fields: [
            { label: "Issue", value: resolvedTransactionResult.error || "Unable to resolve transaction for update" },
          ],
        }), toolCall.tool))
        continue
      }

      const resolvedTransaction = resolvedTransactionResult.transaction
      const updates = { ...normalized.updates }
      const currentType = resolvedTransaction.type === "income" ? "income" : "expense"
      const currentParty = (resolvedTransaction.party || "").trim()
      const currentDate = format(normalizeDateValue(resolvedTransaction.date) || now, "yyyy-MM-dd")
      const currentAccountName = context.accounts.find(item => item.id === resolvedTransaction.accountId)?.name
        || resolvedTransaction.accountName
        || "Missing"

      const proposedType = updates.type === "income" || updates.type === "expense"
        ? updates.type
        : currentType
      const proposedAmount = typeof updates.amount === "number" && Number.isFinite(updates.amount) && Math.abs(updates.amount) > 0
        ? Math.abs(updates.amount)
        : Math.abs(resolvedTransaction.amount)
      const proposedParty = typeof updates.party === "string"
        ? updates.party.trim()
        : currentParty
      const proposedDate = format(
        normalizeDateValue(typeof updates.date === "string" ? updates.date : currentDate) || (normalizeDateValue(currentDate) || now),
        "yyyy-MM-dd"
      )

      const proposedCategoryInput = typeof updates.category === "string"
        ? updates.category
        : resolvedTransaction.category
      const proposedDescriptionInput = typeof updates.description === "string"
        ? updates.description
        : resolvedTransaction.description
      const normalizedCategory = normalizeSettlementCategory({
        category: proposedCategoryInput,
        type: proposedType,
        description: proposedDescriptionInput,
        party: proposedParty,
        categories: context.categories,
      })
      const normalizedDescription = normalizeSettlementDescription({
        description: proposedDescriptionInput,
        type: proposedType,
        category: normalizedCategory,
        party: proposedParty,
        date: proposedDate,
        transactions: context.transactions,
      })

      let proposedAccountName = currentAccountName
      const accountNameUpdate = typeof updates.accountName === "string" ? updates.accountName.trim() : ""
      if (accountNameUpdate) {
        proposedAccountName = accountNameUpdate
      } else if (typeof updates.accountId === "string" && updates.accountId.trim()) {
        const requestedAccount = updates.accountId.trim()
        const resolvedAccount = context.accounts.find(item => item.id === requestedAccount)
          || context.accounts.find(item => item.name.trim().toLowerCase() === requestedAccount.toLowerCase())
        proposedAccountName = resolvedAccount?.name || requestedAccount
      }

      const changedFields: string[] = []
      if (normalizedDescription !== resolvedTransaction.description.trim()) changedFields.push("description")
      if (Math.abs(proposedAmount - Math.abs(resolvedTransaction.amount)) > 0.0001) changedFields.push("amount")
      if (proposedType !== currentType) changedFields.push("type")
      if (!isSameNormalizedText(normalizedCategory, resolvedTransaction.category)) changedFields.push("category")
      if (!isSameNormalizedText(proposedAccountName, currentAccountName)) changedFields.push("account")
      if (proposedDate !== currentDate) changedFields.push("date")
      if (!isSameNormalizedText(proposedParty, currentParty)) changedFields.push("party")

      const snapshot = JSON.stringify({
        description: resolvedTransaction.description,
        amount: Math.abs(resolvedTransaction.amount),
        type: currentType,
        category: resolvedTransaction.category,
        account: currentAccountName,
        date: currentDate,
        party: currentParty,
      })

      cards.push(withCardNavigationLink(buildEntityCard({
        entityType: "transaction",
        title: "Pending Transaction Update",
        status: "draft",
        entityId: resolvedTransaction.id,
        fields: [
          { label: "Draft Mode", value: "update" },
          { label: "Transaction ID", value: resolvedTransaction.id },
          { label: "Description", value: normalizedDescription || "Missing" },
          { label: "Amount", value: proposedAmount > 0 ? toCurrency(proposedAmount) : "Missing" },
          { label: "Type", value: proposedType },
          { label: "Category", value: normalizedCategory || "Missing" },
          { label: "Account", value: proposedAccountName || "Missing" },
          { label: "Date", value: proposedDate },
          { label: "Party", value: proposedParty || "Missing" },
          { label: "Update Fields", value: changedFields.length > 0 ? changedFields.join(", ") : "none" },
          { label: "Current Snapshot", value: snapshot },
        ],
      }), toolCall.tool))
      continue
    }

    if (toolCall.tool === "create_category") {
      const name = typeof toolCall.input.name === "string" ? toolCall.input.name.trim() : ""
      const type = toolCall.input.type === "income" || toolCall.input.type === "expense" || toolCall.input.type === "both"
        ? toolCall.input.type
        : "expense"

      cards.push(withCardNavigationLink(buildEntityCard({
        entityType: "category",
        title: "Pending Category",
        status: "draft",
        fields: [
          { label: "Name", value: name || "Missing" },
          { label: "Type", value: type },
        ],
      }), toolCall.tool))
      continue
    }

    const preview = [`Tool: ${toolCall.tool}`]
    const namedIdentifier = (
      typeof toolCall.input.accountName === "string" && toolCall.input.accountName.trim()
    ) || (
      typeof toolCall.input.categoryName === "string" && toolCall.input.categoryName.trim()
    ) || (
      typeof toolCall.input.partyName === "string" && toolCall.input.partyName.trim()
    ) || (
      typeof toolCall.input.templateName === "string" && toolCall.input.templateName.trim()
    ) || (
      typeof toolCall.input.budgetName === "string" && toolCall.input.budgetName.trim()
    ) || (
      typeof toolCall.input.description === "string" && toolCall.input.description.trim()
    ) || ""

    if (namedIdentifier) {
      preview.push(`Target: ${namedIdentifier}`)
    }

    if (typeof toolCall.input.amount === "number" && Number.isFinite(toolCall.input.amount)) {
      preview.push(`Amount: ${toCurrency(Math.abs(toolCall.input.amount))}`)
    }

    cards.push(buildGenericMutationConfirmationCard(toolCall, preview))
  }

  return cards
}

function normalizeEntityFieldLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getEntityFieldValue(card: Record<string, unknown>, label: string, aliases: string[] = []): string | null {
  const fields = card.fields
  if (!Array.isArray(fields)) return null

  const labelSet = new Set([label, ...aliases].map(item => normalizeEntityFieldLabel(item)))

  const found = fields.find(field => {
    if (!field || typeof field !== "object") return false
    const candidate = field as { label?: unknown }
    if (typeof candidate.label !== "string") return false
    const normalized = normalizeEntityFieldLabel(candidate.label)
    if (labelSet.has(normalized)) return true
    for (const expected of labelSet) {
      if (normalized.includes(expected) || expected.includes(normalized)) {
        return true
      }
    }
    return false
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
        const candidate = card as { type?: unknown; status?: unknown; confirmToolRequests?: unknown }
        if (candidate.type === "confirm" && Array.isArray(candidate.confirmToolRequests)) return true
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
  const seenSignatures = new Set<string>()

  const confirmCards = cards.filter(card => {
    if (!card || typeof card !== "object") return false
    const candidate = card as { type?: unknown; confirmToolRequests?: unknown }
    return candidate.type === "confirm" && Array.isArray(candidate.confirmToolRequests)
  })

  for (const card of confirmCards) {
    if (!card || typeof card !== "object") continue
    const confirmToolRequests = (card as { confirmToolRequests?: unknown }).confirmToolRequests
    if (!Array.isArray(confirmToolRequests)) continue

    for (const request of confirmToolRequests) {
      const parsed = SaathiToolCallSchema.safeParse(request)
      if (!parsed.success) continue
      const normalized = withNormalizedDeleteConfirmInput(parsed.data)
      const signature = buildToolCallSignature(normalized)
      if (seenSignatures.has(signature)) continue
      seenSignatures.add(signature)
      toolCalls.push(normalized)
    }
  }

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
    seenSignatures.add(buildToolCallSignature(toolCalls[toolCalls.length - 1]))
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
    const draftMode = (getEntityFieldValue(raw, "Draft Mode", ["Mode"]) || "").trim().toLowerCase()
    const description = (getEntityFieldValue(raw, "Description", ["Desc", "Details", "Narration", "Item"]) || "").trim()
    const amount = parseNumericAmount(getEntityFieldValue(raw, "Amount", ["Amt", "Value", "Total", "Cost"]) || "")
    const category = normalizeCategoryValue(getEntityFieldValue(raw, "Category", ["Cat", "Bucket", "Group"]))
    const accountName = normalizeCategoryValue(getEntityFieldValue(raw, "Account", ["Account Name", "Source", "Payment Source", "Payment Method", "Wallet", "Bank"]))
    const party = normalizeCategoryValue(getEntityFieldValue(raw, "Party", ["Payee", "Payer", "Merchant", "Vendor"]))
    const type = normalizeTypeValue(getEntityFieldValue(raw, "Type", ["Direction", "Kind"]))
    const date = normalizeDateString(getEntityFieldValue(raw, "Date", ["Date & Time", "Datetime", "Transaction Date", "When"]))

    if (draftMode === "update") {
      const transactionId = (getEntityFieldValue(raw, "Transaction ID", ["Txn ID", "Tx ID", "ID"]) || "").trim()
      if (!transactionId) continue

      const fallbackSnapshot: DraftTransactionSnapshot = {
        description,
        amount,
        type,
        category: category || "",
        account: accountName || "",
        date: normalizeDateOnlyString(date),
        party: party || "",
      }
      const currentSnapshot = parseDraftTransactionSnapshot(
        getEntityFieldValue(raw, "Current Snapshot", ["Snapshot", "Original Snapshot", "Before Snapshot"])
      ) || fallbackSnapshot
      const proposedDateOnly = normalizeDateOnlyString(date)
      const currentDateOnly = currentSnapshot.date

      const updates: Record<string, unknown> = {}

      if (description && description !== currentSnapshot.description) {
        updates.description = description
      }

      if (amount && (currentSnapshot.amount === null || Math.abs(amount - currentSnapshot.amount) > 0.0001)) {
        updates.amount = amount
      }

      if (type !== currentSnapshot.type) {
        updates.type = type
      }

      if (category && !isSameNormalizedText(category, currentSnapshot.category)) {
        updates.category = category
      }

      if (accountName && !isSameNormalizedText(accountName, currentSnapshot.account)) {
        updates.accountName = accountName
      }

      if (proposedDateOnly && proposedDateOnly !== currentDateOnly) {
        updates.date = new Date(`${proposedDateOnly}T12:00:00.000Z`).toISOString()
      }

      const currentParty = currentSnapshot.party.trim()
      const proposedParty = (party || "").trim()
      if (proposedParty !== currentParty) {
        updates.party = proposedParty
      }

      if (Object.keys(updates).length === 0) continue

      const updateDraftToolCall: SaathiToolCall = {
        tool: "update_transaction",
        rationale: "Confirmed from prior draft update card",
        input: {
          transactionId,
          updates,
        },
      }
      const updateSignature = buildToolCallSignature(updateDraftToolCall)
      if (seenSignatures.has(updateSignature)) continue
      seenSignatures.add(updateSignature)
      toolCalls.push(updateDraftToolCall)
      continue
    }

    if (!description || !amount || !category || !accountName) continue

    const dedupKey = `${description}|${amount}|${category}|${accountName}|${date || ""}|${party || ""}|${type}`
    if (transactionDedup.has(dedupKey)) continue
    transactionDedup.add(dedupKey)

    const draftToolCall: SaathiToolCall = {
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
    }
    const signature = buildToolCallSignature(draftToolCall)
    if (seenSignatures.has(signature)) continue
    seenSignatures.add(signature)
    toolCalls.push(draftToolCall)
  }

  return toolCalls.slice(0, 8)
}

function reconcileGeneratedCards(
  cards: SaathiCard[],
  executions: SaathiToolExecution[]
): SaathiCard[] {
  const hasMutatingSuccess = executions.some(execution => execution.status === "success" && isMutatingTool(execution.tool))
  if (hasMutatingSuccess) return cards

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
    if (toolCall.tool === "create_transaction") {
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
      continue
    }

    if (toolCall.tool === "update_transaction") {
      const transactionId = typeof toolCall.input.transactionId === "string" ? toolCall.input.transactionId.trim() : ""
      const transactionDescription =
        typeof toolCall.input.transactionDescription === "string"
          ? toolCall.input.transactionDescription.trim()
          : ""
      const description = typeof toolCall.input.description === "string" ? toolCall.input.description.trim() : ""
      const hasUpdatesObject = typeof toolCall.input.updates === "object" && toolCall.input.updates !== null
      const hasAnyTopLevelUpdates = ["amount", "type", "category", "accountId", "accountName", "date", "party", "notes", "tags"]
        .some(key => toolCall.input[key] !== undefined)
      const hasSelector = Boolean(transactionId || transactionDescription || description)
      const hasUpdatePayload = hasUpdatesObject || hasAnyTopLevelUpdates || Boolean(description && transactionId)

      if (!hasSelector) {
        blockedToolCalls.push({
          tool: toolCall.tool,
          reason: "Missing selector: provide transactionId or transaction description",
        })
        continue
      }

      if (!hasUpdatePayload) {
        blockedToolCalls.push({
          tool: toolCall.tool,
          reason: "No update fields were provided",
        })
        continue
      }

      executableToolCalls.push(toolCall)
      continue
    }

    executableToolCalls.push(toolCall)
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
    goals: ["goals", "chat-context", "sync-advanced"],
    watchlists: ["watchlists", "chat-context", "sync-advanced"],
    recurring: ["recurring", "chat-context", "sync-advanced"],
    notifications: ["notifications", "chat-context", "sync-advanced"],
    settlements: ["settlements", "chat-context", "sync-advanced"],
    settlement_groups: ["settlements", "chat-context", "sync-advanced"],
    settings: ["settings", "chat-context", "sync-core"],
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

function getToolDefaultCardLink(tool: SaathiToolCall["tool"]): { href: string; hrefLabel: string } | null {
  if (tool === "view_accounts" || tool === "create_account" || tool === "update_account" || tool === "delete_account") {
    return { href: "/settings?tab=accounts", hrefLabel: "Open Accounts" }
  }

  if (tool === "view_categories" || tool === "create_category" || tool === "update_category" || tool === "delete_category") {
    return { href: "/settings?tab=categories", hrefLabel: "Open Categories" }
  }

  if (tool === "view_parties" || tool === "create_party" || tool === "update_party" || tool === "delete_party") {
    return { href: "/settings?tab=parties", hrefLabel: "Open Parties" }
  }

  if (tool === "view_templates" || tool === "create_template" || tool === "update_template" || tool === "delete_template") {
    return { href: "/transactions/templates", hrefLabel: "Open Templates" }
  }

  if (
    tool === "view_transactions" ||
    tool === "create_transaction" ||
    tool === "update_transaction" ||
    tool === "delete_transaction" ||
    tool === "create_transaction_from_template"
  ) {
    return { href: "/transactions/history", hrefLabel: "Open Transactions" }
  }

  if (tool === "view_budgets" || tool === "create_budget" || tool === "update_budget" || tool === "delete_budget" || tool === "view_budget_snapshot") {
    return { href: "/transactions/budget", hrefLabel: "Open Budgets" }
  }

  if (tool === "clear_core_data") {
    return { href: "/settings?tab=saathi-log", hrefLabel: "Open Saathi Log" }
  }

  if (tool === "view_goals" || tool === "create_goal" || tool === "update_goal" || tool === "delete_goal") {
    return { href: "/goals", hrefLabel: "Open Goals" }
  }

  if (tool === "view_watchlists" || tool === "create_watchlist" || tool === "update_watchlist" || tool === "delete_watchlist") {
    return { href: "/watchlists", hrefLabel: "Open Watchlists" }
  }

  if (tool === "view_recurring" || tool === "create_recurring" || tool === "update_recurring" || tool === "delete_recurring") {
    return { href: "/recurring", hrefLabel: "Open Recurring" }
  }

  if (tool === "view_notifications" || tool === "mark_notifications_read") {
    return null
  }

  if (
    tool === "view_settlements" ||
    tool === "create_settlement" ||
    tool === "update_settlement" ||
    tool === "delete_settlement"
  ) {
    return { href: "/settlements", hrefLabel: "Open Settlements" }
  }

  if (tool === "view_settlement_groups" || tool === "create_settlement_group") {
    return { href: "/settlements", hrefLabel: "Open Settlements" }
  }

  if (tool === "view_settings" || tool === "update_settings") {
    return { href: "/settings", hrefLabel: "Open Settings" }
  }

  return null
}

function withCardNavigationLink(card: SaathiCard, sourceTool: SaathiToolCall["tool"]): SaathiCard {
  const existingLink = (card as { href?: unknown }).href
  if (typeof existingLink === "string" && existingLink.trim()) return card

  if (card.type === "confirm" || card.type === "action") return card

  if (card.type === "entity") {
    if (card.entityType === "transaction" && card.entityId) {
      return {
        ...card,
        href: `/transactions/history?transactionId=${encodeURIComponent(card.entityId)}`,
        hrefLabel: "Open in History",
      }
    }

    if (card.entityType === "transaction") {
      return { ...card, href: "/transactions/history", hrefLabel: "Open Transactions" }
    }

    if (card.entityType === "category") {
      return { ...card, href: "/settings?tab=categories", hrefLabel: "Open Categories" }
    }

    if (card.entityType === "party") {
      return { ...card, href: "/settings?tab=parties", hrefLabel: "Open Parties" }
    }

    if (card.entityType === "template") {
      return { ...card, href: "/transactions/templates", hrefLabel: "Open Templates" }
    }

    if (card.entityType === "budget") {
      return { ...card, href: "/transactions/budget", hrefLabel: "Open Budgets" }
    }
  }

  if (card.type === "budget") {
    return { ...card, href: "/transactions/budget", hrefLabel: "Open Budgets" }
  }

  const defaultLink = getToolDefaultCardLink(sourceTool)
  if (!defaultLink) return card

  return {
    ...card,
    href: defaultLink.href,
    hrefLabel: defaultLink.hrefLabel,
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
      CONTEXT_RESOURCES.budgets,
      CONTEXT_RESOURCES.parties
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
    add(CONTEXT_RESOURCES.transactions, CONTEXT_RESOURCES.accounts, CONTEXT_RESOURCES.categories, CONTEXT_RESOURCES.parties)
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
        CONTEXT_RESOURCES.categories,
        CONTEXT_RESOURCES.parties
      )
      return resources
    }

    add(
      CONTEXT_RESOURCES.accounts,
      CONTEXT_RESOURCES.transactions,
      CONTEXT_RESOURCES.categories,
      CONTEXT_RESOURCES.budgets,
      CONTEXT_RESOURCES.parties
    )
  }

  // Ensure transaction form prefill context is almost always available to the model.
  add(
    CONTEXT_RESOURCES.accounts,
    CONTEXT_RESOURCES.categories,
    CONTEXT_RESOURCES.parties
  )

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
      // Milestone 2: no AppContext context needed — these tools hit APIs directly
      case "view_goals":
      case "create_goal":
      case "update_goal":
      case "delete_goal":
      case "view_watchlists":
      case "create_watchlist":
      case "update_watchlist":
      case "delete_watchlist":
      case "view_recurring":
      case "create_recurring":
      case "update_recurring":
      case "delete_recurring":
      case "view_notifications":
      case "mark_notifications_read":
      case "view_settlements":
      case "create_settlement":
      case "update_settlement":
      case "delete_settlement":
      case "view_settlement_groups":
      case "create_settlement_group":
      case "view_settings":
      case "update_settings":
        break
      default:
        break
    }
  }

  return resources
}

function normalizeUpdateTransactionInput(
  input: Record<string, unknown>,
  options?: { descriptionActsAsSelector?: boolean }
): {
  transactionId?: string
  updates: Record<string, unknown>
} {
  const transactionId = typeof input.transactionId === "string" ? input.transactionId : ""

  const updates = typeof input.updates === "object" && input.updates
    ? { ...(input.updates as Record<string, unknown>) }
    : {}

  const topLevelKeys = ["description", "amount", "type", "category", "accountId", "accountName", "date", "party", "notes", "tags"]
  for (const key of topLevelKeys) {
    if (options?.descriptionActsAsSelector && key === "description" && !transactionId) continue
    if (input[key] !== undefined && updates[key] === undefined) {
      updates[key] = input[key]
    }
  }

  if (transactionId) {
    return {
      transactionId,
      updates,
    }
  }

  return { updates }
}

function resolveTransactionFromSelectors(params: {
  context: SaathiChatContext
  transactionId?: string
  description?: string
  amount?: number
  date?: string
  party?: string
}): { transaction: TransactionData | null; error?: string } {
  const byId = (params.transactionId || "").trim()
  if (byId) {
    const transaction = params.context.transactions.find(item => item.id === byId) || null
    if (!transaction) {
      return { transaction: null, error: "Transaction not found for the provided id" }
    }
    return { transaction }
  }

  let candidates = [...params.context.transactions]

  const description = (params.description || "").trim().toLowerCase()
  if (description) {
    const exact = candidates.filter(item => item.description.trim().toLowerCase() === description)
    const partial = exact.length > 0 ? exact : candidates.filter(item => item.description.trim().toLowerCase().includes(description))
    candidates = partial
  }

  if (typeof params.amount === "number" && Number.isFinite(params.amount) && params.amount > 0) {
    const target = Math.abs(params.amount)
    candidates = candidates.filter(item => Math.abs(item.amount) === target)
  }

  const parsedDate = normalizeDateValue(params.date || "")
  if (parsedDate) {
    const targetDay = parsedDate.toISOString().slice(0, 10)
    candidates = candidates.filter(item => {
      const itemDate = normalizeDateValue(item.date)
      return itemDate ? itemDate.toISOString().slice(0, 10) === targetDay : false
    })
  }

  const party = (params.party || "").trim().toLowerCase()
  if (party) {
    candidates = candidates.filter(item => {
      const byPartyField = (item.party || "").trim().toLowerCase() === party
      const byDescription = item.description.trim().toLowerCase().includes(party)
      return byPartyField || byDescription
    })
  }

  if (candidates.length === 1) {
    return { transaction: candidates[0] }
  }

  if (candidates.length === 0) {
    return { transaction: null, error: "Transaction not found. Please share date or amount to narrow it down." }
  }

  return {
    transaction: null,
    error: "Multiple transactions matched. Please share one more detail like amount or date.",
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
      const rawDescription = typeof toolCall.input.description === "string" ? toolCall.input.description.trim() : ""
      const rawCategory = typeof toolCall.input.category === "string" ? toolCall.input.category.trim() : ""
      const type = toolCall.input.type === "income" || toolCall.input.type === "expense"
        ? toolCall.input.type
        : "expense"
      const amount = typeof toolCall.input.amount === "number" ? Math.abs(toolCall.input.amount) : 0
      const rawParty = typeof toolCall.input.party === "string" ? toolCall.input.party.trim() : ""
      const accountIdInput = typeof toolCall.input.accountId === "string" ? toolCall.input.accountId : null
      const accountNameInput = typeof toolCall.input.accountName === "string" ? toolCall.input.accountName : undefined
      const account = accountIdInput
        ? context.accounts.find(item => item.id === accountIdInput) || null
        : findAccountByName(context.accounts, accountNameInput) || context.accounts[0] || null
      const date = typeof toolCall.input.date === "string" ? toolCall.input.date : new Date().toISOString()
      const category = normalizeSettlementCategory({
        category: rawCategory,
        type,
        description: rawDescription,
        party: rawParty,
        categories: context.categories,
      })
      const description = normalizeSettlementDescription({
        description: rawDescription,
        type,
        category,
        party: rawParty,
        date,
        transactions: context.transactions,
      })

      if (!description || !category || !amount) {
        return executeError("Transaction requires description, amount, and category")
      }
      if (!account) return executeError("No account available to create transaction")

      let finalCategoryName = findCategoryNameInsensitive(context.categories, category) || category

      if (!findCategoryNameInsensitive(context.categories, category)) {
        const createdCategoryResponse = await categoriesPOST(buildRequest("/api/categories", "POST", {
          name: category,
          type: type === "income" ? "income" : "expense",
        }))
        const createdCategoryPayload = await toJson<{ id: string; name: string; error?: string }>(createdCategoryResponse)

        if (!createdCategoryResponse.ok || !createdCategoryPayload) {
          return executeError(getErrorFromApiPayload(createdCategoryPayload, "Unable to create category for transaction"))
        }
        finalCategoryName = createdCategoryPayload.name
      }

      const response = await transactionsPOST(buildRequest("/api/transactions", "POST", {
        description,
        amount,
        date,
        category: finalCategoryName,
        type,
        accountId: account.id,
        party: rawParty || undefined,
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
      const topLevelDescription = typeof toolCall.input.description === "string" ? toolCall.input.description.trim() : ""
      const explicitSelectorDescription =
        typeof toolCall.input.transactionDescription === "string" ? toolCall.input.transactionDescription.trim() : ""
      const explicitSelectorAmount =
        typeof toolCall.input.transactionAmount === "number" ? Math.abs(toolCall.input.transactionAmount) : undefined
      const explicitSelectorDate =
        typeof toolCall.input.transactionDate === "string" ? toolCall.input.transactionDate : undefined
      const explicitSelectorParty =
        typeof toolCall.input.transactionParty === "string" ? toolCall.input.transactionParty : undefined

      const hasTopLevelUpdateFields = ["amount", "type", "category", "accountId", "accountName", "date", "party", "notes", "tags"]
        .some(key => toolCall.input[key] !== undefined)
      const nestedUpdates = typeof toolCall.input.updates === "object" && toolCall.input.updates
        ? toolCall.input.updates as Record<string, unknown>
        : {}
      const hasNestedDescriptionUpdate = typeof nestedUpdates.description === "string"
      const descriptionActsAsSelector = !toolCall.input.transactionId
        && Boolean(topLevelDescription)
        && hasTopLevelUpdateFields
        && !hasNestedDescriptionUpdate
        && !explicitSelectorDescription

      const normalized = normalizeUpdateTransactionInput(toolCall.input, {
        descriptionActsAsSelector,
      })

      const resolvedTransactionResult = resolveTransactionFromSelectors({
        context,
        transactionId: normalized.transactionId,
        description: explicitSelectorDescription || (descriptionActsAsSelector ? topLevelDescription : ""),
        amount: explicitSelectorAmount,
        date: explicitSelectorDate,
        party: explicitSelectorParty,
      })

      if (!resolvedTransactionResult.transaction) {
        return executeError(resolvedTransactionResult.error || "Unable to resolve transaction for update")
      }

      const resolvedTransaction = resolvedTransactionResult.transaction
      const updates = { ...normalized.updates }

      if (typeof updates.accountName === "string") {
        const requestedAccountName = updates.accountName.trim()
        if (!requestedAccountName) {
          return executeError("Account name cannot be empty")
        }

        const accountByName = context.accounts.find(account => (
          account.name.trim().toLowerCase() === requestedAccountName.toLowerCase()
        ))
        if (!accountByName) {
          return executeError(`Account "${requestedAccountName}" not found`)
        }

        updates.accountId = accountByName.id
        delete updates.accountName
      }

      if (typeof updates.accountId === "string") {
        const requestedAccount = updates.accountId.trim()
        if (!requestedAccount) {
          delete updates.accountId
        } else {
          const accountById = context.accounts.find(account => account.id === requestedAccount)
          const accountByName = context.accounts.find(account => (
            account.name.trim().toLowerCase() === requestedAccount.toLowerCase()
          ))
          if (!accountById && !accountByName) {
            return executeError(`Account "${requestedAccount}" not found`)
          }
          updates.accountId = accountById?.id || accountByName?.id || requestedAccount
        }
      }

      if (Object.keys(updates).length === 0) {
        return executeError("No update fields were provided")
      }

      const effectiveType = updates.type === "income" || updates.type === "expense"
        ? updates.type
        : (resolvedTransaction.type === "income" ? "income" : "expense")
      const effectiveParty = typeof updates.party === "string"
        ? updates.party
        : (resolvedTransaction.party || "")
      const effectiveCategoryInput = typeof updates.category === "string"
        ? updates.category
        : resolvedTransaction.category
      const effectiveDescriptionInput = typeof updates.description === "string"
        ? updates.description
        : resolvedTransaction.description
      const effectiveDate = typeof updates.date === "string"
        ? updates.date
        : (normalizeDateValue(resolvedTransaction.date)?.toISOString() || new Date().toISOString())

      const normalizedCategory = normalizeSettlementCategory({
        category: effectiveCategoryInput,
        type: effectiveType,
        description: effectiveDescriptionInput,
        party: effectiveParty,
        categories: context.categories,
      })

      if (typeof updates.category === "string" || normalizedCategory !== resolvedTransaction.category) {
        updates.category = normalizedCategory
      }

      const normalizedDescription = normalizeSettlementDescription({
        description: effectiveDescriptionInput,
        type: effectiveType,
        category: normalizedCategory,
        party: effectiveParty,
        date: effectiveDate,
        transactions: context.transactions,
      })

      if (typeof updates.description === "string" || normalizedCategory !== resolvedTransaction.category) {
        updates.description = normalizedDescription
      }

      if (typeof updates.category === "string" && !findCategoryNameInsensitive(context.categories, updates.category)) {
        const createdCategoryResponse = await categoriesPOST(buildRequest("/api/categories", "POST", {
          name: updates.category,
          type: effectiveType === "income" ? "income" : "expense",
        }))
        const createdCategoryPayload = await toJson<{ id: string; name: string; error?: string }>(createdCategoryResponse)

        if (!createdCategoryResponse.ok || !createdCategoryPayload) {
          return executeError(getErrorFromApiPayload(createdCategoryPayload, "Unable to create category for update"))
        }
        updates.category = createdCategoryPayload.name
      }

      const response = await transactionsPUT(buildRequest("/api/transactions", "PUT", {
        id: resolvedTransaction.id,
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
      const descriptionMatches = description
        ? context.transactions.filter(item => item.description.trim().toLowerCase() === description)
        : []

      const resolvedTransaction = transactionId
        ? context.transactions.find(item => item.id === transactionId)
        : description
          ? descriptionMatches[0]
          : null

      if (!transactionId && description && descriptionMatches.length > 1) {
        return executeError("Multiple transactions matched that description. Please provide amount or date.")
      }
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

    // ── MILESTONE 2: Goals ────────────────────────────────────────────────────

    case "view_goals": {
      const goals = await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
      return {
        execution: { tool: "view_goals", status: "success", summary: `Found ${goals.length} goal${goals.length === 1 ? "" : "s"}` },
        cards: goals.length === 0
          ? [{ type: "text", body: "You have no goals yet. Try creating one!" }]
          : [{
              type: "list",
              title: `Goals (${goals.length})`,
              items: goals.map(g => ({
                label: g.name,
                value: `${g.currentAmount.toFixed(0)} / ${g.targetAmount.toFixed(0)}`,
                tone: g.currentAmount >= g.targetAmount ? "good" : g.currentAmount / g.targetAmount >= 0.7 ? "warn" : "neutral",
              })),
              href: "/goals",
              hrefLabel: "Open Goals",
            }],
      }
    }

    case "create_goal": {
      const name = String(toolCall.input.name || "").trim()
      const targetAmount = Number(toolCall.input.targetAmount)
      if (!name) return executeError("Goal name is required")
      if (!targetAmount || targetAmount <= 0) return executeError("targetAmount must be a positive number")

      const goal = await prisma.goal.create({
        data: {
          userId,
          name,
          targetAmount,
          currentAmount: 0,
          targetDate: toolCall.input.targetDate ? new Date(String(toolCall.input.targetDate)) : null,
          monthlyContribution: toolCall.input.monthlyContribution ? Number(toolCall.input.monthlyContribution) : null,
          priority: (["low", "medium", "high"].includes(String(toolCall.input.priority)) ? String(toolCall.input.priority) : "medium") as "low" | "medium" | "high",
          notes: toolCall.input.notes ? String(toolCall.input.notes) : null,
          accountId: toolCall.input.accountId ? String(toolCall.input.accountId) : null,
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "create_goal", status: "success", summary: `Created goal "${goal.name}"` },
        cards: [{
          type: "entity",
          entityType: "goal",
          entityId: goal.id,
          title: goal.name,
          status: "created",
          fields: [
            { label: "Target", value: `₹${goal.targetAmount.toFixed(2)}` },
            { label: "Priority", value: goal.priority },
            ...(goal.targetDate ? [{ label: "Target Date", value: new Date(goal.targetDate).toLocaleDateString() }] : []),
          ],
          href: "/goals",
          hrefLabel: "Open Goals",
        }],
        mutations: [makeMutation("goals", "create", goal.id)],
      }
    }

    case "update_goal": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Goal id is required")

      const existing = await prisma.goal.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Goal not found")

      const updated = await prisma.goal.update({
        where: { id },
        data: {
          ...(toolCall.input.name !== undefined && { name: String(toolCall.input.name).trim() }),
          ...(toolCall.input.targetAmount !== undefined && { targetAmount: Number(toolCall.input.targetAmount) }),
          ...(toolCall.input.currentAmount !== undefined && { currentAmount: Number(toolCall.input.currentAmount) }),
          ...(toolCall.input.targetDate !== undefined && { targetDate: toolCall.input.targetDate ? new Date(String(toolCall.input.targetDate)) : null }),
          ...(toolCall.input.monthlyContribution !== undefined && { monthlyContribution: toolCall.input.monthlyContribution !== null ? Number(toolCall.input.monthlyContribution) : null }),
          ...(toolCall.input.priority !== undefined && ["low", "medium", "high"].includes(String(toolCall.input.priority)) && { priority: String(toolCall.input.priority) as "low" | "medium" | "high" }),
          ...(toolCall.input.notes !== undefined && { notes: toolCall.input.notes ? String(toolCall.input.notes) : null }),
          ...(toolCall.input.accountId !== undefined && { accountId: toolCall.input.accountId ? String(toolCall.input.accountId) : null }),
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "update_goal", status: "success", summary: `Updated goal "${updated.name}"` },
        cards: [{
          type: "entity",
          entityType: "goal",
          entityId: updated.id,
          title: updated.name,
          status: "updated",
          fields: [
            { label: "Progress", value: `₹${updated.currentAmount.toFixed(2)} / ₹${updated.targetAmount.toFixed(2)}` },
            { label: "Priority", value: updated.priority },
          ],
          href: "/goals",
          hrefLabel: "Open Goals",
        }],
        mutations: [makeMutation("goals", "update", updated.id)],
      }
    }

    case "delete_goal": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Goal id is required")

      const existing = await prisma.goal.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Goal not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: { tool: "delete_goal", status: "error", summary: "Confirmation required" },
          cards: [buildDeleteConfirmationCard(toolCall, [`Goal: ${existing.name}`, `Target: ₹${existing.targetAmount.toFixed(2)}`])],
        }
      }

      await prisma.goal.delete({ where: { id } })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "delete_goal", status: "success", summary: `Deleted goal "${existing.name}"` },
        cards: [{ type: "text", body: `Goal "${existing.name}" has been deleted.` }],
        mutations: [makeMutation("goals", "delete", id)],
      }
    }

    // ── MILESTONE 2: Watchlists ───────────────────────────────────────────────

    case "view_watchlists": {
      const watchlists = await prisma.watchlist.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
      return {
        execution: { tool: "view_watchlists", status: "success", summary: `Found ${watchlists.length} watchlist${watchlists.length === 1 ? "" : "s"}` },
        cards: watchlists.length === 0
          ? [{ type: "text", body: "No watchlists yet. Create one to track spending by category, tag, or payee." }]
          : [{
              type: "list",
              title: `Watchlists (${watchlists.length})`,
              items: watchlists.map(w => ({
                label: `${w.name} (${w.type}: ${w.value})`,
                value: w.budgetLimit ? `Limit: ₹${Number(w.budgetLimit).toFixed(0)}/${w.period}` : "No limit",
                tone: "neutral",
              })),
              href: "/watchlists",
              hrefLabel: "Open Watchlists",
            }],
      }
    }

    case "create_watchlist": {
      const name = String(toolCall.input.name || "").trim()
      const type = String(toolCall.input.type || "")
      const value = String(toolCall.input.value || "").trim()
      if (!name) return executeError("Watchlist name is required")
      if (!["category", "tag", "payee"].includes(type)) return executeError("type must be category, tag, or payee")
      if (!value) return executeError("Watchlist value is required")

      const watchlist = await prisma.watchlist.create({
        data: {
          userId,
          name,
          type: type as "category" | "tag" | "payee",
          value: value.toLowerCase(),
          budgetLimit: toolCall.input.budgetLimit !== undefined ? Number(toolCall.input.budgetLimit) : null,
          period: (["monthly", "yearly", "custom"].includes(String(toolCall.input.period)) ? String(toolCall.input.period) : "monthly") as "monthly" | "yearly" | "custom",
          alertEnabled: toolCall.input.alertEnabled !== undefined ? Boolean(toolCall.input.alertEnabled) : true,
          alertThreshold: toolCall.input.alertThreshold !== undefined ? Number(toolCall.input.alertThreshold) : 80,
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "create_watchlist", status: "success", summary: `Created watchlist "${watchlist.name}"` },
        cards: [{
          type: "entity",
          entityType: "watchlist",
          entityId: watchlist.id,
          title: watchlist.name,
          status: "created",
          fields: [
            { label: "Type", value: watchlist.type },
            { label: "Tracking", value: watchlist.value },
            ...(watchlist.budgetLimit ? [{ label: "Limit", value: `₹${Number(watchlist.budgetLimit).toFixed(2)}/${watchlist.period}` }] : []),
          ],
          href: "/watchlists",
          hrefLabel: "Open Watchlists",
        }],
        mutations: [makeMutation("watchlists", "create", watchlist.id)],
      }
    }

    case "update_watchlist": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Watchlist id is required")

      const existing = await prisma.watchlist.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Watchlist not found")

      const updated = await prisma.watchlist.update({
        where: { id },
        data: {
          ...(toolCall.input.name !== undefined && { name: String(toolCall.input.name).trim() }),
          ...(toolCall.input.budgetLimit !== undefined && { budgetLimit: toolCall.input.budgetLimit !== null ? Number(toolCall.input.budgetLimit) : null }),
          ...(toolCall.input.alertEnabled !== undefined && { alertEnabled: Boolean(toolCall.input.alertEnabled) }),
          ...(toolCall.input.alertThreshold !== undefined && { alertThreshold: Number(toolCall.input.alertThreshold) }),
          ...(toolCall.input.isActive !== undefined && { isActive: Boolean(toolCall.input.isActive) }),
          ...(toolCall.input.period !== undefined && ["monthly", "yearly", "custom"].includes(String(toolCall.input.period)) && { period: String(toolCall.input.period) as "monthly" | "yearly" | "custom" }),
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "update_watchlist", status: "success", summary: `Updated watchlist "${updated.name}"` },
        cards: [{
          type: "entity",
          entityType: "watchlist",
          entityId: updated.id,
          title: updated.name,
          status: "updated",
          fields: [
            { label: "Type", value: `${updated.type}: ${updated.value}` },
            ...(updated.budgetLimit ? [{ label: "Limit", value: `₹${Number(updated.budgetLimit).toFixed(2)}/${updated.period}` }] : []),
            { label: "Active", value: updated.isActive ? "Yes" : "No" },
          ],
          href: "/watchlists",
          hrefLabel: "Open Watchlists",
        }],
        mutations: [makeMutation("watchlists", "update", updated.id)],
      }
    }

    case "delete_watchlist": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Watchlist id is required")

      const existing = await prisma.watchlist.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Watchlist not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: { tool: "delete_watchlist", status: "error", summary: "Confirmation required" },
          cards: [buildDeleteConfirmationCard(toolCall, [`Watchlist: ${existing.name}`, `Tracking: ${existing.type} "${existing.value}"`])],
        }
      }

      await prisma.watchlist.delete({ where: { id } })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "delete_watchlist", status: "success", summary: `Deleted watchlist "${existing.name}"` },
        cards: [{ type: "text", body: `Watchlist "${existing.name}" has been deleted.` }],
        mutations: [makeMutation("watchlists", "delete", id)],
      }
    }

    // ── MILESTONE 2: Recurring Transactions ──────────────────────────────────

    case "view_recurring": {
      const recurring = await prisma.recurringTransaction.findMany({
        where: { userId },
        orderBy: { nextDueDate: "asc" },
        include: { account: { select: { name: true } } },
      })
      return {
        execution: { tool: "view_recurring", status: "success", summary: `Found ${recurring.length} recurring transaction${recurring.length === 1 ? "" : "s"}` },
        cards: recurring.length === 0
          ? [{ type: "text", body: "No recurring transactions set up yet." }]
          : [{
              type: "list",
              title: `Recurring (${recurring.length})`,
              items: recurring.map(r => ({
                label: r.description,
                value: `₹${Math.abs(r.amount).toFixed(0)} · ${r.frequency} · next: ${new Date(r.nextDueDate).toLocaleDateString()}`,
                tone: r.isActive ? "neutral" : "warn",
              })),
              href: "/recurring",
              hrefLabel: "Open Recurring",
            }],
      }
    }

    case "create_recurring": {
      const description = String(toolCall.input.description || "").trim()
      const amount = Number(toolCall.input.amount)
      const category = String(toolCall.input.category || "").trim()
      const type = String(toolCall.input.type || "")
      const accountId = String(toolCall.input.accountId || "")
      const frequency = String(toolCall.input.frequency || "")
      const startDate = String(toolCall.input.startDate || "")
      const validFrequencies = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]

      if (!description) return executeError("description is required")
      if (!amount || amount <= 0) return executeError("amount must be positive")
      if (!category) return executeError("category is required")
      if (!["income", "expense"].includes(type)) return executeError("type must be income or expense")
      if (!accountId) return executeError("accountId is required")
      if (!validFrequencies.includes(frequency)) return executeError(`frequency must be one of: ${validFrequencies.join(", ")}`)
      if (!startDate) return executeError("startDate is required")

      const account = await prisma.financialAccount.findFirst({ where: { id: accountId, userId } })
      if (!account) return executeError("Account not found")

      const start = new Date(startDate)
      const rec = await prisma.recurringTransaction.create({
        data: {
          userId,
          description,
          amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
          category,
          type: type as "income" | "expense",
          accountId,
          frequency: frequency as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
          startDate: start,
          nextDueDate: toolCall.input.nextDueDate ? new Date(String(toolCall.input.nextDueDate)) : start,
          autoCreate: toolCall.input.autoCreate !== undefined ? Boolean(toolCall.input.autoCreate) : false,
          reminderDays: toolCall.input.reminderDays !== undefined ? Number(toolCall.input.reminderDays) : 3,
          notes: toolCall.input.notes ? String(toolCall.input.notes) : null,
          tags: Array.isArray(toolCall.input.tags) ? toolCall.input.tags.map(String) : [],
          isActive: true,
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "create_recurring", status: "success", summary: `Created recurring "${rec.description}"` },
        cards: [{
          type: "entity",
          entityType: "template",
          entityId: rec.id,
          title: rec.description,
          status: "created",
          fields: [
            { label: "Amount", value: `₹${Math.abs(rec.amount).toFixed(2)}` },
            { label: "Frequency", value: rec.frequency },
            { label: "Account", value: account.name },
            { label: "Next Due", value: new Date(rec.nextDueDate).toLocaleDateString() },
          ],
          href: "/recurring",
          hrefLabel: "Open Recurring",
        }],
        mutations: [makeMutation("recurring", "create", rec.id)],
      }
    }

    case "update_recurring": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Recurring transaction id is required")

      const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Recurring transaction not found")

      const validFrequencies = ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]
      const updated = await prisma.recurringTransaction.update({
        where: { id },
        data: {
          ...(toolCall.input.description !== undefined && { description: String(toolCall.input.description).trim() }),
          ...(toolCall.input.amount !== undefined && { amount: existing.type === "expense" ? -Math.abs(Number(toolCall.input.amount)) : Math.abs(Number(toolCall.input.amount)) }),
          ...(toolCall.input.frequency !== undefined && validFrequencies.includes(String(toolCall.input.frequency)) && { frequency: String(toolCall.input.frequency) as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" }),
          ...(toolCall.input.nextDueDate !== undefined && { nextDueDate: new Date(String(toolCall.input.nextDueDate)) }),
          ...(toolCall.input.isActive !== undefined && { isActive: Boolean(toolCall.input.isActive) }),
          ...(toolCall.input.autoCreate !== undefined && { autoCreate: Boolean(toolCall.input.autoCreate) }),
          ...(toolCall.input.reminderDays !== undefined && { reminderDays: Number(toolCall.input.reminderDays) }),
          ...(toolCall.input.notes !== undefined && { notes: toolCall.input.notes ? String(toolCall.input.notes) : null }),
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "update_recurring", status: "success", summary: `Updated recurring "${updated.description}"` },
        cards: [{
          type: "entity",
          entityType: "template",
          entityId: updated.id,
          title: updated.description,
          status: "updated",
          fields: [
            { label: "Amount", value: `₹${Math.abs(updated.amount).toFixed(2)}` },
            { label: "Frequency", value: updated.frequency },
            { label: "Active", value: updated.isActive ? "Yes" : "No" },
          ],
          href: "/recurring",
          hrefLabel: "Open Recurring",
        }],
        mutations: [makeMutation("recurring", "update", updated.id)],
      }
    }

    case "delete_recurring": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Recurring transaction id is required")

      const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Recurring transaction not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: { tool: "delete_recurring", status: "error", summary: "Confirmation required" },
          cards: [buildDeleteConfirmationCard(toolCall, [`Recurring: ${existing.description}`, `Amount: ₹${Math.abs(existing.amount).toFixed(2)}`, `Frequency: ${existing.frequency}`])],
        }
      }

      await prisma.recurringTransaction.delete({ where: { id } })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "delete_recurring", status: "success", summary: `Deleted recurring "${existing.description}"` },
        cards: [{ type: "text", body: `Recurring transaction "${existing.description}" has been deleted.` }],
        mutations: [makeMutation("recurring", "delete", id)],
      }
    }

    // ── MILESTONE 2: Notifications ────────────────────────────────────────────

    case "view_notifications": {
      const unreadOnly = toolCall.input.unreadOnly === true
      const notifications = await prisma.notification.findMany({
        where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
        orderBy: { timestamp: "desc" },
        take: 50,
      })
      const unreadCount = notifications.filter(n => !n.isRead).length
      return {
        execution: { tool: "view_notifications", status: "success", summary: `Found ${notifications.length} notification${notifications.length === 1 ? "" : "s"} (${unreadCount} unread)` },
        cards: notifications.length === 0
          ? [{ type: "text", body: unreadOnly ? "No unread notifications." : "No notifications yet." }]
          : [{
              type: "list",
              title: unreadOnly ? `Unread Notifications (${notifications.length})` : `Notifications (${notifications.length})`,
              items: notifications.slice(0, 8).map(n => ({
                label: n.title,
                value: n.isRead ? "read" : "unread",
                tone: n.isRead ? "neutral" : "warn",
              })),
            }],
      }
    }

    case "mark_notifications_read": {
      const ids = Array.isArray(toolCall.input.ids)
        ? toolCall.input.ids.filter((item): item is string => typeof item === "string")
        : []
      if (ids.length === 0) return executeError("ids array is required")

      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId },
        data: { isRead: true },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "mark_notifications_read", status: "success", summary: `Marked ${ids.length} notification${ids.length === 1 ? "" : "s"} as read` },
        cards: [{ type: "text", body: `${ids.length} notification${ids.length === 1 ? "" : "s"} marked as read.` }],
        mutations: [makeMutation("notifications", "update")],
      }
    }

    // ── MILESTONE 2: Settlements ──────────────────────────────────────────────

    case "view_settlements": {
      const settlements = await prisma.settlement.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      const unsettled = settlements.filter(s => !s.isSettled)
      const totalOwed = unsettled.filter(s => s.type === "i_owe").reduce((sum, s) => sum + s.amount, 0)
      const totalOwedToMe = unsettled.filter(s => s.type === "owed_to_me").reduce((sum, s) => sum + s.amount, 0)
      return {
        execution: { tool: "view_settlements", status: "success", summary: `Found ${settlements.length} settlement${settlements.length === 1 ? "" : "s"}, ${unsettled.length} unsettled` },
        cards: [{
          type: "stats",
          title: "Settlements Summary",
          stats: [
            { label: "I Owe", value: `₹${totalOwed.toFixed(2)}`, tone: totalOwed > 0 ? "warn" : "good" },
            { label: "Owed to Me", value: `₹${totalOwedToMe.toFixed(2)}`, tone: totalOwedToMe > 0 ? "good" : "neutral" },
            { label: "Unsettled", value: String(unsettled.length), tone: unsettled.length > 0 ? "warn" : "good" },
          ],
          href: "/settlements",
          hrefLabel: "Open Settlements",
        },
        ...(unsettled.length > 0 ? [{
          type: "list" as const,
          title: `Unsettled (${unsettled.length})`,
          items: unsettled.slice(0, 6).map(s => ({
            label: `${s.type === "i_owe" ? "→" : "←"} ${s.party}`,
            value: `₹${s.amount.toFixed(2)}${s.reason ? ` · ${s.reason}` : ""}`,
            tone: s.type === "i_owe" ? "warn" as const : "good" as const,
          })),
          href: "/settlements",
          hrefLabel: "Open Settlements",
        }] : [])],
      }
    }

    case "create_settlement": {
      const party = String(toolCall.input.party || toolCall.input.fromPerson || toolCall.input.toPerson || "").trim()
      const amount = Number(toolCall.input.amount)
      const type = String(toolCall.input.type || "")
      if (!party) return executeError("party name is required")
      if (!amount || amount <= 0) return executeError("amount must be positive")
      if (!["i_owe", "owed_to_me"].includes(type)) return executeError("type must be i_owe or owed_to_me")

      const settlement = await prisma.settlement.create({
        data: {
          userId,
          party,
          amount,
          type: type as "i_owe" | "owed_to_me",
          reason: toolCall.input.reason ? String(toolCall.input.reason) : null,
          isSettled: false,
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "create_settlement", status: "success", summary: `Recorded settlement with ${party}` },
        cards: [{
          type: "entity",
          entityType: "settlement",
          entityId: settlement.id,
          title: `${type === "i_owe" ? "I owe" : "Owed to me"}: ${party}`,
          status: "created",
          fields: [
            { label: "Amount", value: `₹${settlement.amount.toFixed(2)}` },
            { label: "Party", value: party },
            ...(settlement.reason ? [{ label: "Reason", value: settlement.reason }] : []),
          ],
          href: "/settlements",
          hrefLabel: "Open Settlements",
        }],
        mutations: [makeMutation("settlements", "create", settlement.id)],
      }
    }

    case "update_settlement": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Settlement id is required")

      const existing = await prisma.settlement.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Settlement not found")

      const updated = await prisma.settlement.update({
        where: { id },
        data: {
          ...(toolCall.input.party !== undefined && { party: String(toolCall.input.party).trim() }),
          ...(toolCall.input.amount !== undefined && { amount: Number(toolCall.input.amount) }),
          ...(toolCall.input.type !== undefined && ["i_owe", "owed_to_me"].includes(String(toolCall.input.type)) && { type: String(toolCall.input.type) as "i_owe" | "owed_to_me" }),
          ...(toolCall.input.reason !== undefined && { reason: toolCall.input.reason ? String(toolCall.input.reason) : null }),
          ...(toolCall.input.isSettled !== undefined && {
            isSettled: Boolean(toolCall.input.isSettled),
            settledAt: toolCall.input.isSettled ? new Date() : null,
          }),
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "update_settlement", status: "success", summary: `Updated settlement with ${updated.party}` },
        cards: [{
          type: "entity",
          entityType: "settlement",
          entityId: updated.id,
          title: `${updated.type === "i_owe" ? "I owe" : "Owed to me"}: ${updated.party}`,
          status: "updated",
          fields: [
            { label: "Amount", value: `₹${updated.amount.toFixed(2)}` },
            { label: "Settled", value: updated.isSettled ? `Yes (${updated.settledAt ? new Date(updated.settledAt).toLocaleDateString() : "today"})` : "No" },
          ],
          href: "/settlements",
          hrefLabel: "Open Settlements",
        }],
        mutations: [makeMutation("settlements", "update", updated.id)],
      }
    }

    case "delete_settlement": {
      const id = String(toolCall.input.id || "")
      if (!id) return executeError("Settlement id is required")

      const existing = await prisma.settlement.findFirst({ where: { id, userId } })
      if (!existing) return executeError("Settlement not found")

      if (!hasDeleteConfirmation(toolCall)) {
        return {
          execution: { tool: "delete_settlement", status: "error", summary: "Confirmation required" },
          cards: [buildDeleteConfirmationCard(toolCall, [
            `Settlement with: ${existing.party}`,
            `Amount: ₹${existing.amount.toFixed(2)}`,
            `Type: ${existing.type === "i_owe" ? "I owe them" : "They owe me"}`,
          ])],
        }
      }

      await prisma.settlement.delete({ where: { id } })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "delete_settlement", status: "success", summary: `Deleted settlement with ${existing.party}` },
        cards: [{ type: "text", body: `Settlement with "${existing.party}" has been deleted.` }],
        mutations: [makeMutation("settlements", "delete", id)],
      }
    }

    case "view_settlement_groups": {
      const groups = await prisma.settlementGroup.findMany({
        where: { members: { some: { userId } } },
        include: {
          members: { select: { userId: true, role: true, user: { select: { name: true } } } },
          _count: { select: { transactions: true } },
        },
        orderBy: { updatedAt: "desc" },
      })
      return {
        execution: { tool: "view_settlement_groups", status: "success", summary: `Found ${groups.length} settlement group${groups.length === 1 ? "" : "s"}` },
        cards: groups.length === 0
          ? [{ type: "text", body: "You are not in any settlement groups yet." }]
          : [{
              type: "list",
              title: `Settlement Groups (${groups.length})`,
              items: groups.map(g => ({
                label: g.name,
                value: `${g.members.length} member${g.members.length === 1 ? "" : "s"} · ${g._count.transactions} transaction${g._count.transactions === 1 ? "" : "s"}`,
                tone: "neutral",
              })),
              href: "/settlements",
              hrefLabel: "Open Settlements",
            }],
      }
    }

    case "create_settlement_group": {
      const name = String(toolCall.input.name || "").trim()
      if (!name) return executeError("Group name is required")

      const group = await prisma.settlementGroup.create({
        data: {
          name,
          description: toolCall.input.description ? String(toolCall.input.description).trim() : null,
          createdById: userId,
          members: {
            create: { userId, role: "owner" },
          },
        },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncAdvanced])
      return {
        execution: { tool: "create_settlement_group", status: "success", summary: `Created group "${group.name}"` },
        cards: [{
          type: "entity",
          entityType: "settlement_group",
          entityId: group.id,
          title: group.name,
          status: "created",
          fields: [
            { label: "Role", value: "Owner" },
            ...(group.description ? [{ label: "Description", value: group.description }] : []),
          ],
          href: "/settlements",
          hrefLabel: "Open Settlements",
        }],
        mutations: [makeMutation("settlement_groups", "create", group.id)],
      }
    }

    // ── MILESTONE 2: Settings ─────────────────────────────────────────────────

    case "view_settings": {
      const settings = await prisma.userSettings.findUnique({ where: { userId } })
      if (!settings) {
        return {
          execution: { tool: "view_settings", status: "success", summary: "No custom settings found (using defaults)" },
          cards: [{ type: "text", body: "Using default settings. You can update them via the Settings page.", href: "/settings", hrefLabel: "Open Settings" }],
        }
      }
      const fields = Object.entries(settings)
        .filter(([key]) => !["id", "userId", "createdAt", "updatedAt"].includes(key))
        .slice(0, 8)
        .map(([label, value]) => ({ label, value: String(value ?? "—") }))
      return {
        execution: { tool: "view_settings", status: "success", summary: "Settings loaded" },
        cards: [{
          type: "entity",
          entityType: "settings",
          entityId: settings.id,
          title: "Your Settings",
          status: "info",
          fields,
          href: "/settings",
          hrefLabel: "Open Settings",
        }],
      }
    }

    case "update_settings": {
      const updates = { ...toolCall.input }
      delete updates.confirm
      if (Object.keys(updates).length === 0) return executeError("No settings fields provided to update")

      const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: updates as Record<string, unknown>,
        create: { userId, ...(updates as Record<string, unknown>) },
      })
      invalidateUserCache(userId, [USER_CACHE_SCOPES.syncCore])
      return {
        execution: { tool: "update_settings", status: "success", summary: `Updated ${Object.keys(updates).length} setting${Object.keys(updates).length === 1 ? "" : "s"}` },
        cards: [{
          type: "entity",
          entityType: "settings",
          entityId: settings.id,
          title: "Settings Updated",
          status: "updated",
          fields: Object.entries(updates).slice(0, 8).map(([label, value]) => ({ label, value: String(value ?? "—") })),
          href: "/settings",
          hrefLabel: "Open Settings",
        }],
        mutations: [makeMutation("settings", "update")],
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
  const auditItems: ToolExecutionAuditItem[] = []

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(userId, origin, toolCall, context)
    executions.push(result.execution)
    const linkedCards = result.cards.map(card => withCardNavigationLink(card, toolCall.tool))
    cards.push(...linkedCards)
    const operation = inferSaathiLogOperation(result.execution.tool)
    const resource = inferSaathiLogResource(result.execution.tool)
    const details = getMatchingCardDetailsForLog(linkedCards, operation, resource)
    auditItems.push({
      tool: result.execution.tool,
      operation,
      resource,
      status: result.execution.status,
      summary: result.execution.summary,
      details,
    })
    if (result.mutations && result.mutations.length > 0) {
      mutations.push(...result.mutations)
    }
  }

  const dedupedMutations = mutations.filter((item, index, array) => {
    const signature = `${item.resource}|${item.operation}|${item.entityId || ""}`
    return array.findIndex(candidate => `${candidate.resource}|${candidate.operation}|${candidate.entityId || ""}` === signature) === index
  })

  return { executions, cards, mutations: dedupedMutations, auditItems }
}

async function persistSaathiAuditLogs(input: {
  userId: string
  userMessageId: string
  assistantMessageId: string
  userRequest: string
  auditItems: ToolExecutionAuditItem[]
}) {
  if (input.auditItems.length === 0) return

  try {
    await prisma.saathiAuditLog.createMany({
      data: input.auditItems.map(item => ({
        userId: input.userId,
        userMessageId: input.userMessageId,
        assistantMessageId: input.assistantMessageId,
        tool: item.tool,
        operation: item.operation,
        resource: item.resource,
        status: item.status,
        summary: item.summary,
        userRequest: input.userRequest,
        details: item.details.slice(0, 20),
      })),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Failed to persist Saathi audit logs:", error)
  }
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
- For update/delete transaction requests, include either transactionId or selectors (transactionDescription plus amount/date/party when available) so Saathi can resolve the target.
- Generated write toolCalls are staged for explicit user confirmation before execution.
- For delete requests, return a confirm card first and only include delete toolCalls with {"confirm":true} after explicit confirmation.
- For transaction draft entity cards, always include canonical field labels so forms can prefill: Description, Amount, Type, Category, Account, Date, Party, and for updates include Draft Mode=update + Transaction ID.
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
        if (error instanceof AuthError) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
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
    const toolCallSource: "tool_requests" | "inferred_clear" | "generated" | "confirmed" | "none" = toolRequests.length > 0
      ? "tool_requests"
      : inferredClearToolCalls.length > 0
        ? "inferred_clear"
        : generated.toolCalls.length > 0
          ? "generated"
          : inferredToolCalls.length > 0
            ? "confirmed"
            : "none"
    const selectedToolCalls = (
      toolCallSource === "tool_requests"
        ? toolRequests
        : toolCallSource === "inferred_clear"
          ? inferredClearToolCalls
          : toolCallSource === "generated"
            ? generated.toolCalls
            : toolCallSource === "confirmed"
              ? inferredToolCalls
              : []
    ).slice(0, 8)

    let toolCalls = selectedToolCalls
    let blockedGeneratedToolCalls: GeneratedToolBlock[] = []
    let stagedMutationToolCalls: SaathiToolCall[] = []

    if (toolCallSource === "generated") {
      const preflight = preflightGeneratedToolCalls(toolCalls)
      toolCalls = preflight.executableToolCalls
      blockedGeneratedToolCalls = preflight.blockedToolCalls
    }

    const executableToolCalls = toolCallSource === "generated"
      ? toolCalls.filter(toolCall => isReadOnlyTool(toolCall.tool))
      : toolCalls

    if (toolCallSource === "generated") {
      stagedMutationToolCalls = toolCalls.filter(toolCall => isMutatingTool(toolCall.tool))
    }

    const requiresToolContext = executableToolCalls.length > 0 || stagedMutationToolCalls.length > 0
    const shouldFetchToolContext = requiresToolContext && (toolCallSource === "tool_requests" || generationContext === EMPTY_CONTEXT)
    const resourcesForToolContext = new Set<ContextResource>()
    if (executableToolCalls.length > 0) {
      getRequiredContextResourcesForTools(executableToolCalls).forEach(resource => resourcesForToolContext.add(resource))
    }
    if (stagedMutationToolCalls.length > 0) {
      getRequiredContextResourcesForTools(stagedMutationToolCalls).forEach(resource => resourcesForToolContext.add(resource))
    }

    const toolContext = !requiresToolContext
      ? EMPTY_CONTEXT
      : shouldFetchToolContext
        ? await fetchChatContext(user.id, now, {
            resources: resourcesForToolContext.size > 0 ? resourcesForToolContext : undefined,
            includeRuntimeSlices: false,
          })
        : generationContext
    const toolResults = await executeToolCalls(user.id, origin, executableToolCalls, toolContext)
    const stagedMutationCards = stagedMutationToolCalls.length > 0
      ? buildStagedMutationCards(stagedMutationToolCalls, toolContext, now)
      : []

    const hasCreateTransactionSuccess = toolResults.executions.some(
      execution => execution.tool === "create_transaction" && execution.status === "success"
    )
    const generatedCardsForMerge = toolCallSource === "generated" && stagedMutationToolCalls.length > 0
      ? generated.cards.filter(card => (
          card.type === "text" ||
          card.type === "stats" ||
          card.type === "list" ||
          card.type === "budget"
        ))
      : generated.cards
    const cardsAfterReconcile = reconcileGeneratedCards(
      [...generatedCardsForMerge, ...stagedMutationCards, ...toolResults.cards],
      toolResults.executions
    )
    const cardsAfterDedupe = hasCreateTransactionSuccess
      ? cardsAfterReconcile.filter(card => (
          !(
            card.type === "entity" &&
            card.entityType === "transaction" &&
            card.status === "created" &&
            !card.entityId
          )
        ))
      : cardsAfterReconcile
    const cardsWithIntrinsicLinks = cardsAfterDedupe.map(card => (
      card.type === "entity" || card.type === "budget"
        ? withCardNavigationLink(card, "view_transactions")
        : card
    ))
    const combinedCards = sanitizeCards(cardsWithIntrinsicLinks).slice(0, 10)
    const toolSummaryLines = toolResults.executions.map(
      execution => `${execution.status === "success" ? "Completed" : "Failed"} ${execution.tool}: ${execution.summary}`
    )
    const stagedToolLines = stagedMutationToolCalls.length > 0
      ? [`Prepared ${stagedMutationToolCalls.length} pending change${stagedMutationToolCalls.length === 1 ? "" : "s"}. Review cards before applying.`]
      : []

    const generatedText = toolCallSource === "tool_requests" || toolCallSource === "confirmed"
      ? "Executed your requested draft changes."
      : toolCallSource === "generated" && stagedMutationToolCalls.length > 0
        ? "I analyzed the request, prepared pending changes, and paused for your confirmation."
      : toolResults.executions.length === 0 && /\b(created|recorded|added|updated|saved)\b/i.test(generated.assistantText)
        ? `I prepared drafts but did not execute any data changes yet.\n\n${generated.assistantText}`
        : generated.assistantText

    const heldToolLines = blockedGeneratedToolCalls.map(
      blocked => `Held ${blocked.tool}: ${blocked.reason}`
    )

    const finalText = [
      generatedText,
      heldToolLines.length > 0 ? heldToolLines.join("\n") : null,
      stagedToolLines.length > 0 ? stagedToolLines.join("\n") : null,
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

    await persistSaathiAuditLogs({
      userId: user.id,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      userRequest: userMessage.content,
      auditItems: toolResults.auditItems,
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error clearing chat history:", error)
    return NextResponse.json(
      { error: "Failed to clear chat history" },
      { status: 500 }
    )
  }
}
