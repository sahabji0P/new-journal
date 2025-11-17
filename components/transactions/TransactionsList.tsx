"use client"

import { useApp } from "@/contexts/AppContext"
import type { Transaction } from "@/lib/types"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { TransactionFormModern } from "./TransactionFormModern"

export function TransactionsList() {
  const {
    transactions,
    accounts,
    categories,
    deleteTransaction,
    formatCurrency,
    formatDate,
  } = useApp()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterAccount, setFilterAccount] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Account filter
    if (filterAccount !== "all") {
      filtered = filtered.filter(t => t.accountId === Number.parseInt(filterAccount))
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(t => t.category === filterCategory)
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(t => t.type === filterType)
    }

    // Date filter
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (dateFilter) {
      case "today":
        filtered = filtered.filter(t => {
          const transactionDate = new Date(t.date)
          transactionDate.setHours(0, 0, 0, 0)
          return transactionDate.getTime() === today.getTime()
        })
        break
      case "week":
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        filtered = filtered.filter(t => new Date(t.date) >= weekAgo)
        break
      case "month":
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        filtered = filtered.filter(t => new Date(t.date) >= monthAgo)
        break
      case "custom":
        if (customStartDate && customEndDate) {
          filtered = filtered.filter(t => {
            const tDate = new Date(t.date)
            return tDate >= new Date(customStartDate) && tDate <= new Date(customEndDate)
          })
        }
        break
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      }
      const amountA = Math.abs(a.amount)
      const amountB = Math.abs(b.amount)
      return sortOrder === "asc" ? amountA - amountB : amountB - amountA
    })

    return filtered
  }, [
    transactions,
    searchQuery,
    filterAccount,
    filterCategory,
    filterType,
    dateFilter,
    customStartDate,
    customEndDate,
    sortBy,
    sortOrder,
  ])


  const handleDeleteTransaction = () => {
    if (selectedTransaction) {
      deleteTransaction(selectedTransaction.id)
      setIsDeleteDialogOpen(false)
      setSelectedTransaction(null)
    }
  }

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDeleteDialogOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterAccount("all")
    setFilterCategory("all")
    setFilterType("all")
    setDateFilter("all")
    setCustomStartDate("")
    setCustomEndDate("")
  }

  const totalIncome = filteredAndSortedTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = Math.abs(
    filteredAndSortedTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const netAmount = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Income</CardDescription>
            <CardTitle className="text-2xl text-green-500">{formatCurrency(totalIncome)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-500">{formatCurrency(totalExpenses)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Net Amount</CardDescription>
            <CardTitle className={`text-2xl ${netAmount >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(netAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                {filteredAndSortedTransactions.length} transaction{filteredAndSortedTransactions.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger>
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(value: string) => setDateFilter(value as "all" | "today" | "week" | "month" | "custom")}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {dateFilter === "custom" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Sort and Clear Filters */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Button
                variant={sortBy === "date" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (sortBy === "date") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  } else {
                    setSortBy("date")
                    setSortOrder("desc")
                  }
                }}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
              </Button>
              <Button
                variant={sortBy === "amount" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (sortBy === "amount") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  } else {
                    setSortBy("amount")
                    setSortOrder("desc")
                  }
                }}
              >
                Amount {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-3 h-3 mr-1" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredAndSortedTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No transactions found. Add your first transaction to get started!</p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedTransactions.map(transaction => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${transaction.type === "income" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {transaction.type === "income" ? (
                        <ArrowUpCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{transaction.description}</p>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{formatDate(transaction.date)}</span>
                        <span>•</span>
                        <span>{transaction.accountName}</span>
                        <span>•</span>
                        <span>{transaction.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-bold text-lg ${transaction.type === "income" ? "text-green-500" : "text-red-500"}`}>
                      {transaction.type === "income" ? "+" : ""}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(transaction)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(transaction)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <TransactionFormModern
            mode="add"
            onSubmit={() => setIsAddDialogOpen(false)}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <TransactionFormModern
            mode="edit"
            initial={selectedTransaction || undefined}
            onSubmit={() => {
              setIsEditDialogOpen(false)
              setSelectedTransaction(null)
            }}
            onCancel={() => {
              setIsEditDialogOpen(false)
              setSelectedTransaction(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedTransaction.description}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(selectedTransaction.amount)} • {formatDate(selectedTransaction.date)}
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false)
              setSelectedTransaction(null)
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
