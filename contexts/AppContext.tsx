"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type {
  Account,
  Budget,
  Category,
  Transaction,
} from "@/lib/types"

interface AppContextType {
  // Accounts
  accounts: Account[]
  addAccount: (account: Omit<Account, "id">) => void
  updateAccount: (id: number, account: Partial<Account>) => void
  deleteAccount: (id: number) => void

  // Transactions
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id">) => void
  updateTransaction: (id: number, transaction: Partial<Transaction>) => void
  deleteTransaction: (id: number) => void

  // Budgets
  budgets: Budget[]
  addBudget: (budget: Omit<Budget, "id">) => void
  updateBudget: (id: number, budget: Partial<Budget>) => void
  deleteBudget: (id: number) => void

  // Categories
  categories: Category[]
  addCategory: (category: Omit<Category, "id">) => void
  updateCategory: (id: number, category: Partial<Category>) => void
  deleteCategory: (id: number) => void

  // Selected accounts for filtering
  selectedAccountIds: number[]
  setSelectedAccountIds: (ids: number[]) => void
  toggleAccountSelection: (id: number) => void

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
    name: "Monthly",
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAccounts = localStorage.getItem("accounts")
      const storedTransactions = localStorage.getItem("transactions")
      const storedBudgets = localStorage.getItem("budgets")
      const storedCategories = localStorage.getItem("categories")
      const storedSelectedIds = localStorage.getItem("selectedAccountIds")

      setAccounts(storedAccounts ? JSON.parse(storedAccounts) : initialAccounts)
      setTransactions(storedTransactions ? JSON.parse(storedTransactions) : initialTransactions)
      setBudgets(storedBudgets ? JSON.parse(storedBudgets) : initialBudgets)
      setCategories(storedCategories ? JSON.parse(storedCategories) : initialCategories)
      setSelectedAccountIds(storedSelectedIds ? JSON.parse(storedSelectedIds) : [1, 2, 3])

      setIsInitialized(true)
    }
  }, [])

  // Save accounts to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem("accounts", JSON.stringify(accounts))
    }
  }, [accounts, isInitialized])

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem("transactions", JSON.stringify(transactions))
    }
  }, [transactions, isInitialized])

  // Save budgets to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem("budgets", JSON.stringify(budgets))
    }
  }, [budgets, isInitialized])

  // Save categories to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem("categories", JSON.stringify(categories))
    }
  }, [categories, isInitialized])

  // Save selected account IDs to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem("selectedAccountIds", JSON.stringify(selectedAccountIds))
    }
  }, [selectedAccountIds, isInitialized])

  // Account CRUD operations
  const addAccount = (account: Omit<Account, "id">) => {
    const newAccount = {
      ...account,
      id: Math.max(...accounts.map(a => a.id), 0) + 1,
      balance: 0, // Start with 0 balance
    }
    setAccounts([...accounts, newAccount])
  }

  const updateAccount = (id: number, updatedAccount: Partial<Account>) => {
    setAccounts(accounts.map(acc => (acc.id === id ? { ...acc, ...updatedAccount } : acc)))
  }

  const deleteAccount = (id: number) => {
    setAccounts(accounts.filter(acc => acc.id !== id))
    // Remove from selected accounts if it was selected
    setSelectedAccountIds(selectedAccountIds.filter(accId => accId !== id))
  }

  // Transaction CRUD operations
  const addTransaction = (transaction: Omit<Transaction, "id">) => {
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
  }

  const deleteTransaction = (id: number) => {
    const transaction = transactions.find(t => t.id === id)
    if (transaction) {
      // Reverse transaction's effect on account balance
      const account = accounts.find(acc => acc.id === transaction.accountId)
      if (account) {
        updateAccount(account.id, { balance: account.balance - transaction.amount })
      }
    }
    setTransactions(transactions.filter(t => t.id !== id))
  }

  // Budget CRUD operations
  const addBudget = (budget: Omit<Budget, "id">) => {
    const newBudget = {
      ...budget,
      id: Math.max(...budgets.map(b => b.id), 0) + 1,
      totalSpent: 0,
    }
    setBudgets([...budgets, newBudget])
  }

  const updateBudget = (id: number, updatedBudget: Partial<Budget>) => {
    setBudgets(budgets.map(b => (b.id === id ? { ...b, ...updatedBudget } : b)))
  }

  const deleteBudget = (id: number) => {
    setBudgets(budgets.filter(b => b.id !== id))
  }

  const updateBudgetSpending = (category: string, amount: number) => {
    setBudgets(prevBudgets =>
      prevBudgets.map(budget => ({
        ...budget,
        subBudgets: budget.subBudgets.map(sub =>
          sub.category === category
            ? { ...sub, spent: sub.spent + amount }
            : sub
        ),
        totalSpent: budget.totalSpent + amount,
      }))
    )
  }

  // Category CRUD operations
  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory = {
      ...category,
      id: Math.max(...categories.map(c => c.id), 0) + 1,
    }
    setCategories([...categories, newCategory])
  }

  const updateCategory = (id: number, updatedCategory: Partial<Category>) => {
    setCategories(categories.map(c => (c.id === id ? { ...c, ...updatedCategory } : c)))
  }

  const deleteCategory = (id: number) => {
    setCategories(categories.filter(c => c.id !== id))
  }

  // Account selection helpers
  const toggleAccountSelection = (id: number) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(accId => accId !== id) : [...prev, id]
    )
  }

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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
    selectedAccountIds,
    setSelectedAccountIds,
    toggleAccountSelection,
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
