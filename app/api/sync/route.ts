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

// GET /api/sync - Load user data by scope
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const scope = (searchParams.get("scope") || "full") as SyncScope

    const wantsCore = scope === "core" || scope === "full"
    const wantsAdvanced = scope === "advanced" || scope === "full"

    let accounts: unknown[] = []
    let transactionsWithAccountName: unknown[] = []
    let budgets: unknown[] = []
    let categories: unknown[] = []
    let notifications: unknown[] = []
    let settings: unknown = defaultUserSettings

    if (wantsCore) {
      const [coreAccounts, coreTransactions, coreBudgets, coreCategories, coreNotifications, coreSettings] = await Promise.all([
        prisma.financialAccount.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.transaction.findMany({
          where: { userId: user.id },
          include: {
            account: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: scope === "core" ? 300 : undefined,
        }),
        prisma.budget.findMany({
          where: { userId: user.id },
          include: { subBudgets: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.category.findMany({
          where: { userId: user.id },
          orderBy: { name: 'asc' },
        }),
        prisma.notification.findMany({
          where: { userId: user.id, isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.userSettings.findUnique({
          where: { userId: user.id },
        }),
      ])

      accounts = coreAccounts
      budgets = coreBudgets
      categories = coreCategories
      notifications = coreNotifications
      settings = coreSettings || defaultUserSettings

      transactionsWithAccountName = coreTransactions.map(transaction => {
        const { account, ...rest } = transaction
        return {
          ...rest,
          accountName: account?.name || "",
        }
      })
    }

    let parties: unknown[] = []
    let goals: unknown[] = []
    let watchlists: unknown[] = []
    let recurringTransactions: unknown[] = []
    let templates: unknown[] = []
    let settlements: unknown[] = []
    let receipts: unknown[] = []

    if (wantsAdvanced) {
      const [
        advancedParties,
        advancedGoals,
        advancedWatchlists,
        advancedRecurringTransactions,
        advancedTemplates,
        advancedSettlements,
        advancedReceipts,
      ] = await Promise.all([
        prisma.party.findMany({
          where: { userId: user.id },
          orderBy: { name: 'asc' },
        }),
        prisma.goal.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.watchlist.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.recurringTransaction.findMany({
          where: { userId: user.id },
          orderBy: { nextDueDate: 'asc' },
        }),
        safeQuery(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          () => (prisma as any).transactionTemplate?.findMany({
            where: { userId: user.id },
            orderBy: { name: 'asc' },
          }) || Promise.resolve([]),
          []
        ),
        safeQuery(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          () => (prisma as any).settlement?.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
          }) || Promise.resolve([]),
          []
        ),
        safeQuery(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          () => (prisma as any).receipt?.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
          }) || Promise.resolve([]),
          []
        ),
      ])

      parties = advancedParties
      goals = advancedGoals
      watchlists = advancedWatchlists
      recurringTransactions = advancedRecurringTransactions
      templates = advancedTemplates
      settlements = advancedSettlements
      receipts = advancedReceipts
    }

    return NextResponse.json({
      accounts,
      transactions: transactionsWithAccountName,
      budgets,
      categories,
      parties,
      goals,
      watchlists,
      recurringTransactions,
      notifications,
      settings,
      templates,
      settlements,
      receipts,
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
