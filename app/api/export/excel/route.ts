import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import ExcelJS from "exceljs"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize a cell value to prevent CSV/formula injection.
 * Strips leading =, +, -, @, \t, \r from string values.
 */
function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/^[=+\-@\t\r]+/, "")
  }
  return value
}

/** Apply standard header styling + freeze pane to a worksheet. */
function styleSheet(
  ws: ExcelJS.Worksheet,
  tabColor: string,
  dateColumns: number[] = [],
  numberColumns: number[] = []
) {
  // Tab color
  ws.properties.tabColor = { argb: tabColor }

  // Freeze header row
  ws.views = [{ state: "frozen", ySplit: 1 }]

  // Style header row
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDDDDDD" },
  }
  headerRow.commit()

  // Column formatting
  ws.columns.forEach((col, idx) => {
    const colIndex = idx + 1
    // Auto-fit: use header length as a baseline with a minimum of 12
    const headerLength = col.header ? String(col.header).length : 8
    col.width = Math.max(headerLength + 4, 12)

    if (dateColumns.includes(colIndex)) {
      col.numFmt = "yyyy-mm-dd"
      col.width = Math.max(col.width!, 14)
    }

    if (numberColumns.includes(colIndex)) {
      col.numFmt = "#,##0.00"
      col.width = Math.max(col.width!, 14)
    }
  })
}

/** Add rows to a worksheet, sanitizing all string cell values. */
function addRows(ws: ExcelJS.Worksheet, rows: unknown[][]) {
  for (const row of rows) {
    ws.addRow(row.map(sanitize))
  }
}

// ---------------------------------------------------------------------------
// Sheet tab colors (distinct ARGB values for visual separation)
// ---------------------------------------------------------------------------
const TAB_COLORS = {
  accounts: "FF4CAF50",
  transactions: "FF2196F3",
  categories: "FF9C27B0",
  parties: "FFFF9800",
  budgets: "FFF44336",
  subBudgets: "FFFF5722",
  goals: "FF00BCD4",
  recurring: "FF3F51B5",
  watchlists: "FF795548",
  templates: "FF607D8B",
  settlements: "FFE91E63",
  settings: "FF009688",
} as const

