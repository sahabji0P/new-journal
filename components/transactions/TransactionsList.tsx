"use client"

import { useApp } from "@/contexts/AppContext"
import type { Transaction } from "@/lib/types"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Download,
  Filter,
  Plus,
  Repeat,
  Search,
  X,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Sheet, SheetContent } from "../ui/sheet"
import { TransactionFormModern } from "./TransactionFormModern"
import { TransactionDetail } from "./TransactionDetail"
import { ExportDialog } from "../export/ExportDialog"
import { useIsMobile } from "@/hooks/use-mobile"

interface TransactionsListProps {
  title?: string
}

export function TransactionsList({ title = "Transactions" }: TransactionsListProps) {
  const {
    transactions,
    accounts,
    categories,
    formatCurrency,
    formatDate,
  } = useApp()

  const isMobile = useIsMobile()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterAccount, setFilterAccount] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions]

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.party?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterAccount !== "all") {
      filtered = filtered.filter(t => t.accountId === filterAccount)
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(t => t.category === filterCategory)
    }

    if (filterType !== "all") {
      filtered = filtered.filter(t => t.type === filterType)
    }

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
      case "week": {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        filtered = filtered.filter(t => new Date(t.date) >= weekAgo)
        break
      }
      case "month": {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        filtered = filtered.filter(t => new Date(t.date) >= monthAgo)
        break
      }
      case "custom":
        if (customStartDate && customEndDate) {
          filtered = filtered.filter(t => {
            const tDate = new Date(t.date)
            return tDate >= new Date(customStartDate) && tDate <= new Date(customEndDate)
          })
        }
        break
    }

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

  useEffect(() => {
    if (filteredAndSortedTransactions.length === 0) {
      setSelectedTransaction(null)
    } else if (!selectedTransaction || !filteredAndSortedTransactions.find(t => t.id === selectedTransaction.id)) {
      setSelectedTransaction(filteredAndSortedTransactions[0])
    }
  }, [filteredAndSortedTransactions, selectedTransaction])

  const openDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    if (isMobile) {
      setMobileDetailOpen(true)
    }
  }

  const handlePrev = () => {
    if (!selectedTransaction) return
    const currentIndex = filteredAndSortedTransactions.indexOf(selectedTransaction)
    if (currentIndex > 0) {
      setSelectedTransaction(filteredAndSortedTransactions[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (!selectedTransaction) return
    const currentIndex = filteredAndSortedTransactions.indexOf(selectedTransaction)
    if (currentIndex < filteredAndSortedTransactions.length - 1) {
      setSelectedTransaction(filteredAndSortedTransactions[currentIndex + 1])
    }
  }

  const currentIndex = selectedTransaction
    ? filteredAndSortedTransactions.indexOf(selectedTransaction)
    : -1

  const clearFilters = () => {
    setSearchQuery("")
    setFilterAccount("all")
    setFilterCategory("all")
    setFilterType("all")
    setDateFilter("all")
    setCustomStartDate("")
    setCustomEndDate("")
    setSortBy("date")
    setSortOrder("desc")
  }

  const hasActiveFilters =
    searchQuery !== "" ||
    filterAccount !== "all" ||
    filterCategory !== "all" ||
    filterType !== "all" ||
    dateFilter !== "all" ||
    customStartDate !== "" ||
    customEndDate !== ""

  const totalIncome = filteredAndSortedTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const totalExpenses = filteredAndSortedTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const netAmount = totalIncome - totalExpenses

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {filteredAndSortedTransactions.length} transaction{filteredAndSortedTransactions.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center justify-end flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)} className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Link href="/transactions/recurring" className="hidden md:block">
            <Button variant="outline" className="gap-2">
              <Repeat className="w-4 h-4" />
              Recurring
            </Button>
          </Link>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 hidden md:inline-flex">
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-sm md:text-base font-semibold text-emerald-600">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-sm md:text-base font-semibold text-red-600">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`text-sm md:text-base font-semibold ${netAmount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(netAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" },
              { label: "Today", value: "today" },
              { label: "7 Days", value: "week" },
              { label: "30 Days", value: "month" },
            ].map(item => (
              <Button
                key={item.value}
                size="sm"
                variant={dateFilter === item.value ? "default" : "outline"}
                onClick={() => setDateFilter(item.value as "all" | "today" | "week" | "month")}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setShowAdvancedFilters(prev => !prev)}
            >
              <Filter className="w-4 h-4" />
              {showAdvancedFilters ? "Hide Filters" : "More Filters"}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {showAdvancedFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
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

                <Select
                  value={dateFilter}
                  onValueChange={(value: string) =>
                    setDateFilter(value as "all" | "today" | "week" | "month" | "custom")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
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

              {dateFilter === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
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

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Sort:</span>
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
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Transaction List</CardTitle>
            <CardDescription>Tap an item to view details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 md:max-h-[70vh] md:overflow-y-auto">
            {filteredAndSortedTransactions.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No transactions found.
              </div>
            ) : (
              filteredAndSortedTransactions.map(transaction => (
                <button
                  key={transaction.id}
                  onClick={() => openDetails(transaction)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedTransaction?.id === transaction.id && !isMobile
                      ? "bg-accent border-foreground/20"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${transaction.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        {transaction.type === "income" ? (
                          <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{transaction.description}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>{formatDate(transaction.date)}</span>
                          <span>•</span>
                          <span>{transaction.accountName}</span>
                          <span>•</span>
                          <span>{transaction.category}</span>
                        </div>
                      </div>
                    </div>
                    <p className={`font-bold text-sm whitespace-nowrap ${transaction.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {!isMobile && (
          <div className="md:col-span-2">
            <TransactionDetail
              transaction={selectedTransaction}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < filteredAndSortedTransactions.length - 1}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </div>
        )}
      </div>

      {!isMobile && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-3xl">
            <TransactionFormModern
              mode="add"
              onSubmit={() => setIsAddDialogOpen(false)}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {isMobile && (
        <>
          <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl p-4">
              <TransactionFormModern
                mode="add"
                onSubmit={() => setIsAddDialogOpen(false)}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
            <DialogContent className="p-0 sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
              <TransactionDetail
                transaction={selectedTransaction}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < filteredAndSortedTransactions.length - 1}
                onPrev={handlePrev}
                onNext={handleNext}
                onClose={() => setMobileDetailOpen(false)}
                isMobile
              />
            </DialogContent>
          </Dialog>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="fixed right-4 mobile-nav-offset z-40 rounded-full h-12 w-12 p-0 shadow-lg"
            aria-label="Add transaction"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </>
      )}

      <ExportDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen} />
    </div>
  )
}
