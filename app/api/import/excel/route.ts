import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import ExcelJS from "exceljs"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_CELL_COUNT = 500_000
const FORMULA_INJECTION_RE = /^[=+\-@\t\r]/

// Sheet names → entity types
const SHEET_ENTITY_MAP: Record<string, EntityType> = {
  categories: "categories",
  parties: "parties",
  accounts: "accounts",
  settings: "settings",
  budgets: "budgets",
  subbudgets: "subBudgets",
  sub_budgets: "subBudgets",
  "sub budgets": "subBudgets",
  goals: "goals",
  "recurring transactions": "recurringTransactions",
  recurring_transactions: "recurringTransactions",
  recurringtransactions: "recurringTransactions",
  recurring: "recurringTransactions",
  transactions: "transactions",
  watchlists: "watchlists",
  templates: "templates",
  "transaction templates": "templates",
  transaction_templates: "templates",
  settlements: "settlements",
}

type EntityType =
  | "categories"
  | "parties"
  | "accounts"
  | "settings"
  | "budgets"
  | "subBudgets"
  | "goals"
  | "recurringTransactions"
  | "transactions"
  | "watchlists"
  | "templates"
  | "settlements"

type ImportCount = { created: number; updated: number }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeString(value: unknown): string {
  if (value == null) return ""
  let str = String(value).trim()
  // Strip formula-injection characters at start
  while (str.length > 0 && FORMULA_INJECTION_RE.test(str)) {
    str = str.slice(1).trim()
  }
  return str
}

function parseDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === "number") {
    // Excel date serial number: days since 1899-12-30
    // ExcelJS typically converts these to Date objects already,
    // but handle raw serial numbers just in case.
    const excelEpoch = new Date(1899, 11, 30)
    const ms = value * 86400000
    const d = new Date(excelEpoch.getTime() + ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function parseNumber(value: unknown): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseBoolean(value: unknown): boolean | null {
  if (value == null) return null
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase()
    if (lower === "true" || lower === "yes" || lower === "1") return true
    if (lower === "false" || lower === "no" || lower === "0") return false
  }
  return null
}

function parseTags(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean)
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function parseJson(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === "object") return value
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Read a worksheet into an array of row objects keyed by normalized header names.
 */
function readSheet(
  worksheet: ExcelJS.Worksheet
): { headers: string[]; rows: Record<string, ExcelJS.CellValue>[] } {
  const headers: string[] = []
  const rows: Record<string, ExcelJS.CellValue>[] = []

  const headerRow = worksheet.getRow(1)
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = sanitizeString(cell.value).toLowerCase().replace(/[\s_]+/g, "")
  })

  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r)
    let hasValue = false
    const obj: Record<string, ExcelJS.CellValue> = {}

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber]
      if (!header) return
      // For date cells that ExcelJS already parsed, keep the Date object.
      // For everything else, keep the raw value.
      obj[header] = cell.value
      if (cell.value != null && cell.value !== "") hasValue = true
    })

    if (hasValue) rows.push(obj)
  }

  return { headers, rows }
}

/**
 * Get the string value of a row field, sanitized.
 */
function rowStr(row: Record<string, ExcelJS.CellValue>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && v !== "") return sanitizeString(v)
  }
  return ""
}

/**
 * Get the raw value of a row field (for Date / number cells).
 */
function rowRaw(row: Record<string, ExcelJS.CellValue>, ...keys: string[]): ExcelJS.CellValue | undefined {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k]
  }
  return undefined
}

