// Core Data Models for Money Management App

export interface Transaction {
  id: number
  description: string
  amount: number // Positive for income, negative for expenses
  date: string // ISO date string
  category: string
  type: "income" | "expense"
  accountId: number
  accountName: string
  party?: string // Payee/Payer name (e.g., "Amazon", "Walmart")
  notes?: string // Optional notes
  tags?: string[] // Optional tags for custom tracking
  recurringId?: number // Link to recurring transaction if auto-created
}

export interface Party {
  id: number
  name: string // Name of payee/payer (e.g., "Amazon", "Starbucks", "Netflix")
}

export interface Account {
  id: number
  name: string
  balance: number // Can be negative for credit accounts
  type: "checking" | "savings" | "credit"
  color?: string // Optional color for UI
  icon?: string // Optional icon identifier
}

export interface SubBudget {
  id: number
  category: string
  allocated: number
  spent: number
  alertThreshold?: number // Alert when spending reaches this percentage (default 80%)
}

export interface Budget {
  id: number
  name: string
  type: "monthly" | "event" | "trip"
  totalAllocated: number
  totalSpent: number
  subBudgets: SubBudget[]
  startDate?: string
  endDate?: string
  rollover?: boolean // Allow unused budget to rollover to next period
}

export interface Category {
  id: number
  name: string
  type: "income" | "expense" | "both"
  color?: string
  icon?: string
}

// Recurring Transactions
export interface RecurringTransaction {
  id: number
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  accountId: number
  accountName: string
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
  startDate: string
  endDate?: string // Optional end date
  nextDueDate: string
  isActive: boolean
  autoCreate: boolean // Automatically create transactions
  reminderDays?: number // Days before to remind (if not auto-creating)
  notes?: string
  tags?: string[]
}

// Savings Goals
export interface Goal {
  id: number
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  monthlyContribution?: number
  priority: "low" | "medium" | "high"
  color?: string
  icon?: string
  accountId?: number // Optional linked account
  includeInSpendingPlan: boolean
  notes?: string
}

// Watchlists - Custom spending tracking
export interface Watchlist {
  id: number
  name: string
  type: "category" | "tag" | "payee"
  value: string // Category name, tag, or payee to watch
  budgetLimit?: number // Optional spending limit
  period: "monthly" | "yearly" | "custom"
  startDate?: string
  endDate?: string
  alertEnabled: boolean
  alertThreshold?: number // Percentage threshold for alerts
  color?: string
}

// Application Settings
export interface AppSettings {
  currency: string
  currencySymbol: string
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
  language: string
  darkMode: boolean
  notifications: {
    enabled: boolean
    budgetAlerts: boolean
    billReminders: boolean
    goalMilestones: boolean
    recurringTransactions: boolean
  }
  privacy: {
    requireAuth: boolean
    autoLockMinutes: number
  }
  display: {
    showCents: boolean
    compactMode: boolean
  }
}

// Notification/Alert
export interface AppNotification {
  id: number
  type: "budget" | "bill" | "goal" | "recurring" | "info" | "warning"
  title: string
  message: string
  timestamp: string
  isRead: boolean
  actionLink?: string // Optional link to relevant page
}

// Report Configuration
export interface ReportConfig {
  id: number
  name: string
  type: "spending" | "income" | "net" | "category" | "trend"
  dateRange: {
    start: string
    end: string
    preset?: "week" | "month" | "quarter" | "year" | "all" | "custom"
  }
  filters: {
    accounts?: number[]
    categories?: string[]
    tags?: string[]
    types?: ("income" | "expense")[]
  }
  chartType: "bar" | "line" | "pie" | "area"
  groupBy?: "day" | "week" | "month" | "category" | "account"
}

// Helper type for form inputs
export type TransactionInput = Omit<Transaction, "id" | "accountName">

export type AccountInput = Omit<Account, "id" | "balance">

export type BudgetInput = Omit<Budget, "id" | "totalSpent">

export type RecurringTransactionInput = Omit<RecurringTransaction, "id" | "accountName" | "nextDueDate">

export type GoalInput = Omit<Goal, "id" | "currentAmount">

export type WatchlistInput = Omit<Watchlist, "id">
