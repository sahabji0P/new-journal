"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { addDays, addMonths, addWeeks, addYears, isBefore, parseISO } from "date-fns"
import type {
  Account,
  AppNotification,
  AppSettings,
  Budget,
  Category,
  Goal,
  Party,
  RecurringTransaction,
  Transaction,
  Watchlist,
  TransactionTemplate,
  Settlement,
  Receipt,
} from "@/lib/types"

interface AppContextType {
  // Accounts
  accounts: Account[]
  addAccount: (account: Omit<Account, "id" | "balance">) => void
  updateAccount: (id: number, account: Partial<Account>) => void
  deleteAccount: (id: number) => void

  // Transactions
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id">) => void
  updateTransaction: (id: number, transaction: Partial<Transaction>) => void
  deleteTransaction: (id: number) => void

  // Budgets
  budgets: Budget[]
  addBudget: (budget: Omit<Budget, "id" | "totalSpent">) => void
  updateBudget: (id: number, budget: Partial<Budget>) => void
  deleteBudget: (id: number) => void

  // Categories
  categories: Category[]
  addCategory: (category: Omit<Category, "id">) => void
  updateCategory: (id: number, category: Partial<Category>) => void
  deleteCategory: (id: number) => void

  // Parties (Payees/Payers)
  parties: Party[]
  addParty: (party: Omit<Party, "id">) => void
  updateParty: (id: number, party: Partial<Party>) => void
  deleteParty: (id: number) => void

  // Goals
  goals: Goal[]
  addGoal: (goal: Omit<Goal, "id" | "currentAmount">) => void
  updateGoal: (id: number, goal: Partial<Goal>) => void
  deleteGoal: (id: number) => void
  contributeToGoal: (id: number, amount: number) => void

  // Watchlists
  watchlists: Watchlist[]
  addWatchlist: (watchlist: Omit<Watchlist, "id">) => void
  updateWatchlist: (id: number, watchlist: Partial<Watchlist>) => void
  deleteWatchlist: (id: number) => void

  // Recurring Transactions
  recurringTransactions: RecurringTransaction[]
  addRecurringTransaction: (recurring: Omit<RecurringTransaction, "id" | "nextDueDate">) => void
  updateRecurringTransaction: (id: number, recurring: Partial<RecurringTransaction>) => void
  deleteRecurringTransaction: (id: number) => void
  processRecurringTransactions: () => void

  // Notifications
  notifications: AppNotification[]
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp">) => void
  markNotificationAsRead: (id: number) => void
  clearAllNotifications: () => void

  // Settings
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void

  // Selected accounts for filtering
  selectedAccountIds: number[]
  setSelectedAccountIds: (ids: number[]) => void
  toggleAccountSelection: (id: number) => void

  // Export/Import
  exportData: () => string
  importData: (jsonData: string) => boolean
  exportTransactionsCSV: () => string

  // Transaction Templates
  templates: TransactionTemplate[]
  addTemplate: (template: Omit<TransactionTemplate, "id">) => void
  updateTemplate: (id: number, template: Partial<TransactionTemplate>) => void
  deleteTemplate: (id: number) => void
  createTransactionFromTemplate: (templateId: number, overrides?: Partial<Transaction>) => void

  // Settlements (Who owes whom)
  settlements: Settlement[]
  addSettlement: (settlement: Omit<Settlement, "id">) => void
  updateSettlement: (id: number, settlement: Partial<Settlement>) => void
  deleteSettlement: (id: number) => void
  completeSettlement: (id: number, paidDate: string, paymentMethod?: string) => void

  // Receipts
  receipts: Receipt[]
  addReceipt: (receipt: Omit<Receipt, "id">) => void
  deleteReceipt: (id: string) => void
  getReceiptsByTransaction: (transactionId: number) => Receipt[]