// ---------------------------------------------------------------------------
// GET /api/export/excel
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const user = await requireAuth()
    const userId = user.id

    // -----------------------------------------------------------------------
    // Fetch all user data in parallel
    // -----------------------------------------------------------------------
    const [
      accounts,
      transactions,
      categories,
      parties,
      budgets,
      goals,
      recurringTransactions,
      watchlists,
      templates,
      settlements,
      settings,
    ] = await Promise.all([
      prisma.financialAccount.findMany({ where: { userId } }),
      prisma.transaction.findMany({
        where: { userId },
        include: { account: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.category.findMany({ where: { userId } }),
      prisma.party.findMany({ where: { userId } }),
      prisma.budget.findMany({
        where: { userId },
        include: { subBudgets: true },
      }),
      prisma.goal.findMany({
        where: { userId },
        include: { account: { select: { name: true } } },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId },
        include: { account: { select: { name: true } } },
      }),
      prisma.watchlist.findMany({ where: { userId } }),
      prisma.transactionTemplate.findMany({ where: { userId } }),
      prisma.settlement.findMany({ where: { userId } }),
      prisma.userSettings.findFirst({ where: { userId } }),
    ])

    // -----------------------------------------------------------------------
    // Build workbook
    // -----------------------------------------------------------------------
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Money Tracker"
    workbook.created = new Date()

    // --- Sheet 1: Accounts ---
    const wsAccounts = workbook.addWorksheet("Accounts")
    wsAccounts.columns = [
      { header: "Name", key: "name" },
      { header: "Balance", key: "balance" },
      { header: "Type", key: "type" },
      { header: "Color", key: "color" },
      { header: "Icon", key: "icon" },
      { header: "Is Active", key: "isActive" },
    ]
    addRows(
      wsAccounts,
      accounts.map((a) => [a.name, a.balance, a.type, a.color, a.icon, a.isActive])
    )
    styleSheet(wsAccounts, TAB_COLORS.accounts, [], [2])

    // --- Sheet 2: Transactions ---
    const wsTransactions = workbook.addWorksheet("Transactions")
    wsTransactions.columns = [
      { header: "Date", key: "date" },
      { header: "Description", key: "description" },
      { header: "Amount", key: "amount" },
      { header: "Type", key: "type" },
      { header: "Category", key: "category" },
      { header: "Account Name", key: "accountName" },
      { header: "Party", key: "party" },
      { header: "Notes", key: "notes" },
      { header: "Tags", key: "tags" },
      { header: "Is Shared", key: "isShared" },
      { header: "Total Amount", key: "totalAmount" },
    ]
    addRows(
      wsTransactions,
      transactions.map((t) => [
        t.date,
        t.description,
        t.amount,
        t.type,
        t.category,
        t.account.name,
        t.party,
        t.notes,
        (t.tags ?? []).join(", "),
        t.isShared,
        t.totalAmount,
      ])
    )
    styleSheet(wsTransactions, TAB_COLORS.transactions, [1], [3, 11])

    // --- Sheet 3: Categories ---
    const wsCategories = workbook.addWorksheet("Categories")
    wsCategories.columns = [
      { header: "Name", key: "name" },
      { header: "Type", key: "type" },
      { header: "Color", key: "color" },
      { header: "Icon", key: "icon" },
      { header: "Is Default", key: "isDefault" },
    ]
    addRows(
      wsCategories,
      categories.map((c) => [c.name, c.type, c.color, c.icon, c.isDefault])
    )
    styleSheet(wsCategories, TAB_COLORS.categories)

    // --- Sheet 4: Parties ---
    const wsParties = workbook.addWorksheet("Parties")
    wsParties.columns = [{ header: "Name", key: "name" }]
    addRows(
      wsParties,
      parties.map((p) => [p.name])
    )
    styleSheet(wsParties, TAB_COLORS.parties)

    // --- Sheet 5: Budgets ---
    const wsBudgets = workbook.addWorksheet("Budgets")
    wsBudgets.columns = [
      { header: "Name", key: "name" },
      { header: "Type", key: "type" },
      { header: "Method", key: "method" },
      { header: "Period Type", key: "periodType" },
      { header: "Total Allocated", key: "totalAllocated" },
      { header: "Total Spent", key: "totalSpent" },
      { header: "Warning Threshold", key: "warningThreshold" },
      { header: "Critical Threshold", key: "criticalThreshold" },
      { header: "Alert Window Days", key: "alertWindowDays" },
      { header: "Enforcement Mode", key: "enforcementMode" },
      { header: "Start Date", key: "startDate" },
      { header: "End Date", key: "endDate" },
      { header: "Rollover", key: "rollover" },
      { header: "Is Active", key: "isActive" },
    ]
    addRows(
      wsBudgets,
      budgets.map((b) => [
        b.name,
        b.type,
        b.method,
        b.periodType,
        b.totalAllocated,
        b.totalSpent,
        b.warningThreshold,
        b.criticalThreshold,
        b.alertWindowDays,
        b.enforcementMode,
        b.startDate,
        b.endDate,
        b.rollover,
        b.isActive,
      ])
    )
    styleSheet(wsBudgets, TAB_COLORS.budgets, [11, 12], [5, 6, 7, 8])

    // --- Sheet 6: SubBudgets (flattened from budgets) ---
    const wsSubBudgets = workbook.addWorksheet("SubBudgets")
    wsSubBudgets.columns = [
      { header: "Budget Name", key: "budgetName" },
      { header: "Category", key: "category" },
      { header: "Allocated", key: "allocated" },
      { header: "Spent", key: "spent" },
      { header: "Alert Threshold", key: "alertThreshold" },
    ]
    const subBudgetRows: unknown[][] = []
    for (const budget of budgets) {
      for (const sb of budget.subBudgets) {
        subBudgetRows.push([
          budget.name,
          sb.category,
          sb.allocated,
          sb.spent,
          sb.alertThreshold,
        ])
      }
    }
    addRows(wsSubBudgets, subBudgetRows)
    styleSheet(wsSubBudgets, TAB_COLORS.subBudgets, [], [3, 4, 5])

    // --- Sheet 7: Goals ---
    const wsGoals = workbook.addWorksheet("Goals")
    wsGoals.columns = [
      { header: "Name", key: "name" },
      { header: "Target Amount", key: "targetAmount" },
      { header: "Current Amount", key: "currentAmount" },
      { header: "Target Date", key: "targetDate" },
      { header: "Monthly Contribution", key: "monthlyContribution" },
      { header: "Priority", key: "priority" },
      { header: "Color", key: "color" },
      { header: "Icon", key: "icon" },
      { header: "Account Name", key: "accountName" },
      { header: "Include In Spending Plan", key: "includeInSpendingPlan" },
      { header: "Notes", key: "notes" },
      { header: "Is Active", key: "isActive" },
    ]
    addRows(
      wsGoals,
      goals.map((g) => [
        g.name,
        g.targetAmount,
        g.currentAmount,
        g.targetDate,
        g.monthlyContribution,
        g.priority,
        g.color,
        g.icon,
        g.account?.name ?? null,
        g.includeInSpendingPlan,
        g.notes,
        g.isActive,
      ])
    )
    styleSheet(wsGoals, TAB_COLORS.goals, [4], [2, 3, 5])

    // --- Sheet 8: Recurring Transactions ---
    const wsRecurring = workbook.addWorksheet("Recurring Transactions")
    wsRecurring.columns = [
      { header: "Description", key: "description" },
      { header: "Amount", key: "amount" },
      { header: "Type", key: "type" },
      { header: "Category", key: "category" },
      { header: "Frequency", key: "frequency" },
      { header: "Account Name", key: "accountName" },
      { header: "Start Date", key: "startDate" },
      { header: "Next Due Date", key: "nextDueDate" },
      { header: "Is Active", key: "isActive" },
      { header: "Auto Create", key: "autoCreate" },
      { header: "Reminder Days", key: "reminderDays" },
      { header: "Notes", key: "notes" },
      { header: "Tags", key: "tags" },
    ]
    addRows(
      wsRecurring,
      recurringTransactions.map((r) => [
        r.description,
        r.amount,
        r.type,
        r.category,
        r.frequency,
        r.account.name,
        r.startDate,
        r.nextDueDate,
        r.isActive,
        r.autoCreate,
        r.reminderDays,
        r.notes,
        (r.tags ?? []).join(", "),
      ])
    )
    styleSheet(wsRecurring, TAB_COLORS.recurring, [7, 8], [2])

    // --- Sheet 9: Watchlists ---
    const wsWatchlists = workbook.addWorksheet("Watchlists")
    wsWatchlists.columns = [
      { header: "Name", key: "name" },
      { header: "Type", key: "type" },
      { header: "Value", key: "value" },
      { header: "Budget Limit", key: "budgetLimit" },
      { header: "Period", key: "period" },
      { header: "Start Date", key: "startDate" },
      { header: "End Date", key: "endDate" },
      { header: "Alert Enabled", key: "alertEnabled" },
      { header: "Alert Threshold", key: "alertThreshold" },
      { header: "Color", key: "color" },
      { header: "Is Active", key: "isActive" },
    ]
    addRows(
      wsWatchlists,
      watchlists.map((w) => [
        w.name,
        w.type,
        w.value,
        w.budgetLimit,
        w.period,
        w.startDate,
        w.endDate,
        w.alertEnabled,
        w.alertThreshold,
        w.color,
        w.isActive,
      ])
    )
    styleSheet(wsWatchlists, TAB_COLORS.watchlists, [6, 7], [4, 9])

    // --- Sheet 10: Templates ---
    const wsTemplates = workbook.addWorksheet("Templates")
    wsTemplates.columns = [
      { header: "Name", key: "name" },
      { header: "Description", key: "description" },
      { header: "Amount", key: "amount" },
      { header: "Type", key: "type" },
      { header: "Category", key: "category" },
      { header: "Account Name", key: "accountName" },
      { header: "Party", key: "party" },
      { header: "Tags", key: "tags" },
      { header: "Notes", key: "notes" },
      { header: "Is Active", key: "isActive" },
    ]
    // Build accountId → name lookup for templates
    const accountIdToName = new Map(accounts.map((a) => [a.id, a.name]))
    addRows(
      wsTemplates,
      templates.map((t) => [
        t.name,
        t.description,
        t.amount,
        t.type,
        t.category,
        t.accountId ? (accountIdToName.get(t.accountId) ?? null) : null,
        t.party,
        (t.tags ?? []).join(", "),
        t.notes,
        t.isActive,
      ])
    )
    styleSheet(wsTemplates, TAB_COLORS.templates, [], [3])

    // --- Sheet 11: Settlements ---
    const wsSettlements = workbook.addWorksheet("Settlements")
    wsSettlements.columns = [
      { header: "Party", key: "party" },
      { header: "Amount", key: "amount" },
      { header: "Type", key: "type" },
      { header: "Reason", key: "reason" },
      { header: "Is Settled", key: "isSettled" },
      { header: "Settled At", key: "settledAt" },
    ]
    addRows(
      wsSettlements,
      settlements.map((s) => [
        s.party,
        s.amount,
        s.type,
        s.reason,
        s.isSettled,
        s.settledAt,
      ])
    )
    styleSheet(wsSettlements, TAB_COLORS.settlements, [6], [2])

    // --- Sheet 12: Settings (key-value rows) ---
    const wsSettings = workbook.addWorksheet("Settings")
    wsSettings.columns = [
      { header: "Key", key: "key" },
      { header: "Value", key: "value" },
    ]
    if (settings) {
      const excludedKeys = new Set([
        "id",
        "userId",
        "createdAt",
        "updatedAt",
      ])
      const settingsRows: unknown[][] = []
      for (const [key, value] of Object.entries(settings)) {
        if (excludedKeys.has(key)) continue
        settingsRows.push([key, String(value)])
      }
      addRows(wsSettings, settingsRows)
    }
    styleSheet(wsSettings, TAB_COLORS.settings)

    // -----------------------------------------------------------------------
    // Write workbook to buffer and return response
    // -----------------------------------------------------------------------
    const buffer = await workbook.xlsx.writeBuffer()
    const today = new Date().toISOString().split("T")[0]

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="core-export-${today}.xlsx"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (
      error instanceof Error &&
      error.message === "Unauthorized"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.error("[export/excel] Failed to generate export:", error)
    return NextResponse.json(
      { error: "Failed to generate Excel export" },
      { status: 500 }
    )
  }
}
