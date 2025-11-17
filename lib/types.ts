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
}

export interface Category {
  id: number
  name: string
  type: "income" | "expense" | "both"
  color?: string
  icon?: string
}

export interface AppSettings {
  currency: string
  dateFormat: string
  language: string
  darkMode: boolean
}

// Helper type for form inputs
export type TransactionInput = Omit<Transaction, "id" | "accountName">

export type AccountInput = Omit<Account, "id" | "balance">

export type BudgetInput = Omit<Budget, "id" | "totalSpent">