  // Utility functions
  formatCurrency: (amount: number) => string
  formatDate: (date: string | Date) => string
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Initial mock data
const initialAccounts: Account[] = [
  { id: 1, name: "Checking", balance: 8500.5, type: "checking" },
  { id: 2, name: "Savings", balance: 15000.0, type: "savings" },
  { id: 3, name: "Credit Card", balance: -500.25, type: "credit" },
]

const initialTransactions: Transaction[] = [
  {
    id: 1,
    description: "Groceries",
    amount: -75.5,
    date: "2025-09-10",
    category: "Food",
    type: "expense",
    accountId: 1,
    accountName: "Checking",
  },
  {
    id: 2,
    description: "Salary",
    amount: 2500.0,
    date: "2025-09-09",
    category: "Income",
    type: "income",
    accountId: 1,
    accountName: "Checking",
  },
  {
    id: 3,
    description: "Netflix Subscription",
    amount: -15.99,
    date: "2025-09-08",
    category: "Entertainment",
    type: "expense",
    accountId: 3,
    accountName: "Credit Card",
    tags: ["subscription"],
  },
  {
    id: 4,
    description: "Gas",
    amount: -45.0,
    date: "2025-09-07",
    category: "Transport",
    type: "expense",
    accountId: 1,
    accountName: "Checking",
  },
  {
    id: 5,
    description: "Freelance Project",
    amount: 1200.0,
    date: "2025-09-05",
    category: "Income",
    type: "income",
    accountId: 2,
    accountName: "Savings",
  },
  {
    id: 6,
    description: "Restaurant",
    amount: -85.0,
    date: "2025-09-04",
    category: "Food",
    type: "expense",
    accountId: 1,
    accountName: "Checking",
  },
]

const initialCategories: Category[] = [
  { id: 1, name: "Food", type: "expense" },
  { id: 2, name: "Transport", type: "expense" },
  { id: 3, name: "Entertainment", type: "expense" },
  { id: 4, name: "Income", type: "income" },
  { id: 5, name: "Shopping", type: "expense" },
  { id: 6, name: "Utilities", type: "expense" },
  { id: 7, name: "Healthcare", type: "expense" },
  { id: 8, name: "Investment", type: "both" },
]

const initialBudgets: Budget[] = [
  {
    id: 1,
    name: "Monthly Budget",
    type: "monthly",
    totalAllocated: 3000,
    totalSpent: 1500,
    subBudgets: [
      { id: 1, category: "Food", allocated: 500, spent: 160.5 },
      { id: 2, category: "Transport", allocated: 200, spent: 45.0 },
      { id: 3, category: "Entertainment", allocated: 100, spent: 15.99 },
    ],
  },
]

const initialGoals: Goal[] = [
  {
    id: 1,
    name: "Emergency Fund",
    targetAmount: 10000,
    currentAmount: 3500,
    targetDate: "2026-12-31",
    monthlyContribution: 500,
    priority: "high",
    includeInSpendingPlan: true,
  },
]

const initialRecurring: RecurringTransaction[] = [
  {
    id: 1,
    description: "Rent",
    amount: -1500,
    category: "Housing",
    type: "expense",
    accountId: 1,
    accountName: "Checking",
    frequency: "monthly",
    startDate: "2025-01-01",
    nextDueDate: "2025-10-01",
    isActive: true,
    autoCreate: false,
    reminderDays: 3,
  },
]

const initialSettings: AppSettings = {
  currency: "USD",
  currencySymbol: "$",
  dateFormat: "MM/DD/YYYY",
  language: "en",
  darkMode: true,
  notifications: {
    enabled: true,
    budgetAlerts: true,
    billReminders: true,
    goalMilestones: true,
    recurringTransactions: true,
  },
  privacy: {
    requireAuth: false,
    autoLockMinutes: 15,
  },
  display: {
    showCents: true,
    compactMode: false,
  },
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([])
  const [templates, setTemplates] = useState<TransactionTemplate[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAccounts = localStorage.getItem("accounts")
      const storedTransactions = localStorage.getItem("transactions")
      const storedBudgets = localStorage.getItem("budgets")
      const storedCategories = localStorage.getItem("categories")
      const storedParties = localStorage.getItem("parties")
      const storedGoals = localStorage.getItem("goals")
      const storedWatchlists = localStorage.getItem("watchlists")
      const storedRecurring = localStorage.getItem("recurringTransactions")
      const storedNotifications = localStorage.getItem("notifications")
      const storedSettings = localStorage.getItem("settings")
      const storedSelectedIds = localStorage.getItem("selectedAccountIds")
      const storedTemplates = localStorage.getItem("templates")
      const storedSettlements = localStorage.getItem("settlements")
      const storedReceipts = localStorage.getItem("receipts")

      setAccounts(storedAccounts ? JSON.parse(storedAccounts) : initialAccounts)
      setTransactions(storedTransactions ? JSON.parse(storedTransactions) : initialTransactions)
      setBudgets(storedBudgets ? JSON.parse(storedBudgets) : initialBudgets)
      setCategories(storedCategories ? JSON.parse(storedCategories) : initialCategories)
      setParties(storedParties ? JSON.parse(storedParties) : [])
      setGoals(storedGoals ? JSON.parse(storedGoals) : initialGoals)
      setWatchlists(storedWatchlists ? JSON.parse(storedWatchlists) : [])
      setRecurringTransactions(storedRecurring ? JSON.parse(storedRecurring) : initialRecurring)
      setNotifications(storedNotifications ? JSON.parse(storedNotifications) : [])
      setSettings(storedSettings ? JSON.parse(storedSettings) : initialSettings)
      setSelectedAccountIds(storedSelectedIds ? JSON.parse(storedSelectedIds) : [1, 2, 3])
      setTemplates(storedTemplates ? JSON.parse(storedTemplates) : [])
      setSettlements(storedSettlements ? JSON.parse(storedSettlements) : [])
      setReceipts(storedReceipts ? JSON.parse(storedReceipts) : [])

      setIsInitialized(true)
    }
  }, [])

  // Auto-save all state to localStorage
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem("accounts", JSON.stringify(accounts))
      localStorage.setItem("transactions", JSON.stringify(transactions))
      localStorage.setItem("budgets", JSON.stringify(budgets))
      localStorage.setItem("categories", JSON.stringify(categories))
      localStorage.setItem("parties", JSON.stringify(parties))
      localStorage.setItem("goals", JSON.stringify(goals))
      localStorage.setItem("watchlists", JSON.stringify(watchlists))
      localStorage.setItem("recurringTransactions", JSON.stringify(recurringTransactions))
      localStorage.setItem("notifications", JSON.stringify(notifications))
      localStorage.setItem("settings", JSON.stringify(settings))
      localStorage.setItem("selectedAccountIds", JSON.stringify(selectedAccountIds))
      localStorage.setItem("templates", JSON.stringify(templates))
      localStorage.setItem("settlements", JSON.stringify(settlements))
      localStorage.setItem("receipts", JSON.stringify(receipts))
    }
  }, [
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
    selectedAccountIds,
    templates,
    settlements,
    receipts,
    isInitialized,
  ])

  // Check for recurring transactions daily
  useEffect(() => {
    if (isInitialized) {
      processRecurringTransactions()
      const interval = setInterval(processRecurringTransactions, 1000 * 60 * 60) // Check every hour
      return () => clearInterval(interval)
    }
  }, [isInitialized, recurringTransactions])

  // Account CRUD operations
  const addAccount = (account: Omit<Account, "id" | "balance">) => {
    const newAccount = {
      ...account,
      id: Math.max(...accounts.map(a => a.id), 0) + 1,
      balance: 0,
    }
    setAccounts([...accounts, newAccount])
    toast.success(`Account "${account.name}" created successfully`)
  }

  const updateAccount = (id: number, updatedAccount: Partial<Account>) => {
    setAccounts(accounts.map(acc => (acc.id === id ? { ...acc, ...updatedAccount } : acc)))
    toast.success("Account updated successfully")
  }

  const deleteAccount = (id: number) => {
    setAccounts(accounts.filter(acc => acc.id !== id))
    setSelectedAccountIds(selectedAccountIds.filter(accId => accId !== id))
    toast.success("Account deleted successfully")
  }

  // Transaction CRUD operations
  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    // Auto-create party if it doesn't exist (case-insensitive check)
    if (transaction.party && transaction.party.trim()) {
      const partyName = transaction.party.trim()
      const existingParty = parties.find(p => p.name.toLowerCase() === partyName.toLowerCase())
      if (!existingParty) {
        const newParty = {
          name: partyName,
          id: Math.max(...parties.map(p => p.id), 0) + 1,
        }
        setParties([...parties, newParty])
      }
    }

    // Auto-create category if it doesn't exist (case-insensitive check)
    if (transaction.category && transaction.category.trim()) {
      const categoryName = transaction.category.trim()
      const existingCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
      if (!existingCategory) {
        const newCategory = {
          name: categoryName,
          type: transaction.type === "income" ? "income" as const : "expense" as const,
          id: Math.max(...categories.map(c => c.id), 0) + 1,
        }
        setCategories([...categories, newCategory])
      }
    }

    const newTransaction = {
      ...transaction,
      id: Math.max(...transactions.map(t => t.id), 0) + 1,
    }
    setTransactions([...transactions, newTransaction])

    // Update account balance
    const account = accounts.find(acc => acc.id === transaction.accountId)
    if (account) {
      updateAccount(account.id, { balance: account.balance + transaction.amount })
    }

    // Update budget spending if applicable
    if (transaction.type === "expense") {
      updateBudgetSpending(transaction.category, Math.abs(transaction.amount))
    }

    // Check watchlist alerts
    checkWatchlistAlerts(newTransaction)

    toast.success("Transaction added successfully")
  }

  const updateTransaction = (id: number, updatedTransaction: Partial<Transaction>) => {
    const oldTransaction = transactions.find(t => t.id === id)
    if (!oldTransaction) return

    // Reverse old transaction's effect on account balance
    const oldAccount = accounts.find(acc => acc.id === oldTransaction.accountId)
    if (oldAccount) {
      updateAccount(oldAccount.id, { balance: oldAccount.balance - oldTransaction.amount })
    }

    // Apply new transaction's effect
    const newAccountId = updatedTransaction.accountId ?? oldTransaction.accountId
    const newAmount = updatedTransaction.amount ?? oldTransaction.amount
    const newAccount = accounts.find(acc => acc.id === newAccountId)
    if (newAccount) {
      updateAccount(newAccount.id, { balance: newAccount.balance + newAmount })
    }

    setTransactions(transactions.map(t => (t.id === id ? { ...t, ...updatedTransaction } : t)))
    toast.success("Transaction updated successfully")
  }

  const deleteTransaction = (id: number) => {
    const transaction = transactions.find(t => t.id === id)
    if (transaction) {
      const account = accounts.find(acc => acc.id === transaction.accountId)
      if (account) {
        updateAccount(account.id, { balance: account.balance - transaction.amount })
      }
    }
    setTransactions(transactions.filter(t => t.id !== id))
    toast.success("Transaction deleted successfully")
  }

  // Budget CRUD operations
  const addBudget = (budget: Omit<Budget, "id" | "totalSpent">) => {
    const newBudget = {
      ...budget,
      id: Math.max(...budgets.map(b => b.id), 0) + 1,
      totalSpent: 0,
    }
    setBudgets([...budgets, newBudget])
    toast.success(`Budget "${budget.name}" created successfully`)
  }

  const updateBudget = (id: number, updatedBudget: Partial<Budget>) => {
    setBudgets(budgets.map(b => (b.id === id ? { ...b, ...updatedBudget } : b)))
    toast.success("Budget updated successfully")
  }

  const deleteBudget = (id: number) => {
    setBudgets(budgets.filter(b => b.id !== id))
    toast.success("Budget deleted successfully")
  }

  const updateBudgetSpending = (category: string, amount: number) => {
    setBudgets(prevBudgets =>
      prevBudgets.map(budget => {
        const updatedSubBudgets = budget.subBudgets.map(sub =>
          sub.category === category ? { ...sub, spent: sub.spent + amount } : sub
        )
        const newTotalSpent = budget.totalSpent + amount

        // Check if budget alert should be triggered
        const alertThreshold = 0.8 // 80%
        if (
          settings.notifications.budgetAlerts &&
          newTotalSpent / budget.totalAllocated >= alertThreshold &&
          budget.totalSpent / budget.totalAllocated < alertThreshold
        ) {
          addNotification({
            type: "budget",
            title: "Budget Alert",
            message: `You've reached ${Math.round((newTotalSpent / budget.totalAllocated) * 100)}% of your ${budget.name} budget!`,
            isRead: false,
          })
        }

        return {
          ...budget,
          subBudgets: updatedSubBudgets,
          totalSpent: newTotalSpent,
        }
      })
    )
  }

  // Category CRUD operations
  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory = {
      ...category,
      id: Math.max(...categories.map(c => c.id), 0) + 1,
    }
    setCategories([...categories, newCategory])
    toast.success(`Category "${category.name}" created successfully`)
  }

  const updateCategory = (id: number, updatedCategory: Partial<Category>) => {
    setCategories(categories.map(c => (c.id === id ? { ...c, ...updatedCategory } : c)))
    toast.success("Category updated successfully")
  }

  const deleteCategory = (id: number) => {
    setCategories(categories.filter(c => c.id !== id))
    toast.success("Category deleted successfully")
  }

  // Party CRUD operations
  const addParty = (party: Omit<Party, "id">) => {
    const newParty = {
      ...party,
      id: Math.max(...parties.map(p => p.id), 0) + 1,
    }
    setParties([...parties, newParty])
    toast.success(`Party "${party.name}" added successfully`)
  }

  const updateParty = (id: number, updatedParty: Partial<Party>) => {
    setParties(parties.map(p => (p.id === id ? { ...p, ...updatedParty } : p)))
    toast.success("Party updated successfully")
  }

  const deleteParty = (id: number) => {
    setParties(parties.filter(p => p.id !== id))
    toast.success("Party deleted successfully")
  }

  // Goal CRUD operations
  const addGoal = (goal: Omit<Goal, "id" | "currentAmount">) => {
    const newGoal = {
      ...goal,
      id: Math.max(...goals.map(g => g.id), 0) + 1,
      currentAmount: 0,
    }
    setGoals([...goals, newGoal])
    toast.success(`Goal "${goal.name}" created successfully`)
  }

  const updateGoal = (id: number, updatedGoal: Partial<Goal>) => {
    setGoals(goals.map(g => (g.id === id ? { ...g, ...updatedGoal } : g)))
    toast.success("Goal updated successfully")
  }

  const deleteGoal = (id: number) => {
    setGoals(goals.filter(g => g.id !== id))
    toast.success("Goal deleted successfully")
  }

  const contributeToGoal = (id: number, amount: number) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        const newAmount = g.currentAmount + amount

        // Check if goal reached
        if (newAmount >= g.targetAmount && g.currentAmount < g.targetAmount) {
          addNotification({
            type: "goal",
            title: "Goal Achieved! 🎉",
            message: `Congratulations! You've reached your goal: ${g.name}`,
            isRead: false,
          })
        }

        return { ...g, currentAmount: newAmount }
      }
      return g
    }))
    toast.success("Contribution added to goal")
  }

  // Watchlist CRUD operations
  const addWatchlist = (watchlist: Omit<Watchlist, "id">) => {
    const newWatchlist = {
      ...watchlist,
      id: Math.max(...watchlists.map(w => w.id), 0) + 1,
    }
    setWatchlists([...watchlists, newWatchlist])
    toast.success(`Watchlist "${watchlist.name}" created successfully`)
  }

  const updateWatchlist = (id: number, updatedWatchlist: Partial<Watchlist>) => {
    setWatchlists(watchlists.map(w => (w.id === id ? { ...w, ...updatedWatchlist } : w)))
    toast.success("Watchlist updated successfully")
  }

  const deleteWatchlist = (id: number) => {
    setWatchlists(watchlists.filter(w => w.id !== id))
    toast.success("Watchlist deleted successfully")
  }

  const checkWatchlistAlerts = (transaction: Transaction) => {
    watchlists.forEach(watchlist => {
      if (!watchlist.alertEnabled) return

      let matches = false
      if (watchlist.type === "category" && transaction.category === watchlist.value) {
        matches = true
      } else if (watchlist.type === "payee" && transaction.description.includes(watchlist.value)) {
        matches = true
      } else if (watchlist.type === "tag" && transaction.tags?.includes(watchlist.value)) {
        matches = true
      }

      if (matches && watchlist.budgetLimit) {
        // Calculate total spending for this watchlist
        const relevantTransactions = transactions.filter(t => {
          if (watchlist.type === "category") return t.category === watchlist.value
          if (watchlist.type === "payee") return t.description.includes(watchlist.value)
          if (watchlist.type === "tag") return t.tags?.includes(watchlist.value)
          return false
        })

        const totalSpent = relevantTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) + Math.abs(transaction.amount)
        const threshold = watchlist.alertThreshold || 80

        if ((totalSpent / watchlist.budgetLimit) * 100 >= threshold) {
          addNotification({
            type: "warning",
            title: "Watchlist Alert",
            message: `Your spending on "${watchlist.name}" has reached ${Math.round((totalSpent / watchlist.budgetLimit) * 100)}% of your limit!`,
            isRead: false,
          })
        }
      }
    })
  }

  // Recurring Transaction CRUD operations
  const addRecurringTransaction = (recurring: Omit<RecurringTransaction, "id" | "nextDueDate">) => {
    const nextDueDate = calculateNextDueDate(recurring.startDate, recurring.frequency)
    const newRecurring = {
      ...recurring,
      id: Math.max(...recurringTransactions.map(r => r.id), 0) + 1,
      nextDueDate,
    }
    setRecurringTransactions([...recurringTransactions, newRecurring])
    toast.success(`Recurring transaction "${recurring.description}" created successfully`)
  }

  const updateRecurringTransaction = (id: number, updatedRecurring: Partial<RecurringTransaction>) => {
    setRecurringTransactions(recurringTransactions.map(r => (r.id === id ? { ...r, ...updatedRecurring } : r)))
    toast.success("Recurring transaction updated successfully")
  }

  const deleteRecurringTransaction = (id: number) => {
    setRecurringTransactions(recurringTransactions.filter(r => r.id !== id))
    toast.success("Recurring transaction deleted successfully")
  }

  const calculateNextDueDate = (currentDate: string, frequency: RecurringTransaction["frequency"]): string => {
    const date = parseISO(currentDate)
    switch (frequency) {
      case "daily":
        return addDays(date, 1).toISOString().split("T")[0]
      case "weekly":
        return addWeeks(date, 1).toISOString().split("T")[0]
      case "biweekly":
        return addWeeks(date, 2).toISOString().split("T")[0]
      case "monthly":
        return addMonths(date, 1).toISOString().split("T")[0]
      case "quarterly":
        return addMonths(date, 3).toISOString().split("T")[0]
      case "yearly":
        return addYears(date, 1).toISOString().split("T")[0]
      default:
        return currentDate
    }
  }

  const processRecurringTransactions = () => {
    const today = new Date().toISOString().split("T")[0]

    recurringTransactions.forEach(recurring => {
      if (!recurring.isActive) return

      // Check if due date has passed
      if (isBefore(parseISO(recurring.nextDueDate), parseISO(today)) || recurring.nextDueDate === today) {
        if (recurring.autoCreate) {
          // Automatically create the transaction
          addTransaction({
            description: recurring.description,
            amount: recurring.amount,
            category: recurring.category,
            type: recurring.type,
            accountId: recurring.accountId,
            accountName: recurring.accountName,
            date: today,
            recurringId: recurring.id,
            notes: recurring.notes,
            tags: recurring.tags,
          })

          // Update next due date
          const newNextDueDate = calculateNextDueDate(recurring.nextDueDate, recurring.frequency)
          updateRecurringTransaction(recurring.id, { nextDueDate: newNextDueDate })
        } else if (recurring.reminderDays) {
          // Send reminder notification
          addNotification({
            type: "recurring",
            title: "Recurring Transaction Due",
            message: `"${recurring.description}" is due today`,
            isRead: false,
          })
        }
      }
    })
  }

  // Notification operations
  const addNotification = (notification: Omit<AppNotification, "id" | "timestamp">) => {
    if (!settings.notifications.enabled) return

    const newNotification = {
      ...notification,
      id: Math.max(...notifications.map(n => n.id), 0) + 1,
      timestamp: new Date().toISOString(),
    }
    setNotifications([newNotification, ...notifications])

    // Show toast notification
    if (notification.type === "budget" || notification.type === "warning") {
      toast.warning(notification.message)
    } else if (notification.type === "goal") {
      toast.success(notification.message)
    } else {
      toast.info(notification.message)
    }
  }

  const markNotificationAsRead = (id: number) => {
    setNotifications(notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const clearAllNotifications = () => {
    setNotifications([])
    toast.success("All notifications cleared")
  }

  // Settings operations
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings({ ...settings, ...newSettings })
    toast.success("Settings updated successfully")
  }

  // Account selection helpers
  const toggleAccountSelection = (id: number) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(accId => accId !== id) : [...prev, id]
    )
  }

  // Export/Import operations
  const exportData = (): string => {
    const data = {
      accounts,
      transactions,
      budgets,
      categories,
      parties,
      goals,
      watchlists,
      recurringTransactions,
      settings,
      exportDate: new Date().toISOString(),
    }
    return JSON.stringify(data, null, 2)
  }

  const importData = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData)

      if (data.accounts) setAccounts(data.accounts)
      if (data.transactions) setTransactions(data.transactions)
      if (data.budgets) setBudgets(data.budgets)
      if (data.categories) setCategories(data.categories)
      if (data.parties) setParties(data.parties)
      if (data.goals) setGoals(data.goals)
      if (data.watchlists) setWatchlists(data.watchlists)
      if (data.recurringTransactions) setRecurringTransactions(data.recurringTransactions)
      if (data.settings) setSettings(data.settings)

      toast.success("Data imported successfully")
      return true
    } catch (error) {
      toast.error("Failed to import data. Invalid format.")
      return false
    }
  }

  const exportTransactionsCSV = (): string => {
    const headers = ["Date", "Description", "Category", "Account", "Type", "Amount", "Notes", "Tags"]
    const rows = transactions.map(t => [
      t.date,
      t.description,
      t.category,
      t.accountName,
      t.type,
      t.amount.toString(),
      t.notes || "",
      t.tags?.join(";") || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    return csvContent
  }

  // Transaction Template functions
  const addTemplate = (template: Omit<TransactionTemplate, "id">) => {
    const newTemplate = {
      ...template,
      id: Math.max(...templates.map(t => t.id), 0) + 1,
    }
    setTemplates([...templates, newTemplate])
    toast.success(`Template "${template.name}" created successfully`)
  }

  const updateTemplate = (id: number, updates: Partial<TransactionTemplate>) => {
    setTemplates(templates.map(t => (t.id === id ? { ...t, ...updates } : t)))
    toast.success("Template updated successfully")
  }

  const deleteTemplate = (id: number) => {
    const template = templates.find(t => t.id === id)
    setTemplates(templates.filter(t => t.id !== id))
    toast.success(`Template "${template?.name}" deleted successfully`)
  }

  const createTransactionFromTemplate = (templateId: number, overrides?: Partial<Transaction>) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      toast.error("Template not found")
      return
    }

    const account = accounts.find(a => a.id === (overrides?.accountId || template.accountId))
    if (!account) {
      toast.error("Please select an account")
      return
    }

    const newTransaction: Omit<Transaction, "id"> = {
      description: overrides?.description || template.description,
      amount: overrides?.amount || template.amount || 0,
      date: overrides?.date || new Date().toISOString().split("T")[0],
      category: overrides?.category || template.category,
      type: overrides?.type || template.type,
      accountId: account.id,
      accountName: account.name,
      party: overrides?.party || template.party,
      tags: overrides?.tags || template.tags,
      notes: overrides?.notes || template.notes,
      templateId: templateId,
    }

    addTransaction(newTransaction)
    toast.success(`Transaction created from template "${template.name}"`)
  }

  // Settlement functions
  const addSettlement = (settlement: Omit<Settlement, "id">) => {
    const newSettlement = {
      ...settlement,
      id: Math.max(...settlements.map(s => s.id), 0) + 1,
    }
    setSettlements([...settlements, newSettlement])
    toast.success("Settlement recorded successfully")
  }

  const updateSettlement = (id: number, updates: Partial<Settlement>) => {
    setSettlements(settlements.map(s => (s.id === id ? { ...s, ...updates } : s)))
    toast.success("Settlement updated successfully")
  }

  const deleteSettlement = (id: number) => {
    setSettlements(settlements.filter(s => s.id !== id))
    toast.success("Settlement deleted successfully")
  }

  const completeSettlement = (id: number, paidDate: string, paymentMethod?: string) => {
    setSettlements(
      settlements.map(s =>
        s.id === id
          ? { ...s, status: "completed" as const, paidDate, paymentMethod }
          : s
      )
    )
    toast.success("Settlement marked as paid")
  }

  // Receipt functions
  const addReceipt = (receipt: Omit<Receipt, "id">) => {
    const newReceipt = {
      ...receipt,
      id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    setReceipts([...receipts, newReceipt])
    toast.success("Receipt uploaded successfully")
  }

  const deleteReceipt = (id: string) => {
    setReceipts(receipts.filter(r => r.id !== id))
    toast.success("Receipt deleted successfully")
  }

  const getReceiptsByTransaction = (transactionId: number): Receipt[] => {
    return receipts.filter(r => r.transactionId === transactionId)
  }

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: settings.currency,
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const value: AppContextType = {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    parties,
    addParty,
    updateParty,
    deleteParty,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    watchlists,
    addWatchlist,
    updateWatchlist,
    deleteWatchlist,
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    processRecurringTransactions,
    notifications,
    addNotification,
    markNotificationAsRead,
    clearAllNotifications,
    settings,
    updateSettings,
    selectedAccountIds,
    setSelectedAccountIds,
    toggleAccountSelection,
    exportData,
    importData,
    exportTransactionsCSV,
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    createTransactionFromTemplate,
    settlements,
    addSettlement,
    updateSettlement,
    deleteSettlement,
    completeSettlement,
    receipts,
    addReceipt,
    deleteReceipt,
    getReceiptsByTransaction,
    formatCurrency,
    formatDate,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
