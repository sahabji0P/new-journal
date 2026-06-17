"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { toast } from "@/lib/toast"
import { addDays, addMonths, addWeeks, addYears, isBefore, parseISO } from "date-fns"
import { todayLocalStr, toLocalDateStr } from "@/lib/utils"
import type { SaathiMutation } from "@/lib/saathi/schema"
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
  SettlementGroup,
  SettlementGroupInvite,
  SettlementGroupTransaction,
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
  deleteTransaction: (id: string, options?: { silent?: boolean }) => Promise<void>

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
  addRecurringTransaction: (recurring: Omit<RecurringTransaction, "id" | "nextDueDate">) => Promise<string | undefined>
  updateRecurringTransaction: (id: string, recurring: Partial<RecurringTransaction>) => Promise<void>
  deleteRecurringTransaction: (id: string) => Promise<void>
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

  // Settlement Groups
  settlementGroups: SettlementGroup[]
  settlementInvitations: SettlementGroupInvite[]
  loadSettlementWorkspace: () => Promise<void>
  createSettlementGroup: (input: { name: string; description?: string }) => Promise<void>
  inviteToSettlementGroup: (groupId: string, email: string) => Promise<void>
  respondToSettlementInvite: (invitationId: string, action: "accept" | "decline") => Promise<void>
  addSettlementGroupTransaction: (input: {
    groupId: string
    description: string
    paidByUserId: string
    totalAmount: number
    splitType?: "equal" | "custom" | "percentage"
    splitBetween?: string[]
    percentageShares?: { userId: string; percentage: number }[]
    notes?: string
    shares: { userId: string; amount: number; isPaid?: boolean }[]
  }) => Promise<void>
  recordSettlementGroupPayment: (input: {
    groupId: string
    fromUserId: string
    toUserId: string
    amount: number
    notes?: string
    receiverAccountId?: string
  }) => Promise<void>
  sendSettlementGroupReminder: (input: {
    groupId: string
    toUserId: string
    amount?: number
    message?: string
  }) => Promise<void>
  deleteSettlementGroup: (groupId: string) => Promise<unknown>
  removeSettlementGroupMember: (groupId: string, userId: string) => Promise<unknown>

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
  currency: "INR",
  currencySymbol: "₹",
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

const BUDGET_SYNC_COOLDOWN_MS = 1_500
const SAATHI_MUTATION_EVENT = "saathi:mutations"

type ToastChange = {
  label: string
  value: string | number | boolean | null | undefined
}

function formatToastChangeValue(value: ToastChange["value"]): string | null {
  if (value === undefined) return null
  if (value === null) return "None"
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    return String(value)
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }
  return null
}

