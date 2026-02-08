import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// Helper to safely query a model (handles case where model doesn't exist after schema change)
async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query()
  } catch (error) {
    // If the model doesn't exist yet (needs prisma generate), return fallback
    console.warn("Query failed, returning fallback:", error)
    return fallback
  }
}

const defaultUserSettings = {
  currency: "USD",
  currencySymbol: "$",
  dateFormat: "MM/DD/YYYY",
  language: "en",
  darkMode: false,
  notificationsEnabled: true,
  budgetAlertsEnabled: true,
  billRemindersEnabled: true,
  goalMilestonesEnabled: true,
  recurringTransactionsEnabled: true,
  requireAuth: false,
  autoLockMinutes: 15,
  showCents: true,
  compactMode: false,
}

type SyncScope = "core" | "advanced" | "full"

type SyncTransaction = {
  account: { name: string } | null
  id: string
  userId: string
  accountId: string
  description: string
  amount: number
  date: Date
  category: string
  type: string
  party: string | null
  notes: string | null
  tags: string[]
  recurringId: string | null
  createdAt: Date
  updatedAt: Date
}

function mapTransactionsWithAccountName(transactions: SyncTransaction[]) {
  return transactions.map(transaction => {
    const { account, ...rest } = transaction
    return {
      ...rest,
      accountName: account?.name || "",
    }
  })
}

async function fetchCorePayload(userId: string, includeAllTransactions: boolean) {
  const [
    coreAccounts,
    coreTransactions,
    coreBudgets,
    coreCategories,
    coreNotifications,
    coreSettings,
  ] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: "desc" },
      ...(includeAllTransactions ? {} : { take: 300 }),
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { subBudgets: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.userSettings.findUnique({
      where: { userId },
    }),
  ])

  return {
    accounts: coreAccounts,
    transactions: mapTransactionsWithAccountName(coreTransactions as SyncTransaction[]),
    budgets: coreBudgets,
    categories: coreCategories,
    notifications: coreNotifications,
    settings: coreSettings || defaultUserSettings,
  }
}

async function fetchAdvancedPayload(userId: string, includeTransactions: boolean) {
  const [
    advancedParties,
    advancedGoals,
    advancedWatchlists,
    advancedRecurringTransactions,
    advancedTemplates,
    advancedSettlements,
    advancedReceipts,
    advancedTransactions,
  ] = await Promise.all([
    prisma.party.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { nextDueDate: "asc" },
    }),
    safeQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (prisma as any).transactionTemplate?.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }) || Promise.resolve([]),
      []
    ),
    safeQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (prisma as any).settlement?.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }) || Promise.resolve([]),
      []
    ),
    safeQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (prisma as any).receipt?.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }) || Promise.resolve([]),
      []
    ),
    includeTransactions
      ? prisma.transaction.findMany({
          where: { userId },
          include: {
            account: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
  ])

  return {
    parties: advancedParties,
    goals: advancedGoals,
    watchlists: advancedWatchlists,
    recurringTransactions: advancedRecurringTransactions,
    templates: advancedTemplates,
    settlements: advancedSettlements,
    receipts: advancedReceipts,
    transactions: includeTransactions
      ? mapTransactionsWithAccountName(advancedTransactions as SyncTransaction[])
      : [],
  }
}

// GET /api/sync - Load user data by scope
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const scope = (searchParams.get("scope") || "full") as SyncScope
    const includeTransactions =
      searchParams.get("includeTransactions") === "true" || searchParams.get("includeTransactions") === "1"

    const wantsCore = scope === "core" || scope === "full"
    const wantsAdvanced = scope === "advanced" || scope === "full"

    const [coreData, advancedData] = await Promise.all([
      wantsCore ? fetchCorePayload(user.id, scope === "full") : Promise.resolve(null),
      wantsAdvanced
        ? fetchAdvancedPayload(user.id, scope === "advanced" ? includeTransactions : false)
        : Promise.resolve(null),
    ])

    const shouldUseAdvancedTransactions = scope === "advanced" && includeTransactions

    return NextResponse.json({
      accounts: coreData?.accounts || [],
      transactions: shouldUseAdvancedTransactions
        ? advancedData?.transactions || []
        : coreData?.transactions || [],
      budgets: coreData?.budgets || [],
      categories: coreData?.categories || [],
      parties: advancedData?.parties || [],
      goals: advancedData?.goals || [],
      watchlists: advancedData?.watchlists || [],
      recurringTransactions: advancedData?.recurringTransactions || [],
      notifications: coreData?.notifications || [],
      settings: coreData?.settings || defaultUserSettings,
      templates: advancedData?.templates || [],
      settlements: advancedData?.settlements || [],
      receipts: advancedData?.receipts || [],
      scope,
    })
  } catch (error) {
    console.error("Error syncing data:", error)
    return NextResponse.json(
      { error: "Failed to sync data" },
      { status: 500 }
    )
  }
}
