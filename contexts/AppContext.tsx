"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
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
import { AppStageLoader } from "@/components/AppStageLoader"

interface DbSettingsShape {
  currency: string
  currencySymbol: string
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
  language: string
  darkMode: boolean
  notificationsEnabled: boolean
  budgetAlertsEnabled: boolean
  billRemindersEnabled: boolean
  goalMilestonesEnabled: boolean
  recurringTransactionsEnabled: boolean
  requireAuth: boolean
  autoLockMinutes: number
  showCents: boolean
  compactMode: boolean
}

export type AppLoadingStage = "preparing" | "syncing" | "organizing" | "ready"

interface AppContextType {
  // Accounts
  accounts: Account[]
  addAccount: (account: Omit<Account, "id" | "balance">) => void
  updateAccount: (id: string, account: Partial<Account>) => void
  deleteAccount: (id: string) => void

  // Transactions
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id">) => Transaction | null
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void

  // Budgets
  budgets: Budget[]
  addBudget: (budget: Omit<Budget, "id" | "totalSpent">) => void
  updateBudget: (id: string, budget: Partial<Budget>) => void
  deleteBudget: (id: string) => void

  // Categories
  categories: Category[]
  addCategory: (category: Omit<Category, "id">) => void
  updateCategory: (id: string, category: Partial<Category>) => void
  deleteCategory: (id: string) => void

  // Parties (Payees/Payers)
  parties: Party[]
  addParty: (party: Omit<Party, "id">) => void
  updateParty: (id: string, party: Partial<Party>) => void
  deleteParty: (id: string) => void