// ---------------------------------------------------------------------------
// POST /api/import/excel
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    // ---- Read file from FormData ----
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded. Provide a file in the 'file' form field." }, { status: 400 })
    }

    // ---- Size validation ----
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      )
    }

    // ---- MIME / extension validation ----
    const validMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream", // some clients send this
    ]
    const nameIsXlsx = file.name?.toLowerCase().endsWith(".xlsx")
    if (!nameIsXlsx && !validMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only .xlsx files are accepted." }, { status: 400 })
    }

    // ---- Load workbook ----
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()

    try {
      await workbook.xlsx.load(arrayBuffer)
    } catch {
      return NextResponse.json({ error: "Failed to parse Excel file. Ensure it is a valid .xlsx file." }, { status: 400 })
    }

    // ---- Cell count validation (DoS prevention) ----
    let totalCells = 0
    workbook.eachSheet((ws) => {
      totalCells += ws.rowCount * ws.columnCount
    })
    if (totalCells > MAX_CELL_COUNT) {
      return NextResponse.json(
        { error: `File has too many cells (${totalCells}). Maximum allowed is ${MAX_CELL_COUNT}.` },
        { status: 400 }
      )
    }

    // ---- Parse sheets by entity ----
    const sheetData: Partial<Record<EntityType, Record<string, ExcelJS.CellValue>[]>> = {}

    workbook.eachSheet((ws) => {
      const normalizedName = ws.name.trim().toLowerCase().replace(/[\s_]+/g, " ")
      // Try exact match first, then normalized
      const entityType =
        SHEET_ENTITY_MAP[normalizedName] ??
        SHEET_ENTITY_MAP[normalizedName.replace(/\s/g, "")] ??
        SHEET_ENTITY_MAP[normalizedName.replace(/\s/g, "_")]

      if (entityType) {
        const { rows } = readSheet(ws)
        if (rows.length > 0) {
          // Merge with any already-parsed rows for the same entity type
          sheetData[entityType] = [...(sheetData[entityType] ?? []), ...rows]
        }
      }
    })

    // ---- Build summary + error collector ----
    const summary: Record<string, ImportCount> = {}
    const errors: string[] = []

    function initSummary(key: string) {
      if (!summary[key]) summary[key] = { created: 0, updated: 0 }
    }

    // ---- Fetch existing data for merge lookups ----
    const [
      existingAccounts,
      existingCategories,
      existingParties,
      existingBudgets,
      existingGoals,
      existingRecurring,
      existingTransactions,
      existingWatchlists,
      existingTemplates,
      existingSettlements,
      existingSettings,
    ] = await Promise.all([
      prisma.financialAccount.findMany({ where: { userId: user.id } }),
      prisma.category.findMany({ where: { userId: user.id } }),
      prisma.party.findMany({ where: { userId: user.id } }),
      prisma.budget.findMany({ where: { userId: user.id }, include: { subBudgets: true } }),
      prisma.goal.findMany({ where: { userId: user.id } }),
      prisma.recurringTransaction.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({ where: { userId: user.id }, select: { id: true, description: true, date: true, amount: true } }),
      prisma.watchlist.findMany({ where: { userId: user.id } }),
      prisma.transactionTemplate.findMany({ where: { userId: user.id } }),
      prisma.settlement.findMany({ where: { userId: user.id } }),
      prisma.userSettings.findFirst({ where: { userId: user.id } }),
    ])

    // Lookup maps (mutable — updated after imports)
    const accountMap = new Map(existingAccounts.map((a) => [a.name.toLowerCase(), a.id]))
    const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]))
    const budgetMap = new Map(existingBudgets.map((b) => [b.name.toLowerCase(), b.id]))

    // ---------------------------------------------------------------------------
    // Run all mutations inside a single transaction
    // ---------------------------------------------------------------------------
    await prisma.$transaction(
      async (tx) => {
        // ==================================================================
        // Phase 1: Categories & Parties
        // ==================================================================
        if (sheetData.categories) {
          initSummary("categories")
          for (const row of sheetData.categories) {
            try {
              const name = rowStr(row, "name")
              if (!name) continue

              const type = rowStr(row, "type") || "both"
              const color = rowStr(row, "color") || null
              const icon = rowStr(row, "icon") || null
              const isDefault = parseBoolean(rowRaw(row, "isdefault", "default")) ?? false

              const existing = existingCategories.find(
                (c) => c.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                await tx.category.update({
                  where: { id: existing.id },
                  data: { type, color, icon, isDefault },
                })
                categoryMap.set(name.toLowerCase(), existing.id)
                summary.categories!.updated++
              } else {
                const created = await tx.category.create({
                  data: { userId: user.id, name, type, color, icon, isDefault },
                })
                categoryMap.set(name.toLowerCase(), created.id)
                existingCategories.push(created)
                summary.categories!.created++
              }
            } catch (e) {
              errors.push(`Category row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        if (sheetData.parties) {
          initSummary("parties")
          for (const row of sheetData.parties) {
            try {
              const name = rowStr(row, "name")
              if (!name) continue

              const existing = existingParties.find(
                (p) => p.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                // Party only has name, nothing to update
                summary.parties!.updated++
              } else {
                const created = await tx.party.create({
                  data: { userId: user.id, name },
                })
                existingParties.push(created)
                summary.parties!.created++
              }
            } catch (e) {
              errors.push(`Party row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        // ==================================================================
        // Phase 2: Accounts
        // ==================================================================
        if (sheetData.accounts) {
          initSummary("accounts")
          for (const row of sheetData.accounts) {
            try {
              const name = rowStr(row, "name")
              if (!name) continue

              const balance = parseNumber(rowRaw(row, "balance")) ?? 0
              const type = rowStr(row, "type") || "checking"
              const color = rowStr(row, "color") || null
              const icon = rowStr(row, "icon") || null
              const isActive = parseBoolean(rowRaw(row, "isactive", "active")) ?? true

              const existing = existingAccounts.find(
                (a) => a.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                await tx.financialAccount.update({
                  where: { id: existing.id },
                  data: { balance, type, color, icon, isActive },
                })
                accountMap.set(name.toLowerCase(), existing.id)
                summary.accounts!.updated++
              } else {
                const created = await tx.financialAccount.create({
                  data: { userId: user.id, name, balance, type, color, icon, isActive },
                })
                accountMap.set(name.toLowerCase(), created.id)
                existingAccounts.push(created)
                summary.accounts!.created++
              }
            } catch (e) {
              errors.push(`Account row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        // ==================================================================
        // Phase 3: Settings
        // ==================================================================
        if (sheetData.settings) {
          initSummary("settings")
          // Take the first row only (single settings record per user)
          const row = sheetData.settings[0]
          if (row) {
            try {
              const data: Record<string, unknown> = {}

              const currency = rowStr(row, "currency")
              if (currency) data.currency = currency

              const currencySymbol = rowStr(row, "currencysymbol")
              if (currencySymbol) data.currencySymbol = currencySymbol

              const dateFormat = rowStr(row, "dateformat")
              if (dateFormat) data.dateFormat = dateFormat

              const language = rowStr(row, "language")
              if (language) data.language = language

              const darkMode = parseBoolean(rowRaw(row, "darkmode"))
              if (darkMode != null) data.darkMode = darkMode

              const notificationsEnabled = parseBoolean(rowRaw(row, "notificationsenabled"))
              if (notificationsEnabled != null) data.notificationsEnabled = notificationsEnabled

              const budgetAlertsEnabled = parseBoolean(rowRaw(row, "budgetalertsenabled"))
              if (budgetAlertsEnabled != null) data.budgetAlertsEnabled = budgetAlertsEnabled

              const billRemindersEnabled = parseBoolean(rowRaw(row, "billremindersenabled"))
              if (billRemindersEnabled != null) data.billRemindersEnabled = billRemindersEnabled

              const goalMilestonesEnabled = parseBoolean(rowRaw(row, "goalmilestonesenabled"))
              if (goalMilestonesEnabled != null) data.goalMilestonesEnabled = goalMilestonesEnabled

              const recurringTransactionsEnabled = parseBoolean(rowRaw(row, "recurringtransactionsenabled"))
              if (recurringTransactionsEnabled != null) data.recurringTransactionsEnabled = recurringTransactionsEnabled

              const requireAuthSetting = parseBoolean(rowRaw(row, "requireauth"))
              if (requireAuthSetting != null) data.requireAuth = requireAuthSetting

              const autoLockMinutes = parseNumber(rowRaw(row, "autolockminutes"))
              if (autoLockMinutes != null) data.autoLockMinutes = autoLockMinutes

              const showCents = parseBoolean(rowRaw(row, "showcents"))
              if (showCents != null) data.showCents = showCents

              const compactMode = parseBoolean(rowRaw(row, "compactmode"))
              if (compactMode != null) data.compactMode = compactMode

              if (existingSettings) {
                await tx.userSettings.update({
                  where: { id: existingSettings.id },
                  data,
                })
                summary.settings!.updated++
              } else {
                await tx.userSettings.create({
                  data: { userId: user.id, ...data } as Parameters<typeof tx.userSettings.create>[0]["data"],
                })
                summary.settings!.created++
              }
            } catch (e) {
              errors.push(`Settings row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        // ==================================================================
        // Phase 4: Budgets + SubBudgets
        // ==================================================================
        if (sheetData.budgets) {
          initSummary("budgets")
          for (const row of sheetData.budgets) {
            try {
              const name = rowStr(row, "name")
              if (!name) continue

              const type = rowStr(row, "type") || "monthly"
              const method = rowStr(row, "method") || "envelope"
              const periodType = rowStr(row, "periodtype") || "monthly"
              const totalAllocated = parseNumber(rowRaw(row, "totalallocated")) ?? 0
              const totalSpent = parseNumber(rowRaw(row, "totalspent")) ?? 0
              const warningThreshold = parseNumber(rowRaw(row, "warningthreshold")) ?? 80
              const criticalThreshold = parseNumber(rowRaw(row, "criticalthreshold")) ?? 100
              const alertWindowDays = parseNumber(rowRaw(row, "alertwindowdays")) ?? 5
              const enforcementMode = rowStr(row, "enforcementmode") || "soft"
              const startDate = parseDate(rowRaw(row, "startdate"))
              const endDate = parseDate(rowRaw(row, "enddate"))
              const rollover = parseBoolean(rowRaw(row, "rollover")) ?? false
              const isActive = parseBoolean(rowRaw(row, "isactive", "active")) ?? true

              const existing = existingBudgets.find(
                (b) => b.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                await tx.budget.update({
                  where: { id: existing.id },
                  data: {
                    type,
                    method,
                    periodType,
                    totalAllocated,
                    totalSpent,
                    warningThreshold,
                    criticalThreshold,
                    alertWindowDays,
                    enforcementMode,
                    startDate,
                    endDate,
                    rollover,
                    isActive,
                  },
                })
                budgetMap.set(name.toLowerCase(), existing.id)
                summary.budgets!.updated++
              } else {
                const created = await tx.budget.create({
                  data: {
                    userId: user.id,
                    name,
                    type,
                    method,
                    periodType,
                    totalAllocated,
                    totalSpent,
                    warningThreshold,
                    criticalThreshold,
                    alertWindowDays,
                    enforcementMode,
                    startDate,
                    endDate,
                    rollover,
                    isActive,
                  },
                })
                budgetMap.set(name.toLowerCase(), created.id)
                existingBudgets.push({ ...created, subBudgets: [] })
                summary.budgets!.created++
              }
            } catch (e) {
              errors.push(`Budget row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        if (sheetData.subBudgets) {
          initSummary("subBudgets")
          for (const row of sheetData.subBudgets) {
            try {
              const budgetName = rowStr(row, "budgetname", "budget")
              const category = rowStr(row, "category")
              if (!budgetName || !category) {
                errors.push(`SubBudget row skipped: missing budgetName or category`)
                continue
              }

              const budgetId = budgetMap.get(budgetName.toLowerCase())
              if (!budgetId) {
                errors.push(`SubBudget row skipped: budget "${budgetName}" not found`)
                continue
              }

              const categoryId = categoryMap.get(category.toLowerCase()) ?? null
              const allocated = parseNumber(rowRaw(row, "allocated")) ?? 0
              const spent = parseNumber(rowRaw(row, "spent")) ?? 0
              const alertThreshold = parseNumber(rowRaw(row, "alertthreshold"))

              // Match existing sub-budget by budgetId + category name
              const budgetObj = existingBudgets.find((b) => b.id === budgetId)
              const existingSub = budgetObj?.subBudgets.find(
                (sb) => sb.category.toLowerCase() === category.toLowerCase()
              )

              if (existingSub) {
                await tx.subBudget.update({
                  where: { id: existingSub.id },
                  data: { categoryId, allocated, spent, alertThreshold },
                })
                summary.subBudgets!.updated++
              } else {
                const created = await tx.subBudget.create({
                  data: { budgetId, categoryId, category, allocated, spent, alertThreshold },
                })
                // Update in-memory for subsequent lookups
                if (budgetObj) {
                  budgetObj.subBudgets.push(created)
                }
                summary.subBudgets!.created++
              }
            } catch (e) {
              errors.push(`SubBudget row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        // ==================================================================
        // Phase 5: Goals
        // ==================================================================
        if (sheetData.goals) {
          initSummary("goals")
          for (const row of sheetData.goals) {
            try {
              const name = rowStr(row, "name")
              if (!name) continue

              const targetAmount = parseNumber(rowRaw(row, "targetamount")) ?? 0
              const currentAmount = parseNumber(rowRaw(row, "currentamount")) ?? 0
              const targetDate = parseDate(rowRaw(row, "targetdate"))
              const monthlyContribution = parseNumber(rowRaw(row, "monthlycontribution"))
              const priority = rowStr(row, "priority") || "medium"
              const color = rowStr(row, "color") || null
              const icon = rowStr(row, "icon") || null
              const accountName = rowStr(row, "accountname", "account")
              const accountId = accountName ? (accountMap.get(accountName.toLowerCase()) ?? null) : null
              const includeInSpendingPlan = parseBoolean(rowRaw(row, "includeinspendingplan")) ?? true
              const notes = rowStr(row, "notes") || null
              const isActive = parseBoolean(rowRaw(row, "isactive", "active")) ?? true

              const existing = existingGoals.find(
                (g) => g.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                await tx.goal.update({
                  where: { id: existing.id },
                  data: {
                    targetAmount,
                    currentAmount,
                    targetDate,
                    monthlyContribution,
                    priority,
                    color,
                    icon,
                    accountId,
                    includeInSpendingPlan,
                    notes,
                    isActive,
                  },
                })
                summary.goals!.updated++
              } else {
                const created = await tx.goal.create({
                  data: {
                    userId: user.id,
                    name,
                    targetAmount,
                    currentAmount,
                    targetDate,
                    monthlyContribution,
                    priority,
                    color,
                    icon,
                    accountId,
                    includeInSpendingPlan,
                    notes,
                    isActive,
                  },
                })
                existingGoals.push(created)
                summary.goals!.created++
              }
            } catch (e) {
              errors.push(`Goal row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        // ==================================================================
        // Phase 6: Recurring Transactions
        // ==================================================================
        if (sheetData.recurringTransactions) {
          initSummary("recurringTransactions")
          for (const row of sheetData.recurringTransactions) {
            try {
              const description = rowStr(row, "description")
              if (!description) continue

              const accountName = rowStr(row, "accountname", "account")
              const accountId = accountName ? accountMap.get(accountName.toLowerCase()) : undefined
              if (!accountId) {
                errors.push(`Recurring transaction "${description}" skipped: account "${accountName}" not found`)
                continue
              }

              const amount = parseNumber(rowRaw(row, "amount"))
              if (amount == null) {
                errors.push(`Recurring transaction "${description}" skipped: invalid amount`)
                continue
              }

              const category = rowStr(row, "category") || "Uncategorized"
              const type = rowStr(row, "type") || "expense"
              const frequency = rowStr(row, "frequency") || "monthly"
              const startDate = parseDate(rowRaw(row, "startdate"))
              if (!startDate) {
                errors.push(`Recurring transaction "${description}" skipped: invalid startDate`)
                continue
              }

              const nextDueDate = parseDate(rowRaw(row, "nextduedate")) ?? startDate
              const isActive = parseBoolean(rowRaw(row, "isactive", "active")) ?? true
              const autoCreate = parseBoolean(rowRaw(row, "autocreate")) ?? false
              const reminderDays = parseNumber(rowRaw(row, "reminderdays"))
              const notes = rowStr(row, "notes") || null
              const tags = parseTags(rowRaw(row, "tags"))

              // Match by description + startDate + amount
              const existing = existingRecurring.find(
                (r) =>
                  r.description.toLowerCase() === description.toLowerCase() &&
                  r.startDate.toISOString().slice(0, 10) === startDate.toISOString().slice(0, 10) &&
                  Math.abs(r.amount - amount) < 0.01
              )

              if (existing) {
                await tx.recurringTransaction.update({
                  where: { id: existing.id },
                  data: {
                    accountId,
                    category,
                    type,
                    frequency,
                    nextDueDate,
                    isActive,
                    autoCreate,
                    reminderDays,
                    notes,
                    tags,
                  },
                })
                summary.recurringTransactions!.updated++
              } else {
                const created = await tx.recurringTransaction.create({
                  data: {
                    userId: user.id,
                    accountId,
                    description,
                    amount,
                    category,
                    type,
                    frequency,
                    startDate,
                    nextDueDate,
                    isActive,
                    autoCreate,
                    reminderDays,
                    notes,
                    tags,
                  },
                })
                existingRecurring.push(created)
                summary.recurringTransactions!.created++
              }
            } catch (e) {
              errors.push(`Recurring transaction row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        // ==================================================================
        // Phase 7: Transactions
        // ==================================================================
        if (sheetData.transactions) {
          initSummary("transactions")
          for (const row of sheetData.transactions) {
            try {
              const description = rowStr(row, "description")
              if (!description) continue

              const accountName = rowStr(row, "accountname", "account")
              const accountId = accountName ? accountMap.get(accountName.toLowerCase()) : undefined
              if (!accountId) {
                errors.push(`Transaction "${description}" skipped: account "${accountName}" not found`)
                continue
              }

              const amount = parseNumber(rowRaw(row, "amount"))
              if (amount == null) {
                errors.push(`Transaction "${description}" skipped: invalid amount`)
                continue
              }

              const date = parseDate(rowRaw(row, "date"))
              if (!date) {
                errors.push(`Transaction "${description}" skipped: invalid date`)
                continue
              }

              const category = rowStr(row, "category") || "Uncategorized"
              const type = rowStr(row, "type") || "expense"
              const party = rowStr(row, "party") || null
              const notes = rowStr(row, "notes") || null
              const tags = parseTags(rowRaw(row, "tags"))
              const isShared = parseBoolean(rowRaw(row, "isshared", "shared")) ?? false
              const splits = parseJson(rowRaw(row, "splits")) as object | null
              const totalAmount = parseNumber(rowRaw(row, "totalamount"))

              // Normalize amount: negative for expense, positive for income
              const normalizedAmount = type === "expense" ? -Math.abs(amount) : Math.abs(amount)

              // Match by description + date + amount
              const dateStr = date.toISOString().slice(0, 10)
              const existing = existingTransactions.find(
                (t) =>
                  t.description.toLowerCase() === description.toLowerCase() &&
                  t.date.toISOString().slice(0, 10) === dateStr &&
                  Math.abs(t.amount - normalizedAmount) < 0.01
              )

              if (existing) {
                await tx.transaction.update({
                  where: { id: existing.id },
                  data: {
                    accountId,
                    category,
                    type,
                    party,
                    notes,
                    tags,
                    isShared,
                    splits: splits ?? undefined,
                    totalAmount,
                  },
                })
                summary.transactions!.updated++
              } else {
                const created = await tx.transaction.create({
                  data: {
                    userId: user.id,
                    accountId,
                    description,
                    amount: normalizedAmount,
                    date,
                    category,
                    type,
                    party,
                    notes,
                    tags,
                    isShared,
                    splits: splits ?? undefined,
                    totalAmount,
                  },
                })
                existingTransactions.push({
                  id: created.id,
                  description: created.description,
                  date: created.date,
                  amount: created.amount,
                })
                summary.transactions!.created++
              }

              // Upsert party if provided
              if (party) {
                const partyExists = existingParties.some(
                  (p) => p.name.toLowerCase() === party.toLowerCase()
                )
                if (!partyExists) {
                  try {
                    const created = await tx.party.create({
                      data: { userId: user.id, name: party },
                    })
                    existingParties.push(created)
                  } catch {
                    // Unique constraint — already exists, ignore
                  }
                }
              }
            } catch (e) {
              errors.push(`Transaction row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        // ==================================================================
        // Phase 8: Watchlists, Templates, Settlements
        // ==================================================================
        if (sheetData.watchlists) {
          initSummary("watchlists")
          for (const row of sheetData.watchlists) {
            try {
              const name = rowStr(row, "name")
              if (!name) continue

              const type = rowStr(row, "type") || "category"
              const value = rowStr(row, "value") || name
              const budgetLimit = parseNumber(rowRaw(row, "budgetlimit"))
              const period = rowStr(row, "period") || "monthly"
              const startDate = parseDate(rowRaw(row, "startdate"))
              const endDate = parseDate(rowRaw(row, "enddate"))
              const alertEnabled = parseBoolean(rowRaw(row, "alertenabled")) ?? true
              const alertThreshold = parseNumber(rowRaw(row, "alertthreshold"))
              const color = rowStr(row, "color") || null
              const isActive = parseBoolean(rowRaw(row, "isactive", "active")) ?? true

              const existing = existingWatchlists.find(
                (w) => w.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                await tx.watchlist.update({
                  where: { id: existing.id },
                  data: {
                    type,
                    value,
                    budgetLimit,
                    period,
                    startDate,
                    endDate,
                    alertEnabled,
                    alertThreshold,
                    color,
                    isActive,
                  },
                })
                summary.watchlists!.updated++
              } else {
                const created = await tx.watchlist.create({
                  data: {
                    userId: user.id,
                    name,
                    type,
                    value,
                    budgetLimit,
                    period,
                    startDate,
                    endDate,
                    alertEnabled,
                    alertThreshold,
                    color,
                    isActive,
                  },
                })
                existingWatchlists.push(created)
                summary.watchlists!.created++
              }
            } catch (e) {
              errors.push(`Watchlist row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        if (sheetData.templates) {
          initSummary("templates")
          for (const row of sheetData.templates) {
            try {
              const name = rowStr(row, "name")
              if (!name) continue

              const description = rowStr(row, "description") || null
              const amount = parseNumber(rowRaw(row, "amount"))
              const type = rowStr(row, "type") || "expense"
              const category = rowStr(row, "category") || "Uncategorized"
              const accountName = rowStr(row, "accountname", "account")
              const accountId = accountName ? (accountMap.get(accountName.toLowerCase()) ?? null) : null
              const party = rowStr(row, "party") || null
              const tags = parseTags(rowRaw(row, "tags"))
              const notes = rowStr(row, "notes") || null
              const isActive = parseBoolean(rowRaw(row, "isactive", "active")) ?? true

              const existing = existingTemplates.find(
                (t) => t.name.toLowerCase() === name.toLowerCase()
              )

              if (existing) {
                await tx.transactionTemplate.update({
                  where: { id: existing.id },
                  data: {
                    description,
                    amount,
                    type,
                    category,
                    accountId,
                    party,
                    tags,
                    notes,
                    isActive,
                  },
                })
                summary.templates!.updated++
              } else {
                const created = await tx.transactionTemplate.create({
                  data: {
                    userId: user.id,
                    name,
                    description,
                    amount,
                    type,
                    category,
                    accountId,
                    party,
                    tags,
                    notes,
                    isActive,
                  },
                })
                existingTemplates.push(created)
                summary.templates!.created++
              }
            } catch (e) {
              errors.push(`Template row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }

        if (sheetData.settlements) {
          initSummary("settlements")
          for (const row of sheetData.settlements) {
            try {
              const partyName = rowStr(row, "party")
              if (!partyName) continue

              const amount = parseNumber(rowRaw(row, "amount"))
              if (amount == null) {
                errors.push(`Settlement for party "${partyName}" skipped: invalid amount`)
                continue
              }

              const type = rowStr(row, "type") || "i_owe"
              const reason = rowStr(row, "reason") || null
              const isSettled = parseBoolean(rowRaw(row, "issettled", "settled")) ?? false
              const settledAt = parseDate(rowRaw(row, "settledat"))

              // Match by party + amount + type
              const existing = existingSettlements.find(
                (s) =>
                  s.party.toLowerCase() === partyName.toLowerCase() &&
                  Math.abs(s.amount - amount) < 0.01 &&
                  s.type === type
              )

              if (existing) {
                await tx.settlement.update({
                  where: { id: existing.id },
                  data: { reason, isSettled, settledAt },
                })
                summary.settlements!.updated++
              } else {
                const created = await tx.settlement.create({
                  data: {
                    userId: user.id,
                    party: partyName,
                    amount,
                    type,
                    reason,
                    isSettled,
                    settledAt,
                  },
                })
                existingSettlements.push(created)
                summary.settlements!.created++
              }
            } catch (e) {
              errors.push(`Settlement row error: ${e instanceof Error ? e.message : String(e)}`)
            }
          }
        }
      },
      { maxWait: 10_000, timeout: 20_000 }
    )

    // ---- Invalidate all caches ----
    invalidateUserCache(user.id, Object.values(USER_CACHE_SCOPES))

    // ---- Build response ----
    return NextResponse.json({
      success: true,
      summary,
      ...(errors.length > 0 ? { errors } : {}),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Excel import error:", error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: "Failed to import Excel file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
