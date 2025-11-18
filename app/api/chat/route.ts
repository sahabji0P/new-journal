import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

// Type definitions for financial data
interface FinancialAccountData {
  id: string
  name: string
  type: string
  balance: number
}

interface TransactionData {
  id: string
  date: Date
  type: string
  amount: number
  description: string
  category: string
}

interface BudgetData {
  name: string
  totalAllocated: number
  subBudgets: { category: string }[]
}

interface GoalData {
  name: string
  currentAmount: number
  targetAmount: number
}

interface InsightData {
  title: string
  description: string
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// GET /api/chat - Get chat history
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
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

// POST /api/chat - Send a message to the AI chatbot
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { message } = body

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: 'user',
        content: message,
      },
    })

    // Fetch user's financial context
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)

    const [accounts, transactions, budgets, goals, recentInsights] = await Promise.all([
      prisma.financialAccount.findMany({
        where: { userId: user.id },
      }) as Promise<FinancialAccountData[]>,
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: subMonths(now, 3) }, // Last 3 months
        },
        orderBy: { date: 'desc' },
        take: 100,
      }) as Promise<TransactionData[]>,
      prisma.budget.findMany({
        where: { userId: user.id, isActive: true },
        include: { subBudgets: true },
      }) as Promise<BudgetData[]>,
      prisma.goal.findMany({
        where: { userId: user.id, isActive: true },
      }) as Promise<GoalData[]>,
      prisma.insight.findMany({
        where: { userId: user.id, isArchived: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }) as Promise<InsightData[]>,
    ])

    // Calculate key metrics
    const totalBalance = accounts.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0)
    const thisMonthTransactions = transactions.filter(
      t => t.date >= thisMonthStart && t.date <= thisMonthEnd
    )
    const thisMonthIncome = thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum: number, t) => sum + t.amount, 0)
    const thisMonthExpenses = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum: number, t) => sum + Math.abs(t.amount), 0)

    // Category breakdown
    const categoryBreakdown = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount)
        return acc
      }, {} as Record<string, number>)

    // Build context for AI
    const context = `
You are Saathi, a friendly and knowledgeable financial assistant for a personal finance tracking application. Your name means "companion" or "friend" in Hindi, and you embody that spirit - you're here to be a supportive partner in the user's financial journey. Your role is to help users understand their financial data, provide insights, and answer questions about their money management with warmth and expertise.

## User's Financial Overview:

### Accounts (${accounts.length} total):
${accounts.map(acc => `- ${acc.name} (${acc.type}): $${acc.balance.toFixed(2)}`).join('\n')}
**Total Balance: $${totalBalance.toFixed(2)}**

### This Month's Summary (${format(now, 'MMMM yyyy')}):
- Income: $${thisMonthIncome.toFixed(2)}
- Expenses: $${thisMonthExpenses.toFixed(2)}
- Net: $${(thisMonthIncome - thisMonthExpenses).toFixed(2)}
- Transaction Count: ${thisMonthTransactions.length}

### Top Spending Categories This Month:
${Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)} (${((amt / thisMonthExpenses) * 100).toFixed(1)}%)`)
  .join('\n')}

### Active Budgets (${budgets.length}):
${budgets.map(b => {
  const spent = thisMonthTransactions
    .filter(t => t.type === 'expense' && b.subBudgets.some(sb => sb.category === t.category))
    .reduce((sum: number, t) => sum + Math.abs(t.amount), 0)
  const percentage = (spent / b.totalAllocated) * 100
  return `- ${b.name}: $${spent.toFixed(2)} / $${b.totalAllocated.toFixed(2)} (${percentage.toFixed(1)}%)`
}).join('\n')}

### Active Goals (${goals.length}):
${goals.map(g => {
  const progress = (g.currentAmount / g.targetAmount) * 100
  return `- ${g.name}: $${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)} (${progress.toFixed(1)}%)`
}).join('\n')}

### Recent Insights:
${recentInsights.map(i => `- ${i.title}: ${i.description}`).join('\n')}

### Recent Transactions (last 10):
${transactions.slice(0, 10).map(t =>
  `- ${format(new Date(t.date), 'MMM dd')}: ${t.description} - ${t.type === 'income' ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)} (${t.category})`
).join('\n')}

## Your Guidelines:
1. Be conversational, friendly, and encouraging
2. Use emojis sparingly but appropriately (💰 📊 🎯 💳 etc.)
3. Provide actionable insights and recommendations
4. When discussing money, always format it clearly with $ and 2 decimal places
5. If asked about specific transactions, budgets, or accounts, reference the data above
6. If the user asks something you cannot answer with the provided data, politely explain what information is available
7. Encourage good financial habits like budgeting, saving, and tracking spending
8. Be empathetic about financial challenges
9. Keep responses concise (2-4 paragraphs max) unless detailed analysis is requested
10. When appropriate, suggest using the insights feature or checking specific reports

User's Question: ${message}

Provide a helpful, personalized response based on their financial data.
`

    // Generate AI response
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" })
    const result = await model.generateContent(context)
    const response = result.response.text()

    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: 'assistant',
        content: response,
      },
    })

    return NextResponse.json({
      message: assistantMessage,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing chat history:", error)
    return NextResponse.json(
      { error: "Failed to clear chat history" },
      { status: 500 }
    )
  }
}