function summarizeToastChanges(changes: ToastChange[], fallback?: string): string | undefined {
  const formatted = changes
    .map(change => {
      const value = formatToastChangeValue(change.value)
      return value ? `${change.label}: ${value}` : null
    })
    .filter((value): value is string => Boolean(value))

  if (formatted.length === 0) {
    return fallback
  }

  return `${formatted.slice(0, 2).join(" | ")}${
    formatted.length > 2 ? ` (+${formatted.length - 2} more)` : ""
  }`
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

function ensureRecurringTag(tags?: string[]): string[] {
  const nextTags = tags ? [...tags] : []
  if (nextTags.some(tag => tag.toLowerCase() === "recurring")) return nextTags
  return [...nextTags, "recurring"]
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
  const [settlementGroups, setSettlementGroups] = useState<SettlementGroup[]>([])
  const [settlementInvitations, setSettlementInvitations] = useState<SettlementGroupInvite[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState<AppLoadingStage>("preparing")
  const [loadingProgress, setLoadingProgress] = useState(10)
  const [isInitialized, setIsInitialized] = useState(false)
  const budgetSyncInFlightRef = useRef<Promise<void> | null>(null)
  const lastBudgetSyncAtRef = useRef(0)

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
            settlementGroups?: SettlementGroup[]
            settlementInvitations?: SettlementGroupInvite[]
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
          setSettlementGroups(advancedData.settlementGroups || [])
          setSettlementInvitations(advancedData.settlementInvitations || [])
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
          toast.apiError("Failed to load your data", error, {
            description: "Please refresh the page to try syncing your workspace again.",
            action: {
              label: "Reload",
              onClick: () => window.location.reload(),
            },
          })
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
    const now = Date.now()

    if (budgetSyncInFlightRef.current) {
      await budgetSyncInFlightRef.current
      return
    }

    if (now - lastBudgetSyncAtRef.current < BUDGET_SYNC_COOLDOWN_MS) {
      return
    }

    const syncPromise = (async () => {
      try {
        const response = await fetch("/api/budgets")
        if (!response.ok) return
        const latestBudgets = await response.json()
        if (Array.isArray(latestBudgets)) {
          setBudgets(latestBudgets)
        }
        lastBudgetSyncAtRef.current = Date.now()
      } catch (error) {
        console.error("Error syncing budgets:", error)
      }
    })()

    budgetSyncInFlightRef.current = syncPromise
    try {
      await syncPromise
    } finally {
      if (budgetSyncInFlightRef.current === syncPromise) {
        budgetSyncInFlightRef.current = null
      }
    }
  }, [])

  const refreshSaathiMutationResources = useCallback(async (mutations: SaathiMutation[]) => {
    if (status !== "authenticated" || mutations.length === 0) return

    const resources = new Set(mutations.map(item => item.resource))

    // Keep dependent slices in sync after destructive mutations.
    if (resources.has("accounts") || resources.has("categories")) {
      resources.add("transactions")
    }
    if (resources.has("accounts") || resources.has("categories") || resources.has("transactions")) {
      resources.add("budgets")
    }

    const tasks: Promise<void>[] = []

    if (resources.has("accounts")) {
      tasks.push((async () => {
        const response = await fetch("/api/accounts")
        if (!response.ok) return
        const data = await response.json()
        if (!Array.isArray(data)) return
        setAccounts(data)
        setSelectedAccountIds(previous => {
          const nextIds = new Set(data.map((account: Account) => account.id))
          const kept = previous.filter(id => nextIds.has(id))
          return kept.length > 0 ? kept : data.map((account: Account) => account.id)
        })
      })())
    }

    if (resources.has("transactions")) {
      tasks.push((async () => {
        const response = await fetch("/api/transactions?limit=500")
        if (!response.ok) return
        const payload = await response.json()
        const items = Array.isArray(payload)
          ? payload
          : (payload && Array.isArray(payload.items) ? payload.items : [])
        setTransactions(items)
      })())
    }

    if (resources.has("budgets")) {
      tasks.push((async () => {
        const response = await fetch("/api/budgets")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setBudgets(data)
      })())
    }

    if (resources.has("categories")) {
      tasks.push((async () => {
        const response = await fetch("/api/categories")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setCategories(data)
      })())
    }

    if (resources.has("parties")) {
      tasks.push((async () => {
        const response = await fetch("/api/parties")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setParties(data)
      })())
    }

    if (resources.has("templates")) {
      tasks.push((async () => {
        const response = await fetch("/api/templates")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setTemplates(data)
      })())
    }

    if (resources.has("goals")) {
      tasks.push((async () => {
        const response = await fetch("/api/goals")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setGoals(data)
      })())
    }

    if (resources.has("watchlists")) {
      tasks.push((async () => {
        const response = await fetch("/api/watchlists")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setWatchlists(data)
      })())
    }

    if (resources.has("recurring")) {
      tasks.push((async () => {
        const response = await fetch("/api/recurring")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setRecurringTransactions(data)
      })())
    }

    if (resources.has("notifications")) {
      tasks.push((async () => {
        const response = await fetch("/api/notifications")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setNotifications(data)
      })())
    }

    if (resources.has("settlements") || resources.has("settlement_groups")) {
      tasks.push((async () => {
        const response = await fetch("/api/settlements")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setSettlements(data)
      })())
      tasks.push((async () => {
        const response = await fetch("/api/settlements/groups")
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setSettlementGroups(data)
      })())
    }

    if (resources.has("settings")) {
      tasks.push((async () => {
        const response = await fetch("/api/settings")
        if (!response.ok) return
        const raw = await response.json()
        if (raw && typeof raw === "object") setSettings(mapDbSettingsToAppSettings(raw))
      })())
    }

    await Promise.all(tasks)
  }, [status])

  useEffect(() => {
    const onSaathiMutation = (event: Event) => {
      const detail = (event as CustomEvent<{ mutations?: SaathiMutation[] }>).detail
      const mutations = Array.isArray(detail?.mutations) ? detail.mutations : []
      if (mutations.length === 0) return

      void refreshSaathiMutationResources(mutations)
    }

    window.addEventListener(SAATHI_MUTATION_EVENT, onSaathiMutation)
    return () => window.removeEventListener(SAATHI_MUTATION_EVENT, onSaathiMutation)
  }, [refreshSaathiMutationResources])

  // Check for recurring transactions on init and hourly
  useEffect(() => {
    if (isInitialized) {
      processRecurringTransactions()
      const interval = setInterval(processRecurringTransactions, 1000 * 60 * 60)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized])

  // Account CRUD operations
  const addAccount = async (account: Omit<Account, "id" | "balance">) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(account),
          })

          if (!response.ok) throw new Error("Failed to create account")

          const newAccount = await response.json()
          setAccounts([...accounts, newAccount])
        },
        {
          loading: { title: "Creating account..." },
          success: {
            title: `Account "${account.name}" created successfully`,
          },
          error: { title: "Failed to create account" },
        }
      )
    } catch (error) {
      console.error("Error creating account:", error)
    }
  }

  const updateAccount = async (id: string, updatedAccount: Partial<Account>) => {
    const existingAccount = accounts.find(acc => acc.id === id)
    const accountChangeSummary = summarizeToastChanges(
      [
        {
          label: "Name",
          value:
            updatedAccount.name !== undefined && updatedAccount.name !== existingAccount?.name
              ? updatedAccount.name
              : undefined,
        },
        {
          label: "Type",
          value:
            updatedAccount.type !== undefined && updatedAccount.type !== existingAccount?.type
              ? updatedAccount.type
              : undefined,
        },
        {
          label: "Status",
          value:
            updatedAccount.isActive !== undefined &&
            updatedAccount.isActive !== existingAccount?.isActive
              ? updatedAccount.isActive
                ? "Active"
                : "Inactive"
              : undefined,
        },
      ],
      existingAccount?.name
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/accounts", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedAccount }),
          })

          if (!response.ok) throw new Error("Failed to update account")

          setAccounts(accounts.map(acc => (acc.id === id ? { ...acc, ...updatedAccount } : acc)))
        },
        {
          loading: { title: "Updating account..." },
          success: {
            title: "Account updated successfully",
            description: accountChangeSummary,
          },
          error: { title: "Failed to update account" },
        }
      )
    } catch (error) {
      console.error("Error updating account:", error)
    }
  }

  const deleteAccount = async (id: string) => {
    const accountName = accounts.find(acc => acc.id === id)?.name

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/accounts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete account")

          setAccounts(accounts.filter(acc => acc.id !== id))
          setSelectedAccountIds(selectedAccountIds.filter(accId => accId !== id))
        },
        {
          loading: { title: "Deleting account..." },
          success: {
            title: "Account deleted successfully",
            description: accountName ? accountName : undefined,
          },
          error: { title: "Failed to delete account" },
        }
      )
    } catch (error) {
      console.error("Error deleting account:", error)
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
        toast.apiError("Failed to save transaction", error)
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

    toast.success("Transaction added successfully", {
      description: `${transaction.type.toUpperCase()} | ${transaction.category} | ${transaction.accountName}`,
    })
    return newTransaction
  }

  const updateTransaction = async (id: string, updatedTransaction: Partial<Transaction>) => {
    const oldTransaction = transactions.find(t => t.id === id)
    if (!oldTransaction) return
    const updatedAccountName =
      updatedTransaction.accountName ??
      (updatedTransaction.accountId
        ? accounts.find(acc => acc.id === updatedTransaction.accountId)?.name
        : undefined)

    const changedParts: string[] = []
    if (
      updatedTransaction.description !== undefined &&
      updatedTransaction.description !== oldTransaction.description
    ) {
      changedParts.push(`Description: ${updatedTransaction.description}`)
    }
    if (updatedTransaction.amount !== undefined && updatedTransaction.amount !== oldTransaction.amount) {
      changedParts.push(`Amount: ${formatCurrency(updatedTransaction.amount)}`)
    }
    if (updatedTransaction.category !== undefined && updatedTransaction.category !== oldTransaction.category) {
      changedParts.push(`Category: ${updatedTransaction.category}`)
    }
    if (
      updatedTransaction.accountId !== undefined &&
      updatedTransaction.accountId !== oldTransaction.accountId
    ) {
      changedParts.push(`Account: ${updatedAccountName ?? updatedTransaction.accountId}`)
    }
    if (updatedTransaction.date !== undefined && updatedTransaction.date !== oldTransaction.date) {
      changedParts.push(`Date: ${updatedTransaction.date}`)
    }
    if (updatedTransaction.type !== undefined && updatedTransaction.type !== oldTransaction.type) {
      changedParts.push(`Type: ${updatedTransaction.type}`)
    }
    if (updatedTransaction.party !== undefined && updatedTransaction.party !== oldTransaction.party) {
      changedParts.push(`Party: ${updatedTransaction.party || "None"}`)
    }

    const changeSummary =
      changedParts.length > 0
        ? `${changedParts.slice(0, 2).join(" | ")}${changedParts.length > 2 ? ` (+${changedParts.length - 2} more)` : ""}`
        : oldTransaction.description

    try {
      await toast.promise(
        async () => {
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
        },
        {
          loading: { title: "Updating transaction..." },
          success: {
            title: "Transaction updated successfully",
            description: changeSummary,
          },
          error: { title: "Failed to update transaction" },
        }
      )
    } catch (error) {
      console.error("Error updating transaction:", error)
    }
  }

  const deleteTransaction = async (id: string, options?: { silent?: boolean }) => {
    const transaction = transactions.find(t => t.id === id)

    const performDelete = async () => {
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
      setTransactions(prev => prev.filter(t => t.id !== id))
      void syncBudgetsFromServer()
    }

    if (options?.silent) {
      await performDelete()
      return
    }

    try {
      await toast.promise(
        performDelete,
        {
          loading: { title: "Deleting transaction..." },
          success: {
            title: "Transaction deleted successfully",
            description: transaction ? transaction.description : undefined,
          },
          error: { title: "Failed to delete transaction" },
        }
      )
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  // Budget CRUD operations
  const addBudget = async (budget: Omit<Budget, "id" | "totalSpent">) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(budget),
          })

          if (!response.ok) throw new Error("Failed to create budget")

          const newBudget = await response.json()
          setBudgets([...budgets, newBudget])
        },
        {
          loading: { title: "Creating budget..." },
          success: {
            title: `Budget "${budget.name}" created successfully`,
          },
          error: { title: "Failed to create budget" },
        }
      )
    } catch (error) {
      console.error("Error creating budget:", error)
    }
  }

  const updateBudget = async (id: string, updatedBudget: Partial<Budget>) => {
    const existingBudget = budgets.find(b => b.id === id)
    const budgetChangeSummary = summarizeToastChanges(
      [
        {
          label: "Name",
          value:
            updatedBudget.name !== undefined && updatedBudget.name !== existingBudget?.name
              ? updatedBudget.name
              : undefined,
        },
        {
          label: "Type",
          value:
            updatedBudget.type !== undefined && updatedBudget.type !== existingBudget?.type
              ? updatedBudget.type
              : undefined,
        },
        {
          label: "Allocated",
          value:
            updatedBudget.totalAllocated !== undefined &&
            updatedBudget.totalAllocated !== existingBudget?.totalAllocated
              ? formatCurrency(updatedBudget.totalAllocated)
              : undefined,
        },
        {
          label: "Warning %",
          value:
            updatedBudget.warningThreshold !== undefined &&
            updatedBudget.warningThreshold !== existingBudget?.warningThreshold
              ? updatedBudget.warningThreshold
              : undefined,
        },
      ],
      existingBudget?.name
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/budgets", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedBudget }),
          })

          if (!response.ok) throw new Error("Failed to update budget")

          const savedBudget = await response.json()
          setBudgets(budgets.map(b => (b.id === id ? savedBudget : b)))
        },
        {
          loading: { title: "Updating budget..." },
          success: {
            title: "Budget updated successfully",
            description: budgetChangeSummary,
          },
          error: { title: "Failed to update budget" },
        }
      )
    } catch (error) {
      console.error("Error updating budget:", error)
    }
  }

  const deleteBudget = async (id: string) => {
    const budgetName = budgets.find(b => b.id === id)?.name

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/budgets", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete budget")

          setBudgets(budgets.filter(b => b.id !== id))
        },
        {
          loading: { title: "Deleting budget..." },
          success: {
            title: "Budget deleted successfully",
            description: budgetName ? budgetName : undefined,
          },
          error: { title: "Failed to delete budget" },
        }
      )
    } catch (error) {
      console.error("Error deleting budget:", error)
    }
  }

  // Category CRUD operations
  const addCategory = async (category: Omit<Category, "id">) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(category),
          })

          if (!response.ok) throw new Error("Failed to create category")

          const newCategory = await response.json()
          setCategories([...categories, newCategory])
        },
        {
          loading: { title: "Creating category..." },
          success: {
            title: `Category "${category.name}" created successfully`,
          },
          error: { title: "Failed to create category" },
        }
      )
    } catch (error) {
      console.error("Error creating category:", error)
    }
  }

  const updateCategory = async (id: string, updatedCategory: Partial<Category>) => {
    const existingCategory = categories.find(c => c.id === id)
    const categoryChangeSummary = summarizeToastChanges(
      [
        {
          label: "Name",
          value:
            updatedCategory.name !== undefined && updatedCategory.name !== existingCategory?.name
              ? updatedCategory.name
              : undefined,
        },
        {
          label: "Type",
          value:
            updatedCategory.type !== undefined && updatedCategory.type !== existingCategory?.type
              ? updatedCategory.type
              : undefined,
        },
        {
          label: "Color",
          value:
            updatedCategory.color !== undefined && updatedCategory.color !== existingCategory?.color
              ? updatedCategory.color
              : undefined,
        },
      ],
      existingCategory?.name
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedCategory }),
          })

          if (!response.ok) throw new Error("Failed to update category")

          setCategories(categories.map(c => (c.id === id ? { ...c, ...updatedCategory } : c)))
        },
        {
          loading: { title: "Updating category..." },
          success: {
            title: "Category updated successfully",
            description: categoryChangeSummary,
          },
          error: { title: "Failed to update category" },
        }
      )
    } catch (error) {
      console.error("Error updating category:", error)
    }
  }

  const deleteCategory = async (id: string) => {
    const categoryName = categories.find(c => c.id === id)?.name

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/categories", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete category")

          setCategories(categories.filter(c => c.id !== id))
        },
        {
          loading: { title: "Deleting category..." },
          success: {
            title: "Category deleted successfully",
            description: categoryName ? categoryName : undefined,
          },
          error: { title: "Failed to delete category" },
        }
      )
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  // Party CRUD operations
  const addParty = async (party: Omit<Party, "id">) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/parties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(party),
          })

          if (!response.ok) throw new Error("Failed to create party")

          const newParty = await response.json()
          setParties([...parties, newParty])
        },
        {
          loading: { title: "Creating party..." },
          success: {
            title: `Party "${party.name}" added successfully`,
          },
          error: { title: "Failed to create party" },
        }
      )
    } catch (error) {
      console.error("Error creating party:", error)
    }
  }

  const updateParty = async (id: string, updatedParty: Partial<Party>) => {
    const existingParty = parties.find(p => p.id === id)
    const partyChangeSummary = summarizeToastChanges(
      [
        {
          label: "Name",
          value:
            updatedParty.name !== undefined && updatedParty.name !== existingParty?.name
              ? updatedParty.name
              : undefined,
        },
      ],
      existingParty?.name
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/parties", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedParty }),
          })

          if (!response.ok) throw new Error("Failed to update party")

          setParties(parties.map(p => (p.id === id ? { ...p, ...updatedParty } : p)))
        },
        {
          loading: { title: "Updating party..." },
          success: {
            title: "Party updated successfully",
            description: partyChangeSummary,
          },
          error: { title: "Failed to update party" },
        }
      )
    } catch (error) {
      console.error("Error updating party:", error)
    }
  }

  const deleteParty = async (id: string) => {
    const partyName = parties.find(p => p.id === id)?.name

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/parties", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete party")

          setParties(parties.filter(p => p.id !== id))
        },
        {
          loading: { title: "Deleting party..." },
          success: {
            title: "Party deleted successfully",
            description: partyName ? partyName : undefined,
          },
          error: { title: "Failed to delete party" },
        }
      )
    } catch (error) {
      console.error("Error deleting party:", error)
    }
  }

  // Goal CRUD operations
  const addGoal = async (goal: Omit<Goal, "id" | "currentAmount">) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(goal),
          })

          if (!response.ok) throw new Error("Failed to create goal")

          const newGoal = await response.json()
          setGoals([...goals, newGoal])
        },
        {
          loading: { title: "Creating goal..." },
          success: {
            title: `Goal "${goal.name}" created successfully`,
          },
          error: { title: "Failed to create goal" },
        }
      )
    } catch (error) {
      console.error("Error creating goal:", error)
    }
  }

  const updateGoal = async (id: string, updatedGoal: Partial<Goal>) => {
    const existingGoal = goals.find(g => g.id === id)
    const goalChangeSummary = summarizeToastChanges(
      [
        {
          label: "Name",
          value:
            updatedGoal.name !== undefined && updatedGoal.name !== existingGoal?.name
              ? updatedGoal.name
              : undefined,
        },
        {
          label: "Target",
          value:
            updatedGoal.targetAmount !== undefined &&
            updatedGoal.targetAmount !== existingGoal?.targetAmount
              ? formatCurrency(updatedGoal.targetAmount)
              : undefined,
        },
        {
          label: "Monthly",
          value:
            updatedGoal.monthlyContribution !== undefined &&
            updatedGoal.monthlyContribution !== existingGoal?.monthlyContribution
              ? formatCurrency(updatedGoal.monthlyContribution)
              : undefined,
        },
        {
          label: "Priority",
          value:
            updatedGoal.priority !== undefined && updatedGoal.priority !== existingGoal?.priority
              ? updatedGoal.priority
              : undefined,
        },
      ],
      existingGoal?.name
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/goals", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedGoal }),
          })

          if (!response.ok) throw new Error("Failed to update goal")

          setGoals(goals.map(g => (g.id === id ? { ...g, ...updatedGoal } : g)))
        },
        {
          loading: { title: "Updating goal..." },
          success: {
            title: "Goal updated successfully",
            description: goalChangeSummary,
          },
          error: { title: "Failed to update goal" },
        }
      )
    } catch (error) {
      console.error("Error updating goal:", error)
    }
  }

  const deleteGoal = async (id: string) => {
    const goalName = goals.find(g => g.id === id)?.name

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/goals", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete goal")

          setGoals(goals.filter(g => g.id !== id))
        },
        {
          loading: { title: "Deleting goal..." },
          success: {
            title: "Goal deleted successfully",
            description: goalName ? goalName : undefined,
          },
          error: { title: "Failed to delete goal" },
        }
      )
    } catch (error) {
      console.error("Error deleting goal:", error)
    }
  }

  const contributeToGoal = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return

    const newAmount = goal.currentAmount + amount

    try {
      await toast.promise(
        async () => {
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
        },
        {
          loading: { title: "Adding contribution..." },
          success: {
            title: "Contribution added to goal",
            description: goal.name,
          },
          error: { title: "Failed to contribute to goal" },
        }
      )
    } catch (error) {
      console.error("Error contributing to goal:", error)
    }
  }

  // Watchlist CRUD operations
  const addWatchlist = async (watchlist: Omit<Watchlist, "id">) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/watchlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(watchlist),
          })

          if (!response.ok) throw new Error("Failed to create watchlist")

          const newWatchlist = await response.json()
          setWatchlists([...watchlists, newWatchlist])
        },
        {
          loading: { title: "Creating watchlist..." },
          success: {
            title: `Watchlist "${watchlist.name}" created successfully`,
          },
          error: { title: "Failed to create watchlist" },
        }
      )
    } catch (error) {
      console.error("Error creating watchlist:", error)
    }
  }

  const updateWatchlist = async (id: string, updatedWatchlist: Partial<Watchlist>) => {
    const existingWatchlist = watchlists.find(w => w.id === id)
    const watchlistChangeSummary = summarizeToastChanges(
      [
        {
          label: "Name",
          value:
            updatedWatchlist.name !== undefined && updatedWatchlist.name !== existingWatchlist?.name
              ? updatedWatchlist.name
              : undefined,
        },
        {
          label: "Rule",
          value:
            updatedWatchlist.value !== undefined && updatedWatchlist.value !== existingWatchlist?.value
              ? updatedWatchlist.value
              : undefined,
        },
        {
          label: "Limit",
          value:
            updatedWatchlist.budgetLimit !== undefined &&
            updatedWatchlist.budgetLimit !== existingWatchlist?.budgetLimit
              ? formatCurrency(updatedWatchlist.budgetLimit)
              : undefined,
        },
        {
          label: "Alert %",
          value:
            updatedWatchlist.alertThreshold !== undefined &&
            updatedWatchlist.alertThreshold !== existingWatchlist?.alertThreshold
              ? updatedWatchlist.alertThreshold
              : undefined,
        },
      ],
      existingWatchlist?.name
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/watchlists", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedWatchlist }),
          })

          if (!response.ok) throw new Error("Failed to update watchlist")

          setWatchlists(watchlists.map(w => (w.id === id ? { ...w, ...updatedWatchlist } : w)))
        },
        {
          loading: { title: "Updating watchlist..." },
          success: {
            title: "Watchlist updated successfully",
            description: watchlistChangeSummary,
          },
          error: { title: "Failed to update watchlist" },
        }
      )
    } catch (error) {
      console.error("Error updating watchlist:", error)
    }
  }

  const deleteWatchlist = async (id: string) => {
    const watchlistName = watchlists.find(w => w.id === id)?.name

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/watchlists", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete watchlist")

          setWatchlists(watchlists.filter(w => w.id !== id))
        },
        {
          loading: { title: "Deleting watchlist..." },
          success: {
            title: "Watchlist deleted successfully",
            description: watchlistName ? watchlistName : undefined,
          },
          error: { title: "Failed to delete watchlist" },
        }
      )
    } catch (error) {
      console.error("Error deleting watchlist:", error)
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
  const addRecurringTransaction = async (recurring: Omit<RecurringTransaction, "id" | "nextDueDate">): Promise<string | undefined> => {
    try {
      // If start date is in the future, nextDueDate is the start date itself (first payment pending)
      // If start date is today or past, nextDueDate is the next occurrence after start
      const startDateObj = new Date(recurring.startDate + "T00:00:00")
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const nextDueDate = startDateObj > today
        ? recurring.startDate
        : calculateNextDueDate(recurring.startDate, recurring.frequency)

      let createdId: string | undefined
      await toast.promise(
        async () => {
          const response = await fetch("/api/recurring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...recurring, nextDueDate }),
          })

          if (!response.ok) throw new Error("Failed to create recurring transaction")

          const newRecurring = await response.json()
          createdId = newRecurring.id
          const mapped = { ...newRecurring, accountName: newRecurring.account?.name ?? recurring.accountName }
          setRecurringTransactions(prev => [...prev, mapped])
        },
        {
          loading: { title: "Creating recurring transaction..." },
          success: {
            title: `Recurring transaction "${recurring.description}" created successfully`,
          },
          error: { title: "Failed to create recurring transaction" },
        }
      )
      return createdId
    } catch (error) {
      console.error("Error creating recurring transaction:", error)
      return undefined
    }
  }

  const updateRecurringTransaction = async (id: string, updatedRecurring: Partial<RecurringTransaction>): Promise<void> => {
    const existingRecurring = recurringTransactions.find(r => r.id === id)
    const recurringChangeSummary = summarizeToastChanges(
      [
        {
          label: "Description",
          value:
            updatedRecurring.description !== undefined &&
            updatedRecurring.description !== existingRecurring?.description
              ? updatedRecurring.description
              : undefined,
        },
        {
          label: "Amount",
          value:
            updatedRecurring.amount !== undefined &&
            updatedRecurring.amount !== existingRecurring?.amount
              ? formatCurrency(updatedRecurring.amount)
              : undefined,
        },
        {
          label: "Frequency",
          value:
            updatedRecurring.frequency !== undefined &&
            updatedRecurring.frequency !== existingRecurring?.frequency
              ? updatedRecurring.frequency
              : undefined,
        },
        {
          label: "Next Due",
          value:
            updatedRecurring.nextDueDate !== undefined &&
            updatedRecurring.nextDueDate !== existingRecurring?.nextDueDate
              ? updatedRecurring.nextDueDate
              : undefined,
        },
      ],
      existingRecurring?.description
    )

    // Optimistic update
    setRecurringTransactions(prev => prev.map(r => (r.id === id ? { ...r, ...updatedRecurring } : r)))

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/recurring", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updatedRecurring }),
          })

          if (!response.ok) {
            // Rollback on failure
            if (existingRecurring) {
              setRecurringTransactions(prev => prev.map(r => (r.id === id ? existingRecurring : r)))
            }
            throw new Error("Failed to update recurring transaction")
          }

          const updated = await response.json()
          setRecurringTransactions(prev => prev.map(r => (r.id === id ? { ...r, ...updated, accountName: updated.account?.name ?? r.accountName } : r)))
        },
        {
          loading: { title: "Updating recurring transaction..." },
          success: {
            title: "Recurring transaction updated successfully",
            description: recurringChangeSummary,
          },
          error: { title: "Failed to update recurring transaction" },
        }
      )
    } catch (error) {
      console.error("Error updating recurring transaction:", error)
    }
  }

  const deleteRecurringTransaction = async (id: string): Promise<void> => {
    const previous = recurringTransactions
    const recurringName = previous.find(r => r.id === id)?.description

    // Optimistic removal
    setRecurringTransactions(prev => prev.filter(r => r.id !== id))

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/recurring", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) {
            setRecurringTransactions(previous) // Rollback
            throw new Error("Failed to delete recurring transaction")
          }
        },
        {
          loading: { title: "Deleting recurring transaction..." },
          success: {
            title: "Recurring transaction deleted successfully",
            description: recurringName ? recurringName : undefined,
          },
          error: { title: "Failed to delete recurring transaction" },
        }
      )
    } catch (error) {
      setRecurringTransactions(previous) // Rollback
      console.error("Error deleting recurring transaction:", error)
    }
  }

  const calculateNextDueDate = (currentDate: string, frequency: RecurringTransaction["frequency"]): string => {
    const date = parseISO(currentDate)
    switch (frequency) {
      case "daily":
        return toLocalDateStr(addDays(date, 1))
      case "weekly":
        return toLocalDateStr(addWeeks(date, 1))
      case "biweekly":
        return toLocalDateStr(addWeeks(date, 2))
      case "monthly":
        return toLocalDateStr(addMonths(date, 1))
      case "quarterly":
        return toLocalDateStr(addMonths(date, 3))
      case "yearly":
        return toLocalDateStr(addYears(date, 1))
      default:
        return currentDate
    }
  }

  const processRecurringTransactions = () => {
    const today = todayLocalStr()

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
            tags: ensureRecurringTag(recurring.tags),
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
    const clearedCount = notifications.length
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/notifications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
          })

          if (!response.ok) throw new Error("Failed to clear notifications")

          setNotifications([])
        },
        {
          loading: { title: "Clearing notifications..." },
          success: {
            title: "All notifications cleared",
            description: `${clearedCount} item(s) removed from your inbox.`,
          },
          error: { title: "Failed to clear notifications" },
        }
      )
    } catch (error) {
      console.error("Error clearing notifications:", error)
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

    const settingsChangeSummary = summarizeToastChanges(
      [
        {
          label: "Currency",
          value: mergedSettings.currency !== settings.currency ? mergedSettings.currency : undefined,
        },
        {
          label: "Date Format",
          value:
            mergedSettings.dateFormat !== settings.dateFormat
              ? mergedSettings.dateFormat
              : undefined,
        },
        {
          label: "Theme",
          value:
            mergedSettings.darkMode !== settings.darkMode
              ? mergedSettings.darkMode
                ? "Dark"
                : "Light"
              : undefined,
        },
        {
          label: "Compact",
          value:
            mergedSettings.display.compactMode !== settings.display.compactMode
              ? mergedSettings.display.compactMode
                ? "On"
                : "Off"
              : undefined,
        },
        {
          label: "Show Cents",
          value:
            mergedSettings.display.showCents !== settings.display.showCents
              ? mergedSettings.display.showCents
                ? "On"
                : "Off"
              : undefined,
        },
      ],
      "Preferences updated"
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mapAppSettingsToDb(mergedSettings)),
          })

          if (!response.ok) throw new Error("Failed to update settings")

          setSettings(mergedSettings)
        },
        {
          loading: { title: "Saving settings..." },
          success: {
            title: "Settings updated successfully",
            description: settingsChangeSummary,
          },
          error: { title: "Failed to update settings" },
        }
      )
    } catch (error) {
      console.error("Error updating settings:", error)
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
      toast.apiError("Failed to import data", error, {
        description: "The selected file is not a valid CORE export file.",
      })
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
      await toast.promise(
        async () => {
          const response = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(template),
          })

          if (!response.ok) throw new Error("Failed to create template")

          const newTemplate = await response.json()
          setTemplates([...templates, newTemplate])
        },
        {
          loading: { title: "Creating template..." },
          success: {
            title: `Template "${template.name}" created successfully`,
          },
          error: { title: "Failed to create template" },
        }
      )
    } catch (error) {
      console.error("Error creating template:", error)
    }
  }

  const updateTemplate = async (id: string, updates: Partial<TransactionTemplate>) => {
    const existingTemplate = templates.find(t => t.id === id)
    const updatedAccountName =
      updates.accountId !== undefined
        ? accounts.find(account => account.id === updates.accountId)?.name
        : undefined
    const templateChangeSummary = summarizeToastChanges(
      [
        {
          label: "Name",
          value:
            updates.name !== undefined && updates.name !== existingTemplate?.name
              ? updates.name
              : undefined,
        },
        {
          label: "Amount",
          value:
            updates.amount !== undefined && updates.amount !== existingTemplate?.amount
              ? formatCurrency(updates.amount)
              : undefined,
        },
        {
          label: "Category",
          value:
            updates.category !== undefined && updates.category !== existingTemplate?.category
              ? updates.category
              : undefined,
        },
        {
          label: "Account",
          value:
            updates.accountId !== undefined && updates.accountId !== existingTemplate?.accountId
              ? updatedAccountName ?? updates.accountId
              : undefined,
        },
      ],
      existingTemplate?.name
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/templates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
          })

          if (!response.ok) throw new Error("Failed to update template")

          setTemplates(templates.map(t => (t.id === id ? { ...t, ...updates } : t)))
        },
        {
          loading: { title: "Updating template..." },
          success: {
            title: "Template updated successfully",
            description: templateChangeSummary,
          },
          error: { title: "Failed to update template" },
        }
      )
    } catch (error) {
      console.error("Error updating template:", error)
    }
  }

  const deleteTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id)

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/templates", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete template")

          setTemplates(templates.filter(t => t.id !== id))
        },
        {
          loading: { title: "Deleting template..." },
          success: {
            title: "Template deleted successfully",
            description: template?.name,
          },
          error: { title: "Failed to delete template" },
        }
      )
    } catch (error) {
      console.error("Error deleting template:", error)
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
      date: overrides?.date || todayLocalStr(),
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
      await toast.promise(
        async () => {
          const response = await fetch("/api/settlements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settlement),
          })

          if (!response.ok) throw new Error("Failed to create settlement")

          const newSettlement = await response.json()
          setSettlements([...settlements, newSettlement])
        },
        {
          loading: { title: "Recording settlement..." },
          success: {
            title: "Settlement recorded successfully",
            description: settlement.party,
          },
          error: { title: "Failed to create settlement" },
        }
      )
    } catch (error) {
      console.error("Error creating settlement:", error)
    }
  }

  const updateSettlement = async (id: string, updates: Partial<Settlement>) => {
    const existingSettlement = settlements.find(s => s.id === id)
    const settlementChangeSummary = summarizeToastChanges(
      [
        {
          label: "Party",
          value:
            updates.party !== undefined && updates.party !== existingSettlement?.party
              ? updates.party
              : undefined,
        },
        {
          label: "Amount",
          value:
            updates.amount !== undefined && updates.amount !== existingSettlement?.amount
              ? formatCurrency(updates.amount)
              : undefined,
        },
        {
          label: "Type",
          value:
            updates.type !== undefined && updates.type !== existingSettlement?.type
              ? updates.type
              : undefined,
        },
        {
          label: "Reason",
          value:
            updates.reason !== undefined && updates.reason !== existingSettlement?.reason
              ? updates.reason
              : undefined,
        },
      ],
      existingSettlement?.party
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/settlements", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
          })

          if (!response.ok) throw new Error("Failed to update settlement")

          setSettlements(settlements.map(s => (s.id === id ? { ...s, ...updates } : s)))
        },
        {
          loading: { title: "Updating settlement..." },
          success: {
            title: "Settlement updated successfully",
            description: settlementChangeSummary,
          },
          error: { title: "Failed to update settlement" },
        }
      )
    } catch (error) {
      console.error("Error updating settlement:", error)
    }
  }

  const deleteSettlement = async (id: string) => {
    const settlementParty = settlements.find(s => s.id === id)?.party

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/settlements", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete settlement")

          setSettlements(settlements.filter(s => s.id !== id))
        },
        {
          loading: { title: "Deleting settlement..." },
          success: {
            title: "Settlement deleted successfully",
            description: settlementParty ? `Party: ${settlementParty}` : undefined,
          },
          error: { title: "Failed to delete settlement" },
        }
      )
    } catch (error) {
      console.error("Error deleting settlement:", error)
    }
  }

  const completeSettlement = async (id: string, paidDate: string, paymentMethod?: string) => {
    void paymentMethod
    const settlementParty = settlements.find(s => s.id === id)?.party
    const completionSummary = summarizeToastChanges(
      [
        { label: "Party", value: settlementParty },
        { label: "Paid On", value: paidDate },
      ],
      settlementParty
    )

    try {
      await toast.promise(
        async () => {
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
        },
        {
          loading: { title: "Marking settlement as paid..." },
          success: {
            title: "Settlement marked as paid",
            description: completionSummary,
          },
          error: { title: "Failed to complete settlement" },
        }
      )
    } catch (error) {
      console.error("Error completing settlement:", error)
    }
  }

  const loadSettlementWorkspace = useCallback(async () => {
    try {
      const [groupsResponse, invitationsResponse] = await Promise.all([
        fetch("/api/settlements/groups"),
        fetch("/api/settlements/invitations"),
      ])

      if (!groupsResponse.ok) {
        throw new Error("Failed to load settlement groups")
      }

      if (!invitationsResponse.ok) {
        throw new Error("Failed to load settlement invitations")
      }

      const [groupsPayload, invitationsPayload] = await Promise.all([
        groupsResponse.json(),
        invitationsResponse.json(),
      ])

      setSettlementGroups(Array.isArray(groupsPayload) ? groupsPayload : [])
      setSettlementInvitations(Array.isArray(invitationsPayload) ? invitationsPayload : [])
    } catch (error) {
      console.error("Error loading settlements workspace:", error)
      toast.apiError("Failed to load settlements workspace", error)
    }
  }, [])

  const createSettlementGroup = async (input: { name: string; description?: string }) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/settlements/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })

          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(payload?.error || "Failed to create settlement group")
          }

          if (payload) {
            setSettlementGroups((previous) => [
              payload,
              ...previous.filter(group => group.id !== payload.id),
            ])
          }
        },
        {
          loading: { title: "Creating settlement group..." },
          success: {
            title: "Settlement group created",
            description: input.name,
          },
          error: { title: "Failed to create settlement group" },
        }
      )
    } catch (error) {
      console.error("Error creating settlement group:", error)
    }
  }

  const inviteToSettlementGroup = async (groupId: string, email: string) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/settlements/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId, email }),
          })

          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(payload?.error || "Failed to send invitation")
          }

          if (payload) {
            setSettlementInvitations((previous) => [
              payload,
              ...previous.filter(invitation => invitation.id !== payload.id),
            ])
          }
        },
        {
          loading: { title: "Sending invitation..." },
          success: {
            title: "Invitation sent",
            description: `Invite sent to ${email}`,
          },
          error: { title: "Failed to send invitation" },
        }
      )
    } catch (error) {
      console.error("Error inviting to settlement group:", error)
    }
  }

  const respondToSettlementInvite = async (invitationId: string, action: "accept" | "decline") => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/settlements/invitations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationId, action }),
          })

          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(payload?.error || "Failed to respond to invitation")
          }

          if (payload) {
            setSettlementInvitations((previous) =>
              previous.map(invitation => invitation.id === payload.id ? payload : invitation)
            )
          }

          if (action === "accept") {
            await loadSettlementWorkspace()
          }
        },
        {
          loading: { title: action === "accept" ? "Accepting invitation..." : "Declining invitation..." },
          success: {
            title: action === "accept" ? "Joined group" : "Invitation declined",
          },
          error: { title: "Failed to respond to invitation" },
        }
      )
    } catch (error) {
      console.error("Error responding to settlement invitation:", error)
    }
  }

  const addSettlementGroupTransaction = async (input: {
    groupId: string
    description: string
    paidByUserId: string
    totalAmount: number
    splitType?: "equal" | "custom" | "percentage"
    splitBetween?: string[]
    percentageShares?: { userId: string; percentage: number }[]
    notes?: string
    shares: { userId: string; amount: number; isPaid?: boolean }[]
  }) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/settlements/group-transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })

          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(payload?.error || "Failed to create group transaction")
          }

          if (payload) {
            setSettlementGroups((previous) =>
              previous.map(group =>
                group.id === input.groupId
                  ? {
                      ...group,
                      transactions: [
                        payload as SettlementGroupTransaction,
                        ...group.transactions,
                      ],
                      updatedAt: new Date().toISOString(),
                    }
                  : group
              )
            )
          }
        },
        {
          loading: { title: "Adding group transaction..." },
          success: {
            title: "Group transaction added",
            description: `${input.description} | ${formatCurrency(input.totalAmount)}`,
          },
          error: { title: "Failed to add group transaction" },
        }
      )
    } catch (error) {
      console.error("Error adding settlement group transaction:", error)
    }
  }

  const recordSettlementGroupPayment = async (input: {
    groupId: string
    fromUserId: string
    toUserId: string
    amount: number
    notes?: string
    receiverAccountId?: string
  }) => {
    const activeGroup = settlementGroups.find(group => group.id === input.groupId)
    const fromName =
      activeGroup?.members.find(member => member.userId === input.fromUserId)?.name ??
      input.fromUserId
    const toName =
      activeGroup?.members.find(member => member.userId === input.toUserId)?.name ??
      input.toUserId
    const paymentSummary = summarizeToastChanges(
      [
        { label: "From", value: fromName },
        { label: "To", value: toName },
        { label: "Amount", value: formatCurrency(input.amount) },
      ],
      formatCurrency(input.amount)
    )

    try {
      await toast.promise(
        async () => {
          const response = await fetch(`/api/settlements/groups/${input.groupId}/settlements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })

          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(payload?.error || "Failed to record settlement payment")
          }

          if (payload) {
            setSettlementGroups((previous) =>
              previous.map((group) =>
                group.id === input.groupId
                  ? {
                      ...group,
                      transactions: [
                        payload as SettlementGroupTransaction,
                        ...group.transactions,
                      ],
                      updatedAt: new Date().toISOString(),
                    }
                  : group
              )
            )
          }
        },
        {
          loading: { title: "Recording settlement payment..." },
          success: {
            title: "Settlement payment recorded",
            description: paymentSummary,
          },
          error: { title: "Failed to record settlement payment" },
        }
      )
    } catch (error) {
      console.error("Error recording settlement payment:", error)
    }
  }

  const sendSettlementGroupReminder = async (input: {
    groupId: string
    toUserId: string
    amount?: number
    message?: string
  }) => {
    try {
      await toast.promise(
        async () => {
          const response = await fetch(`/api/settlements/groups/${input.groupId}/reminders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })

          const payload = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(payload?.error || "Failed to send reminder")
          }
        },
        {
          loading: { title: "Sending reminder..." },
          success: {
            title: "Reminder sent",
            description: input.amount ? `Amount due: ${formatCurrency(input.amount)}` : undefined,
          },
          error: { title: "Failed to send reminder" },
        }
      )
    } catch (error) {
      console.error("Error sending settlement reminder:", error)
    }
  }

  const deleteSettlementGroup = useCallback(
    async (groupId: string) => {
      const res = await fetch(`/api/settlements/groups/${groupId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete group")
      }
      setSettlementGroups((prev) => prev.filter((g) => g.id !== groupId))
      return res.json()
    },
    []
  )

  const removeSettlementGroupMember = useCallback(
    async (groupId: string, userId: string) => {
      const res = await fetch(
        `/api/settlements/groups/${groupId}/members/${userId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to remove member")
      }
      setSettlementGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g
          return {
            ...g,
            members: g.members.filter((m) => m.userId !== userId),
          }
        })
      )
      return res.json()
    },
    []
  )

  // Receipt functions
  const addReceipt = async (receipt: Omit<Receipt, "id">) => {
    const receiptName = receipt.fileName

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/receipts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(receipt),
          })

          if (!response.ok) throw new Error("Failed to upload receipt")

          const newReceipt = await response.json()
          setReceipts([...receipts, newReceipt])
        },
        {
          loading: { title: "Uploading receipt..." },
          success: {
            title: "Receipt uploaded successfully",
            description: receiptName,
          },
          error: { title: "Failed to upload receipt" },
        }
      )
    } catch (error) {
      console.error("Error uploading receipt:", error)
    }
  }

  const deleteReceipt = async (id: string) => {
    const receiptFileName = receipts.find(r => r.id === id)?.fileName

    try {
      await toast.promise(
        async () => {
          const response = await fetch("/api/receipts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })

          if (!response.ok) throw new Error("Failed to delete receipt")

          setReceipts(receipts.filter(r => r.id !== id))
        },
        {
          loading: { title: "Deleting receipt..." },
          success: {
            title: "Receipt deleted successfully",
            description: receiptFileName ? receiptFileName : undefined,
          },
          error: { title: "Failed to delete receipt" },
        }
      )
    } catch (error) {
      console.error("Error deleting receipt:", error)
    }
  }

  const getReceiptsByTransaction = (transactionId: string): Receipt[] => {
    return receipts.filter(r => r.transactionId === transactionId)
  }

  // Utility functions
  const formatCurrency = (amount: number) => {
    const locale = settings.currency === "INR" ? "en-IN" : "en-US"
    return new Intl.NumberFormat(locale, {
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
    settlementGroups,
    settlementInvitations,
    loadSettlementWorkspace,
    createSettlementGroup,
    inviteToSettlementGroup,
    respondToSettlementInvite,
    addSettlementGroupTransaction,
    recordSettlementGroupPayment,
    sendSettlementGroupReminder,
    deleteSettlementGroup,
    removeSettlementGroupMember,
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
