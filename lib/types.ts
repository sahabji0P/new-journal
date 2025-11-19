// Core Data Models for Money Management App
// Note: All IDs are strings (cuid) to match database schema

// Split Expense Models
export interface ExpenseSplit {
  id: string
  personName: string
  amount: number
  isPaid: boolean
  paidDate?: string
}

// Receipt/Attachment Models
export interface Receipt {
  id: string
  transactionId?: string
  fileName: string
  fileUrl?: string // URL for cloud storage
  imageData?: string // Base64 data for client-side handling
  thumbnailData?: string // Optional thumbnail
  fileType?: string
  fileSize: number // in bytes
  uploadDate?: string // When the receipt was uploaded
}

// Transaction Template Models
export interface TransactionTemplate {
  id: string
  name: string
  description?: string
  amount?: number // Optional, user can override
  category: string
  type: "income" | "expense"
  party?: string
  tags?: string[]
  accountId?: string
  notes?: string
  icon?: string
  color?: string
  isActive?: boolean
}

// Settlement Models (Who owes whom)
export interface Settlement {
  id: string
  fromPerson: string  // Who owes the money
  toPerson: string    // Who is owed the money
  amount: number
  date: string
  status: "pending" | "completed"
  paidDate?: string
  notes?: string
}

export interface Transaction {
  id: string
  description: string
  amount: number // Positive for income, negative for expenses
  date: string // ISO date string
  category: string
  type: "income" | "expense"
  accountId: string
  accountName?: string
  party?: string // Payee/Payer name (e.g., "Amazon", "Walmart")
  notes?: string // Optional notes
  tags?: string[] // Optional tags for custom tracking
  recurringId?: string // Link to recurring transaction if auto-created

  // Split expense fields
  isShared?: boolean // Whether this is a shared/split expense
  splits?: ExpenseSplit[] // How the expense is split among people
  totalAmount?: number // Original amount before split (for shared expenses)

  // Receipt and template fields
  receiptId?: string // Link to receipt image
  templateId?: string // If created from a template
}

export interface Party {
  id: string
  name: string // Name of payee/payer (e.g., "Amazon", "Starbucks", "Netflix")
}

export interface Account {
  id: string
  name: string
  balance: number // Can be negative for credit accounts
  type: "checking" | "savings" | "credit"
  color?: string // Optional color for UI
  icon?: string // Optional icon identifier
  isActive?: boolean
}

export interface SubBudget {
  id: string
  category: string
  allocated: number
  spent: number
  alertThreshold?: number // Alert when spending reaches this percentage (default 80%)
}

export interface Budget {
  id: string
  name: string
  type: "monthly" | "event" | "trip"
  totalAllocated: number
  totalSpent: number
  subBudgets: SubBudget[]
  startDate?: string
  endDate?: string
  rollover?: boolean // Allow unused budget to rollover to next period
  isActive?: boolean
}

export interface Category {
  id: string
  name: string
  type: "income" | "expense" | "both"
  color?: string
  icon?: string
  isDefault?: boolean
}

// Recurring Transactions
export interface RecurringTransaction {
  id: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  accountId: string
  accountName?: string
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
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  monthlyContribution?: number
  priority: "low" | "medium" | "high"
  color?: string
  icon?: string
  accountId?: string // Optional linked account
  includeInSpendingPlan: boolean
  notes?: string
  isActive?: boolean
}

// Watchlists - Custom spending tracking
export interface Watchlist {
  id: string
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
  isActive?: boolean
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
  id: string
  type: "budget" | "bill" | "goal" | "recurring" | "info" | "warning"
  title: string
  message: string
  timestamp: string
  isRead: boolean
  actionLink?: string // Optional link to relevant page
}

// Report Configuration
export interface ReportConfig {
  id: string
  name: string
  type: "spending" | "income" | "net" | "category" | "trend"
  dateRange: {
    start: string
    end: string
    preset?: "week" | "month" | "quarter" | "year" | "all" | "custom"
  }
  filters: {
    accounts?: string[]
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

export type TemplateInput = Omit<TransactionTemplate, "id">

export type SettlementInput = Omit<Settlement, "id">

export type ReceiptInput = Omit<Receipt, "id">

// Analytics Types
export interface SpendingTrend {
  period: string // Date or period label
  amount: number
  category?: string
  type?: "income" | "expense"
}

export interface CategoryInsight {
  category: string
  totalSpent: number
  transactionCount: number
  averageAmount: number
  percentageOfTotal: number
  trend: "up" | "down" | "stable"
  trendPercentage: number
}

export interface MonthlyComparison {
  currentMonth: {
    income: number
    expense: number
    net: number
  }
  previousMonth: {
    income: number
    expense: number
    net: number
  }
  change: {
    income: number
    expense: number
    net: number
  }
}

// Export Configuration
export interface ExportConfig {
  format: "csv" | "pdf" | "excel"
  dateRange: {
    start: string
    end: string
  }
  includeCharts?: boolean
  filters?: {
    accounts?: string[]
    categories?: string[]
    types?: ("income" | "expense")[]
  }
}