  // Goals
  goals: Goal[]
  addGoal: (goal: Omit<Goal, "id" | "currentAmount">) => void
  updateGoal: (id: string, goal: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void

  // Watchlists
  watchlists: Watchlist[]
  addWatchlist: (watchlist: Omit<Watchlist, "id">) => void
  updateWatchlist: (id: string, watchlist: Partial<Watchlist>) => void
  deleteWatchlist: (id: string) => void

  // Recurring Transactions
  recurringTransactions: RecurringTransaction[]
  addRecurringTransaction: (recurring: Omit<RecurringTransaction, "id" | "nextDueDate">) => void
  updateRecurringTransaction: (id: string, recurring: Partial<RecurringTransaction>) => void
  deleteRecurringTransaction: (id: string) => void
  processRecurringTransactions: () => void

  // Notifications
  notifications: AppNotification[]
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp">) => void
  markNotificationAsRead: (id: string) => void
  clearAllNotifications: () => void

  // Settings
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void

  // Selected accounts for filtering
  selectedAccountIds: string[]
  setSelectedAccountIds: (ids: string[]) => void
  toggleAccountSelection: (id: string) => void

  // Export/Import
  exportData: () => string
  importData: (jsonData: string) => boolean
  exportTransactionsCSV: () => string

  // Transaction Templates
  templates: TransactionTemplate[]
  addTemplate: (template: Omit<TransactionTemplate, "id">) => void
  updateTemplate: (id: string, template: Partial<TransactionTemplate>) => void
  deleteTemplate: (id: string) => void
  createTransactionFromTemplate: (templateId: string, overrides?: Partial<Transaction>) => void

  // Settlements (Who owes whom)
  settlements: Settlement[]
  addSettlement: (settlement: Omit<Settlement, "id">) => void
  updateSettlement: (id: string, settlement: Partial<Settlement>) => void
  deleteSettlement: (id: string) => void
  completeSettlement: (id: string, paidDate: string, paymentMethod?: string) => void

  // Receipts
  receipts: Receipt[]
  addReceipt: (receipt: Omit<Receipt, "id">) => void
  deleteReceipt: (id: string) => void
  getReceiptsByTransaction: (transactionId: string) => Receipt[]

  // Utility functions
  formatCurrency: (amount: number) => string
  formatDate: (date: string | Date) => string

  // Loading state
  isLoading: boolean
  loadingStage: AppLoadingStage
  loadingProgress: number
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Default settings (used when no settings are loaded)
const defaultSettings: AppSettings = {
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

function mapDbSettingsToAppSettings(
  input?: (Partial<DbSettingsShape> & Partial<AppSettings>) | null
): AppSettings {
  if (!input) return defaultSettings

  const nestedNotifications = input.notifications
  const nestedPrivacy = input.privacy
  const nestedDisplay = input.display

  return {
    currency: input.currency ?? defaultSettings.currency,
    currencySymbol: input.currencySymbol ?? defaultSettings.currencySymbol,
    dateFormat: input.dateFormat ?? defaultSettings.dateFormat,
    language: input.language ?? defaultSettings.language,
    darkMode: input.darkMode ?? defaultSettings.darkMode,
    notifications: {
      enabled:
        input.notificationsEnabled ??
        nestedNotifications?.enabled ??
        defaultSettings.notifications.enabled,
      budgetAlerts:
        input.budgetAlertsEnabled ??
        nestedNotifications?.budgetAlerts ??
        defaultSettings.notifications.budgetAlerts,
      billReminders:
        input.billRemindersEnabled ??
        nestedNotifications?.billReminders ??
        defaultSettings.notifications.billReminders,
      goalMilestones:
        input.goalMilestonesEnabled ??
        nestedNotifications?.goalMilestones ??
        defaultSettings.notifications.goalMilestones,
      recurringTransactions:
        input.recurringTransactionsEnabled ??
        nestedNotifications?.recurringTransactions ??
        defaultSettings.notifications.recurringTransactions,
    },
    privacy: {
      requireAuth:
        input.requireAuth ?? nestedPrivacy?.requireAuth ?? defaultSettings.privacy.requireAuth,
      autoLockMinutes:
        input.autoLockMinutes ??
        nestedPrivacy?.autoLockMinutes ??
        defaultSettings.privacy.autoLockMinutes,
    },
    display: {
      showCents: input.showCents ?? nestedDisplay?.showCents ?? defaultSettings.display.showCents,
      compactMode:
        input.compactMode ?? nestedDisplay?.compactMode ?? defaultSettings.display.compactMode,
    },
  }
}

function mapAppSettingsToDb(input: AppSettings): DbSettingsShape {
  return {
    currency: input.currency,
    currencySymbol: input.currencySymbol,
    dateFormat: input.dateFormat,
    language: input.language,
    darkMode: input.darkMode,
    notificationsEnabled: input.notifications.enabled,
    budgetAlertsEnabled: input.notifications.budgetAlerts,
    billRemindersEnabled: input.notifications.billReminders,
    goalMilestonesEnabled: input.notifications.goalMilestones,
    recurringTransactionsEnabled: input.notifications.recurringTransactions,
    requireAuth: input.privacy.requireAuth,
    autoLockMinutes: input.privacy.autoLockMinutes,
    showCents: input.display.showCents,
    compactMode: input.display.compactMode,
  }
}

function normalizeTransactionAmount(amount: number, type: Transaction["type"]): number {
  const abs = Math.abs(amount)
  return type === "expense" ? -abs : abs
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [templates, setTemplates] = useState<TransactionTemplate[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState<AppLoadingStage>("preparing")
  const [loadingProgress, setLoadingProgress] = useState(10)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load data from API on mount
  useEffect(() => {
    let cancelled = false

    const parseJsonResponse = async <T,>(response: Response, fallback: T): Promise<T> => {
      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to load data")
        }
        throw new Error(`Failed to load data: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        return fallback
      }

      const data = await response.json()
      return (data as T) ?? fallback
    }

    const loadData = async () => {
      if (status === "loading") return

      if (status === "unauthenticated") {
        if (!cancelled) {
          setIsLoading(false)
          setLoadingStage("ready")
          setLoadingProgress(100)
        }
        return
      }

      try {
        setIsLoading(true)
        setLoadingStage("preparing")
        setLoadingProgress(20)

        const advancedPromise = fetch("/api/sync?scope=advanced&includeTransactions=true")
        setLoadingStage("syncing")
        setLoadingProgress(45)

        const response = await fetch("/api/sync?scope=core")
        const data = await parseJsonResponse<{
          accounts?: Account[]
          transactions?: Transaction[]
          budgets?: Budget[]
          categories?: Category[]
          notifications?: AppNotification[]
          settings?: Partial<DbSettingsShape> & Partial<AppSettings>
        }>(response, {})
        if (cancelled) return

        const coreAccounts = data.accounts || []

        setAccounts(coreAccounts)
        setTransactions(data.transactions || [])
        setBudgets(data.budgets || [])
        setCategories(data.categories || [])
        setNotifications(data.notifications || [])
        setSettings(mapDbSettingsToAppSettings(data.settings))

        // Set selected account IDs to all accounts by default
        if (coreAccounts.length > 0) {
          setSelectedAccountIds(prev => (prev.length > 0 ? prev : coreAccounts.map((a: Account) => a.id)))
        }

        setLoadingStage("organizing")
        setLoadingProgress(75)
        setIsInitialized(true)

        const advancedResponse = await advancedPromise
        if (advancedResponse.ok) {
          const advancedData = await parseJsonResponse<{
            transactions?: Transaction[]
            parties?: Party[]
            goals?: Goal[]
            watchlists?: Watchlist[]
            recurringTransactions?: RecurringTransaction[]
            templates?: TransactionTemplate[]
            settlements?: Settlement[]
            receipts?: Receipt[]
          }>(advancedResponse, {})

          if (cancelled) return

          if (Array.isArray(advancedData.transactions) && advancedData.transactions.length > 0) {
            setTransactions(advancedData.transactions)
          }
          setParties(advancedData.parties || [])
          setGoals(advancedData.goals || [])
          setWatchlists(advancedData.watchlists || [])
          setRecurringTransactions(advancedData.recurringTransactions || [])
          setTemplates(advancedData.templates || [])
          setSettlements(advancedData.settlements || [])
          setReceipts(advancedData.receipts || [])
        }

        if (!cancelled) {
          setLoadingProgress(100)
          setLoadingStage("ready")
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error loading data:", error)
        if (!cancelled) {
          toast.error("Failed to load your data. Please try refreshing the page.")
          setLoadingStage("ready")
          setLoadingProgress(100)
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [status])

  const syncBudgetsFromServer = useCallback(async () => {
    try {
      const response = await fetch("/api/budgets")
      if (!response.ok) return
      const latestBudgets = await response.json()
      if (Array.isArray(latestBudgets)) {
        setBudgets(latestBudgets)
      }
    } catch (error) {
      console.error("Error syncing budgets:", error)
    }
  }, [])

  // Check for recurring transactions daily
  useEffect(() => {
    if (isInitialized) {
      processRecurringTransactions()
      const interval = setInterval(processRecurringTransactions, 1000 * 60 * 60) // Check every hour
      return () => clearInterval(interval)
    }
  }, [isInitialized, recurringTransactions])

  // Account CRUD operations
  const addAccount = async (account: Omit<Account, "id" | "balance">) => {
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      })

      if (!response.ok) throw new Error("Failed to create account")

      const newAccount = await response.json()
      setAccounts([...accounts, newAccount])
      toast.success(`Account "${account.name}" created successfully`)
    } catch (error) {
      console.error("Error creating account:", error)
      toast.error("Failed to create account")
    }
  }

  const updateAccount = async (id: string, updatedAccount: Partial<Account>) => {
    try {
      const response = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedAccount }),
      })

      if (!response.ok) throw new Error("Failed to update account")

      setAccounts(accounts.map(acc => (acc.id === id ? { ...acc, ...updatedAccount } : acc)))
      toast.success("Account updated successfully")
    } catch (error) {
      console.error("Error updating account:", error)
      toast.error("Failed to update account")
    }
  }

  const deleteAccount = async (id: string) => {
    try {
      const response = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete account")

      setAccounts(accounts.filter(acc => acc.id !== id))
      setSelectedAccountIds(selectedAccountIds.filter(accId => accId !== id))
      toast.success("Account deleted successfully")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account")
    }
  }

  // Transaction CRUD operations
  const addTransaction = (transaction: Omit<Transaction, "id">): Transaction => {
    const normalizedAmount = normalizeTransactionAmount(transaction.amount, transaction.type)

    // Create optimistic transaction with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newTransaction: Transaction = {
      ...transaction,
      amount: normalizedAmount,
      id: tempId,
    }

    // Optimistically update state
    setTransactions([...transactions, newTransaction])

    // Update account balance optimistically
    const account = accounts.find(acc => acc.id === transaction.accountId)
    if (account) {
      setAccounts(accounts.map(acc =>
        acc.id === account.id
          ? { ...acc, balance: acc.balance + normalizedAmount }
          : acc
      ))
    }

    // Check watchlist alerts
    checkWatchlistAlerts(newTransaction)

    // Make API call
    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...transaction, amount: normalizedAmount }),
    })
      .then(async response => {
        if (!response.ok) throw new Error("Failed to create transaction")
        const savedTransaction = await response.json()

        // Update with server-assigned ID
        setTransactions(prev =>
          prev.map(t => t.id === tempId ? { ...t, id: savedTransaction.id } : t)
        )

        void syncBudgetsFromServer()

        // Auto-create party if it doesn't exist
        if (transaction.party && transaction.party.trim()) {
          const partyName = transaction.party.trim()
          const existingParty = parties.find(p => p.name.toLowerCase() === partyName.toLowerCase())
          if (!existingParty) {
            addParty({ name: partyName })
          }
        }

        // Auto-create category if it doesn't exist
        if (transaction.category && transaction.category.trim()) {
          const categoryName = transaction.category.trim()
          const existingCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
          if (!existingCategory) {
            addCategory({
              name: categoryName,
              type: transaction.type === "income" ? "income" : "expense",
            })
          }
        }
      })
      .catch(error => {
        console.error("Error creating transaction:", error)
        toast.error("Failed to save transaction")
        // Revert optimistic update
        setTransactions(prev => prev.filter(t => t.id !== tempId))
        if (account) {
          setAccounts(prev => prev.map(acc =>
            acc.id === account.id
              ? { ...acc, balance: acc.balance - normalizedAmount }
              : acc
          ))
        }
      })

    toast.success("Transaction added successfully")
    return newTransaction
  }

  const updateTransaction = async (id: string, updatedTransaction: Partial<Transaction>) => {
    const oldTransaction = transactions.find(t => t.id === id)
    if (!oldTransaction) return

    try {
      const response = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedTransaction }),
      })

      if (!response.ok) throw new Error("Failed to update transaction")

      // Reverse old transaction's effect on account balance
      const oldAccount = accounts.find(acc => acc.id === oldTransaction.accountId)
      if (oldAccount) {
        setAccounts(prev => prev.map(acc =>
          acc.id === oldAccount.id
            ? { ...acc, balance: acc.balance - oldTransaction.amount }
            : acc
        ))
      }

      // Apply new transaction's effect
      const newAccountId = updatedTransaction.accountId ?? oldTransaction.accountId
      const newAmount = updatedTransaction.amount ?? oldTransaction.amount
      const newAccount = accounts.find(acc => acc.id === newAccountId)
      if (newAccount) {
        setAccounts(prev => prev.map(acc =>
          acc.id === newAccount.id
            ? { ...acc, balance: acc.balance + newAmount }
            : acc
        ))
      }

      setTransactions(transactions.map(t => (t.id === id ? { ...t, ...updatedTransaction } : t)))
      void syncBudgetsFromServer()
      toast.success("Transaction updated successfully")
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("Failed to update transaction")
    }
  }

  const deleteTransaction = async (id: string) => {
    const transaction = transactions.find(t => t.id === id)

    try {
      const response = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete transaction")

      if (transaction) {
        const account = accounts.find(acc => acc.id === transaction.accountId)
        if (account) {
          setAccounts(prev => prev.map(acc =>
            acc.id === account.id
              ? { ...acc, balance: acc.balance - transaction.amount }
              : acc
          ))
        }
      }
      setTransactions(transactions.filter(t => t.id !== id))
      void syncBudgetsFromServer()
      toast.success("Transaction deleted successfully")
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast.error("Failed to delete transaction")
    }
  }

  // Budget CRUD operations
  const addBudget = async (budget: Omit<Budget, "id" | "totalSpent">) => {
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budget),
      })

      if (!response.ok) throw new Error("Failed to create budget")

      const newBudget = await response.json()
      setBudgets([...budgets, newBudget])
      toast.success(`Budget "${budget.name}" created successfully`)
    } catch (error) {
      console.error("Error creating budget:", error)
      toast.error("Failed to create budget")
    }
  }

  const updateBudget = async (id: string, updatedBudget: Partial<Budget>) => {
    try {
      const response = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedBudget }),
      })

      if (!response.ok) throw new Error("Failed to update budget")

      const savedBudget = await response.json()
      setBudgets(budgets.map(b => (b.id === id ? savedBudget : b)))
      toast.success("Budget updated successfully")
    } catch (error) {
      console.error("Error updating budget:", error)
      toast.error("Failed to update budget")
    }
  }

  const deleteBudget = async (id: string) => {
    try {
      const response = await fetch("/api/budgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete budget")

      setBudgets(budgets.filter(b => b.id !== id))
      toast.success("Budget deleted successfully")
    } catch (error) {
      console.error("Error deleting budget:", error)
      toast.error("Failed to delete budget")
    }
  }

  // Category CRUD operations
  const addCategory = async (category: Omit<Category, "id">) => {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(category),
      })

      if (!response.ok) throw new Error("Failed to create category")

      const newCategory = await response.json()
      setCategories([...categories, newCategory])
      toast.success(`Category "${category.name}" created successfully`)
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Failed to create category")
    }
  }

  const updateCategory = async (id: string, updatedCategory: Partial<Category>) => {
    try {
      const response = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedCategory }),
      })

      if (!response.ok) throw new Error("Failed to update category")

      setCategories(categories.map(c => (c.id === id ? { ...c, ...updatedCategory } : c)))
      toast.success("Category updated successfully")
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Failed to update category")
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete category")

      setCategories(categories.filter(c => c.id !== id))
      toast.success("Category deleted successfully")
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("Failed to delete category")
    }
  }

  // Party CRUD operations
  const addParty = async (party: Omit<Party, "id">) => {
    try {
      const response = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(party),
      })

      if (!response.ok) throw new Error("Failed to create party")

      const newParty = await response.json()
      setParties([...parties, newParty])
      toast.success(`Party "${party.name}" added successfully`)
    } catch (error) {
      console.error("Error creating party:", error)
      toast.error("Failed to create party")
    }
  }

  const updateParty = async (id: string, updatedParty: Partial<Party>) => {
    try {
      const response = await fetch("/api/parties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedParty }),
      })

      if (!response.ok) throw new Error("Failed to update party")

      setParties(parties.map(p => (p.id === id ? { ...p, ...updatedParty } : p)))
      toast.success("Party updated successfully")
    } catch (error) {
      console.error("Error updating party:", error)
      toast.error("Failed to update party")
    }
  }

  const deleteParty = async (id: string) => {
    try {
      const response = await fetch("/api/parties", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete party")

      setParties(parties.filter(p => p.id !== id))
      toast.success("Party deleted successfully")
    } catch (error) {
      console.error("Error deleting party:", error)
      toast.error("Failed to delete party")
    }
  }

  // Goal CRUD operations
  const addGoal = async (goal: Omit<Goal, "id" | "currentAmount">) => {
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
      })

      if (!response.ok) throw new Error("Failed to create goal")

      const newGoal = await response.json()
      setGoals([...goals, newGoal])
      toast.success(`Goal "${goal.name}" created successfully`)
    } catch (error) {
      console.error("Error creating goal:", error)
      toast.error("Failed to create goal")
    }
  }

  const updateGoal = async (id: string, updatedGoal: Partial<Goal>) => {
    try {
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedGoal }),
      })

      if (!response.ok) throw new Error("Failed to update goal")

      setGoals(goals.map(g => (g.id === id ? { ...g, ...updatedGoal } : g)))
      toast.success("Goal updated successfully")
    } catch (error) {
      console.error("Error updating goal:", error)
      toast.error("Failed to update goal")
    }
  }

  const deleteGoal = async (id: string) => {
    try {
      const response = await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete goal")

      setGoals(goals.filter(g => g.id !== id))
      toast.success("Goal deleted successfully")
    } catch (error) {
      console.error("Error deleting goal:", error)
      toast.error("Failed to delete goal")
    }
  }

  const contributeToGoal = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return

    const newAmount = goal.currentAmount + amount

    try {
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, currentAmount: newAmount }),
      })

      if (!response.ok) throw new Error("Failed to contribute to goal")

      setGoals(goals.map(g => {
        if (g.id === id) {
          // Check if goal reached
          if (newAmount >= g.targetAmount && g.currentAmount < g.targetAmount) {
            addNotification({
              type: "goal",
              title: "Goal Achieved!",
              message: `Congratulations! You've reached your goal: ${g.name}`,
              isRead: false,
            })
          }

          return { ...g, currentAmount: newAmount }
        }
        return g
      }))
      toast.success("Contribution added to goal")
    } catch (error) {
      console.error("Error contributing to goal:", error)
      toast.error("Failed to contribute to goal")
    }
  }

  // Watchlist CRUD operations
  const addWatchlist = async (watchlist: Omit<Watchlist, "id">) => {
    try {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(watchlist),
      })

      if (!response.ok) throw new Error("Failed to create watchlist")

      const newWatchlist = await response.json()
      setWatchlists([...watchlists, newWatchlist])
      toast.success(`Watchlist "${watchlist.name}" created successfully`)
    } catch (error) {
      console.error("Error creating watchlist:", error)
      toast.error("Failed to create watchlist")
    }
  }

  const updateWatchlist = async (id: string, updatedWatchlist: Partial<Watchlist>) => {
    try {
      const response = await fetch("/api/watchlists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedWatchlist }),
      })

      if (!response.ok) throw new Error("Failed to update watchlist")

      setWatchlists(watchlists.map(w => (w.id === id ? { ...w, ...updatedWatchlist } : w)))
      toast.success("Watchlist updated successfully")
    } catch (error) {
      console.error("Error updating watchlist:", error)
      toast.error("Failed to update watchlist")
    }
  }

  const deleteWatchlist = async (id: string) => {
    try {
      const response = await fetch("/api/watchlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete watchlist")

      setWatchlists(watchlists.filter(w => w.id !== id))
      toast.success("Watchlist deleted successfully")
    } catch (error) {
      console.error("Error deleting watchlist:", error)
      toast.error("Failed to delete watchlist")
    }
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
          const percentage = Math.round((totalSpent / watchlist.budgetLimit) * 100)
          const message = `Your spending on "${watchlist.name}" has reached ${percentage}% of your limit!`

          addNotification({
            type: "warning",
            title: "Watchlist Alert",
            message,
            isRead: false,
          })

          // Show toast alert for immediate visibility
          toast.warning(message, {
            duration: 5000,
            description: `Spent: $${totalSpent.toFixed(2)} / Limit: $${watchlist.budgetLimit.toFixed(2)}`
          })
        }
      }
    })
  }

  // Recurring Transaction CRUD operations
  const addRecurringTransaction = async (recurring: Omit<RecurringTransaction, "id" | "nextDueDate">) => {
    try {
      const nextDueDate = calculateNextDueDate(recurring.startDate, recurring.frequency)

      const response = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...recurring, nextDueDate }),
      })

      if (!response.ok) throw new Error("Failed to create recurring transaction")

      const newRecurring = await response.json()
      setRecurringTransactions([...recurringTransactions, newRecurring])
      toast.success(`Recurring transaction "${recurring.description}" created successfully`)
    } catch (error) {
      console.error("Error creating recurring transaction:", error)
      toast.error("Failed to create recurring transaction")
    }
  }

  const updateRecurringTransaction = async (id: string, updatedRecurring: Partial<RecurringTransaction>) => {
    try {
      const response = await fetch("/api/recurring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedRecurring }),
      })

      if (!response.ok) throw new Error("Failed to update recurring transaction")

      setRecurringTransactions(recurringTransactions.map(r => (r.id === id ? { ...r, ...updatedRecurring } : r)))
      toast.success("Recurring transaction updated successfully")
    } catch (error) {
      console.error("Error updating recurring transaction:", error)
      toast.error("Failed to update recurring transaction")
    }
  }

  const deleteRecurringTransaction = async (id: string) => {
    try {
      const response = await fetch("/api/recurring", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete recurring transaction")

      setRecurringTransactions(recurringTransactions.filter(r => r.id !== id))
      toast.success("Recurring transaction deleted successfully")
    } catch (error) {
      console.error("Error deleting recurring transaction:", error)
      toast.error("Failed to delete recurring transaction")
    }
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
  const addNotification = async (notification: Omit<AppNotification, "id" | "timestamp">) => {
    if (!settings.notifications?.enabled) return

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification = {
      ...notification,
      id: tempId,
      timestamp: new Date().toISOString(),
    }

    // Optimistically update state
    setNotifications([newNotification, ...notifications])

    // Show toast notification
    if (notification.type === "budget" || notification.type === "warning") {
      toast.warning(notification.message)
    } else if (notification.type === "goal") {
      toast.success(notification.message)
    } else {
      toast.info(notification.message)
    }

    // Make API call
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
      })

      if (!response.ok) throw new Error("Failed to save notification")

      const savedNotification = await response.json()
      setNotifications(prev =>
        prev.map(n => n.id === tempId ? { ...n, id: savedNotification.id } : n)
      )
    } catch (error) {
      console.error("Error saving notification:", error)
    }
  }

  const markNotificationAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })

      if (!response.ok) throw new Error("Failed to update notification")

      setNotifications(notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const clearAllNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })

      if (!response.ok) throw new Error("Failed to clear notifications")

      setNotifications([])
      toast.success("All notifications cleared")
    } catch (error) {
      console.error("Error clearing notifications:", error)
      toast.error("Failed to clear notifications")
    }
  }

  // Settings operations
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const mergedSettings: AppSettings = {
      ...settings,
      ...newSettings,
      notifications: {
        ...settings.notifications,
        ...(newSettings.notifications || {}),
      },
      privacy: {
        ...settings.privacy,
        ...(newSettings.privacy || {}),
      },
      display: {
        ...settings.display,
        ...(newSettings.display || {}),
      },
    }

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapAppSettingsToDb(mergedSettings)),
      })

      if (!response.ok) throw new Error("Failed to update settings")

      setSettings(mergedSettings)
      toast.success("Settings updated successfully")
    } catch (error) {
      console.error("Error updating settings:", error)
      toast.error("Failed to update settings")
    }
  }

  // Account selection helpers
  const toggleAccountSelection = (id: string) => {
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
  const addTemplate = async (template: Omit<TransactionTemplate, "id">) => {
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      })

      if (!response.ok) throw new Error("Failed to create template")

      const newTemplate = await response.json()
      setTemplates([...templates, newTemplate])
      toast.success(`Template "${template.name}" created successfully`)
    } catch (error) {
      console.error("Error creating template:", error)
      toast.error("Failed to create template")
    }
  }

  const updateTemplate = async (id: string, updates: Partial<TransactionTemplate>) => {
    try {
      const response = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) throw new Error("Failed to update template")

      setTemplates(templates.map(t => (t.id === id ? { ...t, ...updates } : t)))
      toast.success("Template updated successfully")
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    }
  }

  const deleteTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id)

    try {
      const response = await fetch("/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete template")

      setTemplates(templates.filter(t => t.id !== id))
      toast.success(`Template "${template?.name}" deleted successfully`)
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    }
  }

  const createTransactionFromTemplate = (templateId: string, overrides?: Partial<Transaction>) => {
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
      description: overrides?.description || template.description || "",
      amount: overrides?.amount || template.amount || 0,
      date: overrides?.date || new Date().toISOString().split("T")[0],
      category: overrides?.category || template.category,
      type: overrides?.type || template.type,
      accountId: account.id,
      accountName: account.name,
      party: overrides?.party || template.party,
      tags: overrides?.tags || template.tags,
      notes: overrides?.notes || template.notes,
      templateId,
    }

    addTransaction(newTransaction)
    toast.success(`Transaction created from template "${template.name}"`)
  }

  // Settlement functions
  const addSettlement = async (settlement: Omit<Settlement, "id">) => {
    try {
      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settlement),
      })

      if (!response.ok) throw new Error("Failed to create settlement")

      const newSettlement = await response.json()
      setSettlements([...settlements, newSettlement])
      toast.success("Settlement recorded successfully")
    } catch (error) {
      console.error("Error creating settlement:", error)
      toast.error("Failed to create settlement")
    }
  }

  const updateSettlement = async (id: string, updates: Partial<Settlement>) => {
    try {
      const response = await fetch("/api/settlements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!response.ok) throw new Error("Failed to update settlement")

      setSettlements(settlements.map(s => (s.id === id ? { ...s, ...updates } : s)))
      toast.success("Settlement updated successfully")
    } catch (error) {
      console.error("Error updating settlement:", error)
      toast.error("Failed to update settlement")
    }
  }

  const deleteSettlement = async (id: string) => {
    try {
      const response = await fetch("/api/settlements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete settlement")

      setSettlements(settlements.filter(s => s.id !== id))
      toast.success("Settlement deleted successfully")
    } catch (error) {
      console.error("Error deleting settlement:", error)
      toast.error("Failed to delete settlement")
    }
  }

  const completeSettlement = async (id: string, paidDate: string, paymentMethod?: string) => {
    void paymentMethod
    try {
      const response = await fetch("/api/settlements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isSettled: true, settledAt: paidDate }),
      })

      if (!response.ok) throw new Error("Failed to complete settlement")

      setSettlements(
        settlements.map(s =>
          s.id === id
            ? { ...s, isSettled: true, settledAt: paidDate }
            : s
        )
      )
      toast.success("Settlement marked as paid")
    } catch (error) {
      console.error("Error completing settlement:", error)
      toast.error("Failed to complete settlement")
    }
  }

  // Receipt functions
  const addReceipt = async (receipt: Omit<Receipt, "id">) => {
    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt),
      })

      if (!response.ok) throw new Error("Failed to upload receipt")

      const newReceipt = await response.json()
      setReceipts([...receipts, newReceipt])
      toast.success("Receipt uploaded successfully")
    } catch (error) {
      console.error("Error uploading receipt:", error)
      toast.error("Failed to upload receipt")
    }
  }

  const deleteReceipt = async (id: string) => {
    try {
      const response = await fetch("/api/receipts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete receipt")

      setReceipts(receipts.filter(r => r.id !== id))
      toast.success("Receipt deleted successfully")
    } catch (error) {
      console.error("Error deleting receipt:", error)
      toast.error("Failed to delete receipt")
    }
  }

  const getReceiptsByTransaction = (transactionId: string): Receipt[] => {
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
    isLoading,
    loadingStage,
    loadingProgress,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      <AppStageLoader
        visible={isLoading && status !== "unauthenticated"}
        stage={loadingStage}
        progress={loadingProgress}
      />
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
