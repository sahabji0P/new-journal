import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/sync - Load all user data
export async function GET() {
  try {
    const user = await requireAuth()

    // Load all user data in parallel
    const [
      accounts,
      transactions,
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
    ] = await Promise.all([
      prisma.financialAccount.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
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
      prisma.notification.findMany({
        where: { userId: user.id, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.userSettings.findUnique({
        where: { userId: user.id },
      }),
      prisma.transactionTemplate.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
      }),
      prisma.settlement.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.receipt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Create default settings if not exists
    const userSettings = settings || {
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

    return NextResponse.json({
      accounts,
      transactions,
      budgets,
      categories,
      parties,
      goals,
      watchlists,
      recurringTransactions,
      notifications,
      settings: userSettings,
      templates,
      settlements,
      receipts,
    })
  } catch (error) {
    console.error("Error syncing data:", error)
    return NextResponse.json(
      { error: "Failed to sync data" },
      { status: 500 }
    )
  }
}
