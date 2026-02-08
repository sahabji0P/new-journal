"use client"

import { useApp } from "@/contexts/AppContext"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Transaction } from "@/lib/types"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import {
  BellRing,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Plus,
  Repeat,
  Search,
  Table2,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ExportDialog } from "../export/ExportDialog"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { TransactionDetail } from "./TransactionDetail"
import { TransactionFormModern } from "./TransactionFormModern"

interface TransactionsListProps {
  title?: string
}

type ViewMode = "table" | "calendar"

interface CalendarDayData {
  transactions: Transaction[]
  income: number
  expense: number
}

export function TransactionsList({ title = "Transactions" }: TransactionsListProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    transactions,
    accounts,
    categories,
    templates,
    recurringTransactions,
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
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [dateDialogOpen, setDateDialogOpen] = useState(false)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [quickAddShowTemplates, setQuickAddShowTemplates] = useState(false)
  const [quickAddShowRecurring, setQuickAddShowRecurring] = useState(false)
  const [quickAddTemplateSearch, setQuickAddTemplateSearch] = useState("")
  const [formSeed, setFormSeed] = useState(0)
  const [addPrefill, setAddPrefill] = useState<Partial<Transaction> | undefined>(undefined)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

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
            const transactionDate = new Date(t.date)
            return transactionDate >= new Date(customStartDate) && transactionDate <= new Date(customEndDate)
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
      return
    }

    if (!selectedTransaction || !filteredAndSortedTransactions.find(t => t.id === selectedTransaction.id)) {
      setSelectedTransaction(filteredAndSortedTransactions[0])
    }
  }, [filteredAndSortedTransactions, selectedTransaction])

  const calendarDataByDay = useMemo(() => {
    const grouped = new Map<string, CalendarDayData>()

    filteredAndSortedTransactions.forEach(transaction => {
      const dateKey = format(new Date(transaction.date), "yyyy-MM-dd")
      const existing = grouped.get(dateKey) || { transactions: [], income: 0, expense: 0 }
      existing.transactions.push(transaction)

      if (transaction.type === "income") {
        existing.income += Math.abs(transaction.amount)
      } else {
        existing.expense += Math.abs(transaction.amount)
      }

      grouped.set(dateKey, existing)
    })

    grouped.forEach(value => {
      value.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })

    return grouped
  }, [filteredAndSortedTransactions])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    const start = startOfWeek(monthStart, { weekStartsOn: 0 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [calendarMonth])

  const selectedDateData = selectedDateKey ? calendarDataByDay.get(selectedDateKey) : undefined
  const selectedDateLabel = selectedDateKey
    ? format(parseISO(selectedDateKey), "EEEE, MMMM d, yyyy")
    : ""

  const openDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    if (isMobile) {
      setMobileDetailOpen(true)
    }
  }

  const openDateDialog = (day: Date) => {
    setSelectedDateKey(format(day, "yyyy-MM-dd"))
    setDateDialogOpen(true)
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

  const dueSoonRecurring = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAhead = new Date(today)
    weekAhead.setDate(weekAhead.getDate() + 7)

    return recurringTransactions
      .filter(item => {
        if (!item.isActive) return false
        const dueDate = new Date(item.nextDueDate)
        if (Number.isNaN(dueDate.getTime())) return false
        dueDate.setHours(0, 0, 0, 0)
        return dueDate >= today && dueDate <= weekAhead
      })
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
      .slice(0, 6)
  }, [recurringTransactions])

  const openAddFlow = (prefill?: Partial<Transaction>) => {
    setAddPrefill(prefill)
    setFormSeed(prev => prev + 1)
    setIsQuickAddOpen(false)
    setIsAddDialogOpen(true)
  }

  const closeAddDialog = () => {
    setIsAddDialogOpen(false)
    setAddPrefill(undefined)
  }

  const buildTemplatePrefill = (templateId: string): Partial<Transaction> | undefined => {
    const selectedTemplate = templates.find(template => template.id === templateId)
    if (!selectedTemplate) return undefined

    return {
      templateId: selectedTemplate.id,
      description: selectedTemplate.description || selectedTemplate.name,
      amount: selectedTemplate.amount,
      category: selectedTemplate.category,
      type: selectedTemplate.type,
      accountId: selectedTemplate.accountId || "",
      party: selectedTemplate.party,
      notes: selectedTemplate.notes,
      tags: selectedTemplate.tags,
      date: new Date().toISOString().split("T")[0],
    }
  }

  const buildRecurringPrefill = (recurringId: string): Partial<Transaction> | undefined => {
    const selectedRecurring = dueSoonRecurring.find(item => item.id === recurringId)
    if (!selectedRecurring) return undefined

    return {
      recurringId: selectedRecurring.id,
      description: selectedRecurring.description,
      amount: Math.abs(selectedRecurring.amount),
      category: selectedRecurring.category,
      type: selectedRecurring.type,
      accountId: selectedRecurring.accountId,
      notes: selectedRecurring.notes,
      tags: selectedRecurring.tags,
      date: new Date().toISOString().split("T")[0],
    }
  }

  const getDueLabel = (nextDueDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(nextDueDate)
    due.setHours(0, 0, 0, 0)
    const diffInDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffInDays <= 0) return "Due today"
    if (diffInDays === 1) return "Due tomorrow"
    return `Due in ${diffInDays}d`
  }

  const filteredQuickAddTemplates = useMemo(() => {
    const query = quickAddTemplateSearch.trim().toLowerCase()
    const sortedTemplates = [...templates].sort((a, b) => a.name.localeCompare(b.name))
    if (!query) return sortedTemplates.slice(0, 8)
    return sortedTemplates
      .filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [templates, quickAddTemplateSearch])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n"
      if (!isOpenShortcut) return

      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName.toLowerCase()
        const isTypingTarget =
          target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select"
        if (isTypingTarget) return
      }

      event.preventDefault()
      setIsQuickAddOpen(true)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (searchParams.get("action") !== "add") return

    setIsQuickAddOpen(true)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("action")
    const nextPath = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
    router.replace(nextPath, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (isQuickAddOpen) return
    setQuickAddShowTemplates(false)
    setQuickAddShowRecurring(false)
    setQuickAddTemplateSearch("")
  }, [isQuickAddOpen])

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
          <Button onClick={() => setIsQuickAddOpen(true)} className="gap-2 hidden md:inline-flex">
            <Plus className="w-4 h-4" />
            Add Transaction
            <kbd className="rounded border bg-background/60 px-1.5 py-0.5 text-[10px] font-medium">
              ⌘N
            </kbd>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showAdvancedFilters ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setShowAdvancedFilters(prev => !prev)}
              >
                <Filter className="w-4 h-4" />
                {showAdvancedFilters ? "Hide Filters" : "Filters"}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { label: "All", value: "all" },
                { label: "Today", value: "today" },
                { label: "7 Days", value: "week" },
                { label: "30 Days", value: "month" },
              ].map(item => (
                <Button
                  key={item.value}
                  size="sm"
                  className="rounded-full"
                  variant={dateFilter === item.value ? "default" : "outline"}
                  onClick={() => setDateFilter(item.value as "all" | "today" | "week" | "month")}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border p-1">
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className="gap-2"
                >
                  <Table2 className="w-4 h-4" />
                  Table
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  onClick={() => setViewMode("calendar")}
                  className="gap-2"
                >
                  <CalendarDays className="w-4 h-4" />
                  Calendar
                </Button>
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground">
                {filteredAndSortedTransactions.length} shown
              </span>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
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
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Sort</span>
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

      {viewMode === "table" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Table View</CardTitle>
              <CardDescription>Click a transaction row to inspect details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 md:max-h-[70vh] md:overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden lg:table-cell">Account</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden xl:table-cell">Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedTransactions.map(transaction => (
                      <TableRow
                        key={transaction.id}
                        onClick={() => openDetails(transaction)}
                        data-state={selectedTransaction?.id === transaction.id ? "selected" : undefined}
                        className="cursor-pointer"
                      >
                        <TableCell className="whitespace-nowrap">{formatDate(transaction.date)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.party && (
                            <div className="text-xs text-muted-foreground truncate">{transaction.party}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{transaction.accountName || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{transaction.category}</TableCell>
                        <TableCell className="hidden xl:table-cell capitalize">{transaction.type}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${transaction.type === "income" ? "text-emerald-600" : "text-red-600"
                            }`}
                        >
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
      ) : (
        <Card className="min-h-[72vh]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>
                  Expense totals are shown in red and income totals in green. Click any date for full details.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setCalendarMonth(prev => addMonths(prev, -1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="min-w-[10rem] text-center text-sm font-medium">
                  {format(calendarMonth, "MMMM yyyy")}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setCalendarMonth(prev => addMonths(prev, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2 mb-2 text-xs font-medium text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="px-2 py-1 text-center">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(day => {
                const dayKey = format(day, "yyyy-MM-dd")
                const dayData = calendarDataByDay.get(dayKey)
                const dayIncome = dayData?.income ?? 0
                const dayExpense = dayData?.expense ?? 0
                const dayCount = dayData?.transactions.length ?? 0
                const inCurrentMonth = isSameMonth(day, calendarMonth)

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => openDateDialog(day)}
                    className={`rounded-lg border p-2 text-left min-h-[7.5rem] transition-colors ${inCurrentMonth
                      ? "bg-card hover:bg-accent/40"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      } ${isToday(day) ? "ring-1 ring-primary/60" : ""}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className={isToday(day) ? "font-semibold text-primary" : ""}>{format(day, "d")}</span>
                      {dayCount > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                          {dayCount}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <p className="text-red-600 truncate">
                        Expense: {dayExpense > 0 ? formatCurrency(dayExpense) : "—"}
                      </p>
                      <p className="text-emerald-600 truncate">
                        Income: {dayIncome > 0 ? formatCurrency(dayIncome) : "—"}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDateLabel || "Date details"}</DialogTitle>
            <DialogDescription>
              {selectedDateData?.transactions.length || 0} transaction
              {(selectedDateData?.transactions.length || 0) !== 1 ? "s" : ""} on this date.
            </DialogDescription>
          </DialogHeader>

          {!selectedDateData || selectedDateData.transactions.length === 0 ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              No transactions found on this date.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Expense</p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(selectedDateData.expense)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Income</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(selectedDateData.income)}
                  </p>
                </div>
              </div>

              {selectedDateData.transactions.map(transaction => (
                <div key={transaction.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${transaction.type === "income" ? "text-emerald-600" : "text-red-600"
                        }`}
                    >
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">Category:</span> {transaction.category}
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">Account:</span> {transaction.accountName || "—"}
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">Party:</span> {transaction.party || "—"}
                    </div>
                  </div>

                  {transaction.notes && (
                    <p className="text-xs text-muted-foreground mt-3 border-t pt-2">{transaction.notes}</p>
                  )}

                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {transaction.tags.map(tag => (
                        <span key={`${transaction.id}-${tag}`} className="rounded-full border px-2 py-0.5 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!isMobile && (
        <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Quick Add Transaction</DialogTitle>
              <DialogDescription>
                Start from blank, a saved template, or a recurring transaction.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Button className="w-full justify-start" onClick={() => openAddFlow()}>
                <Plus className="w-4 h-4 mr-2" />
                New Blank Transaction
              </Button>

              {dueSoonRecurring.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <BellRing className="w-4 h-4 mt-0.5 text-amber-600" />
                      <p className="text-sm">
                        {dueSoonRecurring.length} recurring reminder{dueSoonRecurring.length > 1 ? "s" : ""} due in the next 7 days.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setQuickAddShowRecurring(prev => !prev)}
                    >
                      {quickAddShowRecurring ? "Hide" : "View"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-md border">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between rounded-md px-3"
                  onClick={() => setQuickAddShowTemplates(prev => !prev)}
                >
                  <span>Use Existing Template</span>
                  {quickAddShowTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                {quickAddShowTemplates && (
                  <div className="border-t p-3 space-y-2">
                    {templates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No templates created yet.</p>
                    ) : (
                      <>
                        <Input
                          value={quickAddTemplateSearch}
                          onChange={event => setQuickAddTemplateSearch(event.target.value)}
                          placeholder="Search templates..."
                        />
                        <div className="max-h-56 overflow-y-auto space-y-2">
                          {filteredQuickAddTemplates.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No matching templates.</p>
                          ) : (
                            filteredQuickAddTemplates.map(template => (
                              <Button
                                key={template.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => openAddFlow(buildTemplatePrefill(template.id))}
                              >
                                {template.name}
                              </Button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-md border">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between rounded-md px-3"
                  onClick={() => setQuickAddShowRecurring(prev => !prev)}
                >
                  <span>Use Recurring Reminder</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {dueSoonRecurring.length} due
                    {quickAddShowRecurring ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </Button>
                {quickAddShowRecurring && (
                  <div className="border-t p-3">
                    {dueSoonRecurring.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recurring transactions due in the next week.</p>
                    ) : (
                      <div className="space-y-2">
                        {dueSoonRecurring.map(item => (
                          <Button
                            key={item.id}
                            variant="outline"
                            className="w-full justify-start h-auto py-2"
                            onClick={() => openAddFlow(buildRecurringPrefill(item.id))}
                          >
                            <div className="text-left">
                              <p className="font-medium">{item.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {getDueLabel(item.nextDueDate)} • {formatDate(item.nextDueDate)} • {formatCurrency(item.amount)}
                              </p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {!isMobile && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>Create a new income or expense entry.</DialogDescription>
            </DialogHeader>
            <TransactionFormModern
              key={`desktop-add-${formSeed}`}
              mode="add"
              prefill={addPrefill}
              onSubmit={closeAddDialog}
              onCancel={closeAddDialog}
            />
          </DialogContent>
        </Dialog>
      )}

      {isMobile && (
        <>
          <Sheet open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
            <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl p-4">
              <SheetHeader className="px-0">
                <SheetTitle>Quick Add Transaction</SheetTitle>
                <SheetDescription>
                  Choose how you want to start.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-3 pt-2">
                <Button className="w-full justify-start" onClick={() => openAddFlow()}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Blank Transaction
                </Button>

                {dueSoonRecurring.length > 0 && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <BellRing className="w-4 h-4 mt-0.5 text-amber-600" />
                        <p className="text-sm">
                          {dueSoonRecurring.length} recurring reminder{dueSoonRecurring.length > 1 ? "s" : ""} due in the next 7 days.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setQuickAddShowRecurring(prev => !prev)}
                      >
                        {quickAddShowRecurring ? "Hide" : "View"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between rounded-md px-3"
                    onClick={() => setQuickAddShowTemplates(prev => !prev)}
                  >
                    <span>Use Existing Template</span>
                    {quickAddShowTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  {quickAddShowTemplates && (
                    <div className="border-t p-3 space-y-2">
                      {templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No templates created yet.</p>
                      ) : (
                        <>
                          <Input
                            value={quickAddTemplateSearch}
                            onChange={event => setQuickAddTemplateSearch(event.target.value)}
                            placeholder="Search templates..."
                          />
                          <div className="max-h-56 overflow-y-auto space-y-2">
                            {filteredQuickAddTemplates.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No matching templates.</p>
                            ) : (
                              filteredQuickAddTemplates.map(template => (
                                <Button
                                  key={template.id}
                                  variant="outline"
                                  className="w-full justify-start"
                                  onClick={() => openAddFlow(buildTemplatePrefill(template.id))}
                                >
                                  {template.name}
                                </Button>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between rounded-md px-3"
                    onClick={() => setQuickAddShowRecurring(prev => !prev)}
                  >
                    <span>Use Recurring Reminder</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {dueSoonRecurring.length} due
                      {quickAddShowRecurring ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </Button>
                  {quickAddShowRecurring && (
                    <div className="border-t p-3">
                      {dueSoonRecurring.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recurring transactions due in the next week.</p>
                      ) : (
                        <div className="space-y-2">
                          {dueSoonRecurring.slice(0, 6).map(item => (
                            <Button
                              key={item.id}
                              variant="outline"
                              className="w-full justify-start h-auto py-2"
                              onClick={() => openAddFlow(buildRecurringPrefill(item.id))}
                            >
                              <div className="text-left">
                                <p className="font-medium">{item.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getDueLabel(item.nextDueDate)} • {formatDate(item.nextDueDate)} • {formatCurrency(item.amount)}
                                </p>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl p-4">
              <SheetHeader className="px-0">
                <SheetTitle>Add Transaction</SheetTitle>
                <SheetDescription>Create a new income or expense entry.</SheetDescription>
              </SheetHeader>
              <TransactionFormModern
                key={`mobile-add-${formSeed}`}
                mode="add"
                prefill={addPrefill}
                onSubmit={closeAddDialog}
                onCancel={closeAddDialog}
              />
            </SheetContent>
          </Sheet>

          <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
            <DialogContent className="p-0 sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Transaction Details</DialogTitle>
                <DialogDescription>
                  Review and update details for the selected transaction.
                </DialogDescription>
              </DialogHeader>
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
            onClick={() => setIsQuickAddOpen(true)}
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
