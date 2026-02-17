"use client"

import { useApp } from "@/contexts/AppContext"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useGSAP } from "@gsap/react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns"
import gsap from "gsap"
import {
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Filter,
  House,
  List,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  Utensils,
  Wallet,
  X,
} from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ExportDialog } from "../export/ExportDialog"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
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
import { TransactionDetail } from "./TransactionDetail"
import { TransactionFormModern } from "./TransactionFormModern"

gsap.registerPlugin(useGSAP)

interface TransactionsListProps {
  title?: string
}

type ViewMode = "list" | "calendar"

interface DayGroup {
  key: string
  date: Date
  heading: string
  subtitle: string
  transactions: Transaction[]
  netAmount: number
}

interface CalendarDayData {
  transactions: Transaction[]
  income: number
  expense: number
}

const MOBILE_BATCH_SIZE = 16
const DESKTOP_BATCH_SIZE = 40

function iconForTransaction(transaction: Transaction) {
  const value = `${transaction.category} ${transaction.description}`.toLowerCase()

  if (value.includes("grocery") || value.includes("market") || value.includes("shop")) {
    return ShoppingBag
  }

  if (value.includes("food") || value.includes("restaurant") || value.includes("cafe") || value.includes("coffee")) {
    return Utensils
  }

  if (value.includes("car") || value.includes("fuel") || value.includes("uber") || value.includes("transport")) {
    return CarFront
  }

  if (value.includes("rent") || value.includes("home") || value.includes("house")) {
    return House
  }

  if (value.includes("salary") || value.includes("income") || value.includes("payroll")) {
    return BriefcaseBusiness
  }

  if (value.includes("card") || value.includes("bank") || value.includes("credit")) {
    return CreditCard
  }

  return Wallet
}

function getDayHeading(date: Date): string {
  if (isToday(date)) return "Today"
  if (isSameDay(date, subDays(new Date(), 1))) return "Yesterday"
  return format(date, "EEEE")
}

function getSignedAmountText(amount: number, formatCurrency: (amount: number) => string): string {
  if (amount === 0) return formatCurrency(0)
  return `${amount > 0 ? "+" : "-"} ${formatCurrency(Math.abs(amount))}`
}

function transactionTimeLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--:--"
  return format(date, "hh:mm a")
}

export function TransactionsList({ title = "Transaction History" }: TransactionsListProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    transactions,
    accounts,
    categories,
    formatCurrency,
    formatDate,
  } = useApp()

  const isMobile = useIsMobile()
  const rootRef = useRef<HTMLDivElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterAccount, setFilterAccount] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [dateDialogOpen, setDateDialogOpen] = useState(false)

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false)
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formSeed, setFormSeed] = useState(0)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  const batchSize = isMobile ? MOBILE_BATCH_SIZE : DESKTOP_BATCH_SIZE
  const [visibleCount, setVisibleCount] = useState(batchSize)

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.accountName?.toLowerCase().includes(query) ||
        t.party?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
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

    if (dateFilter === "today") {
      filtered = filtered.filter(t => {
        const date = new Date(t.date)
        date.setHours(0, 0, 0, 0)
        return date.getTime() === today.getTime()
      })
    }

    if (dateFilter === "week") {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(t => new Date(t.date) >= weekAgo)
    }

    if (dateFilter === "month") {
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filtered = filtered.filter(t => new Date(t.date) >= monthAgo)
    }

    if (dateFilter === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => {
        const date = new Date(t.date)
        return date >= start && date <= end
      })
    }

    filtered.sort((a, b) => {
      if (sortBy === "amount") {
        const aAmount = Math.abs(a.amount)
        const bAmount = Math.abs(b.amount)
        return sortOrder === "asc" ? aAmount - bAmount : bAmount - aAmount
      }

      const aDate = new Date(a.date).getTime()
      const bDate = new Date(b.date).getTime()
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate
    })

    return filtered
  }, [
    transactions,
    searchQuery,
    filterAccount,
    filterCategory,
    filterType,
    sortBy,
    sortOrder,
    dateFilter,
    customStartDate,
    customEndDate,
  ])

  const hasActiveFilters =
    searchQuery !== "" ||
    filterAccount !== "all" ||
    filterCategory !== "all" ||
    filterType !== "all" ||
    dateFilter !== "all" ||
    customStartDate !== "" ||
    customEndDate !== ""

  const activeAdvancedFilterCount =
    (filterAccount !== "all" ? 1 : 0) +
    (filterCategory !== "all" ? 1 : 0) +
    (filterType !== "all" ? 1 : 0) +
    (dateFilter === "custom" ? 1 : 0) +
    (sortBy !== "date" || sortOrder !== "desc" ? 1 : 0)

  useEffect(() => {
    if (filteredAndSortedTransactions.length === 0) {
      setSelectedTransaction(null)
      return
    }

    if (!selectedTransaction || !filteredAndSortedTransactions.find(item => item.id === selectedTransaction.id)) {
      setSelectedTransaction(filteredAndSortedTransactions[0])
    }
  }, [filteredAndSortedTransactions, selectedTransaction])

  useEffect(() => {
    setVisibleCount(batchSize)
  }, [
    batchSize,
    viewMode,
    searchQuery,
    filterAccount,
    filterCategory,
    filterType,
    sortBy,
    sortOrder,
    dateFilter,
    customStartDate,
    customEndDate,
  ])

  const visibleTransactions = useMemo(() => {
    if (viewMode !== "list") return filteredAndSortedTransactions
    return filteredAndSortedTransactions.slice(0, visibleCount)
  }, [filteredAndSortedTransactions, visibleCount, viewMode])

  const hasMoreTransactions = viewMode === "list" && visibleCount < filteredAndSortedTransactions.length

  const loadMore = useCallback(() => {
    setVisibleCount(previous => Math.min(previous + batchSize, filteredAndSortedTransactions.length))
  }, [batchSize, filteredAndSortedTransactions.length])

  useEffect(() => {
    if (!hasMoreTransactions || !loadMoreSentinelRef.current) return

    const sentinel = loadMoreSentinelRef.current
    const root = isMobile ? mobileScrollRef.current : desktopScrollRef.current

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        loadMore()
      },
      {
        root,
        rootMargin: "220px 0px",
        threshold: 0,
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMoreTransactions, isMobile, loadMore])

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, DayGroup>()

    visibleTransactions.forEach(transaction => {
      const date = new Date(transaction.date)
      if (Number.isNaN(date.getTime())) return

      const key = format(date, "yyyy-MM-dd")
      const existing = groups.get(key)

      if (existing) {
        existing.transactions.push(transaction)
        existing.netAmount += transaction.amount
      } else {
        groups.set(key, {
          key,
          date,
          heading: getDayHeading(date),
          subtitle: format(date, "MMM d, yyyy"),
          transactions: [transaction],
          netAmount: transaction.amount,
        })
      }
    })

    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [visibleTransactions])

  const calendarDataByDay = useMemo(() => {
    const grouped = new Map<string, CalendarDayData>()

    filteredAndSortedTransactions.forEach(transaction => {
      const key = format(new Date(transaction.date), "yyyy-MM-dd")
      const existing = grouped.get(key) || { transactions: [], income: 0, expense: 0 }

      existing.transactions.push(transaction)
      if (transaction.type === "income") {
        existing.income += Math.abs(transaction.amount)
      } else {
        existing.expense += Math.abs(transaction.amount)
      }

      grouped.set(key, existing)
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

  const currentIndex = selectedTransaction
    ? filteredAndSortedTransactions.findIndex(item => item.id === selectedTransaction.id)
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

  const openDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    if (isMobile) {
      setMobileDetailOpen(true)
    }
  }

  const focusAccountHistory = (accountId: string) => {
    setViewMode("list")
    setFilterAccount(accountId)
    if (isMobile) {
      setMobileDetailOpen(false)
    }
  }

  const focusCategoryHistory = (category: string) => {
    setViewMode("list")
    setFilterCategory(category)
    if (isMobile) {
      setMobileDetailOpen(false)
    }
  }

  const openDateDialog = (day: Date) => {
    setSelectedDateKey(format(day, "yyyy-MM-dd"))
    setDateDialogOpen(true)
  }

  const handlePrev = () => {
    if (currentIndex <= 0) return
    setSelectedTransaction(filteredAndSortedTransactions[currentIndex - 1])
  }

  const handleNext = () => {
    if (currentIndex < 0 || currentIndex >= filteredAndSortedTransactions.length - 1) return
    setSelectedTransaction(filteredAndSortedTransactions[currentIndex + 1])
  }

  const openAddFlow = () => {
    setFormSeed(previous => previous + 1)
    setIsAddDialogOpen(true)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isAddShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n"
      if (!isAddShortcut) return

      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName.toLowerCase()
        const isTypingTarget =
          target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select"

        if (isTypingTarget) return
      }

      event.preventDefault()
      openAddFlow()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (searchParams.get("action") !== "add") return

    openAddFlow()
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("action")
    const nextPath = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
    router.replace(nextPath, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    const transactionId = searchParams.get("transactionId")
    if (!transactionId) return

    const matched = transactions.find(item => item.id === transactionId)
    if (!matched) return

    setSelectedTransaction(matched)
    if (isMobile) {
      setMobileDetailOpen(true)
    }
  }, [isMobile, searchParams, transactions])

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    gsap.fromTo(
      "[data-history-intro='true']",
      { y: 12, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.07,
      }
    )
  }, { scope: rootRef })

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const cards = rootRef.current?.querySelectorAll("[data-transaction-card='true']")
    if (!cards || cards.length === 0) return

    gsap.fromTo(
      cards,
      { y: 10, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.24,
        ease: "power2.out",
        stagger: 0.02,
      }
    )
  }, {
    scope: rootRef,
    dependencies: [
      visibleTransactions.length,
      viewMode,
      searchQuery,
      filterAccount,
      filterCategory,
      filterType,
      sortBy,
      sortOrder,
      dateFilter,
      customStartDate,
      customEndDate,
    ],
  })

  const mobileHistoryLayout = (
    <div
      data-history-intro="true"
      className="md:hidden flex h-[calc(100dvh-6.5rem)] min-h-[34rem] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95"
    >
      <header className="shrink-0 border-b border-border/60 px-3 pb-3 pt-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search transactions..."
              className="h-10 rounded-2xl border-border/70 bg-muted/30 pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsFiltersSheetOpen(true)}
            className="h-10 w-10 rounded-2xl border-border/70 bg-card p-0"
            aria-label="Open filters"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="inline-flex w-full items-center rounded-2xl border border-border/70 bg-muted/30 p-1">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="h-9 flex-1 rounded-xl text-sm"
            onClick={() => setViewMode("list")}
          >
            <List className="mr-2 h-4 w-4" />
            List
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "calendar" ? "default" : "ghost"}
            className="h-9 flex-1 rounded-xl text-sm"
            onClick={() => setViewMode("calendar")}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar
          </Button>
        </div>
      </header>

      {viewMode === "list" ? (
        <div ref={mobileScrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-20 pt-3 no-scrollbar">
          {groupedTransactions.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              No transactions found.
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {groupedTransactions.map(group => (
                <section key={group.key}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.heading}
                    </h3>
                    <p className={cn("text-sm font-semibold", group.netAmount >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {getSignedAmountText(group.netAmount, formatCurrency)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {group.transactions.map(transaction => {
                      const Icon = iconForTransaction(transaction)
                      const selected = selectedTransaction?.id === transaction.id

                      return (
                        <button
                          key={transaction.id}
                          type="button"
                          data-transaction-card="true"
                          onClick={() => openDetails(transaction)}
                          className={cn(
                            "w-full rounded-2xl border border-border/70 bg-card/90 p-3 text-left transition-all",
                            "hover:border-primary/40",
                            selected && "border-primary"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-2.5">
                              <span className={cn(
                                "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                transaction.type === "income"
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-primary/15 text-primary"
                              )}>
                                <Icon className="h-4 w-4" />
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold">{transaction.description}</p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {transaction.category} • {transactionTimeLabel(transaction.date)}
                                </p>
                              </div>
                            </div>

                            <p className={cn(
                              "whitespace-nowrap text-xl font-semibold leading-none",
                              transaction.type === "income" ? "text-emerald-500" : "text-foreground"
                            )}>
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>

                          <div className="mt-3 border-t border-border/60 pt-2">
                            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {transaction.accountName || "Unknown account"}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {hasMoreTransactions && (
            <div ref={loadMoreSentinelRef} className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more
            </div>
          )}
        </div>
      ) : (
        <div ref={mobileScrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3 no-scrollbar">
          <Card className="rounded-3xl border-border/70 bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={() => setCalendarMonth(prev => addMonths(prev, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-semibold uppercase tracking-[0.16em]">
                {format(calendarMonth, "MMMM yyyy")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={() => setCalendarMonth(prev => addMonths(prev, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayKey = format(day, "yyyy-MM-dd")
                const dayData = calendarDataByDay.get(dayKey)
                const dayCount = dayData?.transactions.length || 0
                const inCurrentMonth = isSameMonth(day, calendarMonth)

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => openDateDialog(day)}
                    className={cn(
                      "min-h-[5.8rem] rounded-lg border p-1 text-left",
                      inCurrentMonth ? "border-border/70 bg-card" : "border-border/50 bg-muted/20 text-muted-foreground",
                      isToday(day) && "border-primary"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{format(day, "d")}</span>
                      {dayCount > 0 && <span className="text-[10px] text-muted-foreground">{dayCount}</span>}
                    </div>
                    {dayData && (
                      <div className="mt-1 space-y-0.5 text-[10px]">
                        {dayData.expense > 0 && <p className="truncate text-red-500">{formatCurrency(-dayData.expense)}</p>}
                        {dayData.income > 0 && <p className="truncate text-emerald-500">{formatCurrency(dayData.income)}</p>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )

  const desktopHistoryLayout = (
    <div className="hidden md:block space-y-4">
      <div
        data-history-intro="true"
        className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/98 to-muted/20 p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Showing {visibleTransactions.length} of {filteredAndSortedTransactions.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 rounded-xl" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button className="h-10 rounded-xl" onClick={openAddFlow}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search transactions..."
              className="h-11 rounded-xl border-border/70 bg-muted/35 pl-9"
            />
          </div>

          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            className="h-11 rounded-xl"
            onClick={() => setDesktopFiltersOpen(previous => !previous)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeAdvancedFilterCount > 0 && (
              <span className="rounded-full bg-background/35 px-1.5 py-0.5 text-[10px]">
                {activeAdvancedFilterCount}
              </span>
            )}
          </Button>

          <div className="inline-flex h-11 items-center rounded-xl border border-border/70 bg-muted/30 p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-9 rounded-lg px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              className="h-9 rounded-lg px-3"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Button>
          </div>
        </div>

        {desktopFiltersOpen && (
          <div className="mt-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
            <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="h-10 rounded-xl bg-background/60">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-10 rounded-xl bg-background/60">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-10 rounded-xl bg-background/60">
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
                <SelectTrigger className="h-10 rounded-xl bg-background/60">
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
              <div className="mt-2 grid gap-2 lg:grid-cols-2">
                <div>
                  <Label htmlFor="history-start-date">Start Date</Label>
                  <Input
                    id="history-start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="history-end-date">End Date</Label>
                  <Input
                    id="history-end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                <Calendar className="mr-1 h-3.5 w-3.5" />
                Date {sortBy === "date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
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
                Amount {sortBy === "amount" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </Button>

              <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Export Filtered
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {viewMode === "list" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div>
            <div data-history-intro="true" className="rounded-3xl border border-border/70 bg-card/90 p-4">
              <div ref={desktopScrollRef} className="max-h-[calc(100dvh-17rem)] overflow-y-auto pr-1 no-scrollbar">
                {groupedTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No transactions found.
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {groupedTransactions.map(group => (
                      <section key={group.key}>
                        <div className="mb-2 flex items-end justify-between">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {group.heading}
                            </h3>
                            <p className="text-xs text-muted-foreground">{group.subtitle}</p>
                          </div>
                          <p className={cn("text-xs font-semibold", group.netAmount >= 0 ? "text-emerald-500" : "text-red-500")}>
                            {getSignedAmountText(group.netAmount, formatCurrency)}
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          {group.transactions.map(transaction => {
                            const Icon = iconForTransaction(transaction)
                            const selected = selectedTransaction?.id === transaction.id

                            return (
                              <button
                                key={transaction.id}
                                type="button"
                                data-transaction-card="true"
                                onClick={() => openDetails(transaction)}
                                className={cn(
                                  "w-full rounded-2xl border p-3 text-left transition-all",
                                  "bg-gradient-to-br from-card to-muted/10 hover:-translate-y-0.5 hover:border-primary/40",
                                  selected && "border-primary/65 bg-primary/[0.08]"
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                        transaction.type === "income"
                                          ? "bg-emerald-500/15 text-emerald-500"
                                          : "bg-primary/20 text-primary"
                                      )}>
                                        <Icon className="h-4.5 w-4.5" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">{transaction.description}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {transaction.category} • {transactionTimeLabel(transaction.date)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                      <span className="rounded-md bg-muted/55 px-2 py-0.5 text-muted-foreground">
                                        {transaction.accountName || "Unknown account"}
                                      </span>
                                      {transaction.party && (
                                        <span className="rounded-md bg-muted/55 px-2 py-0.5 text-muted-foreground">
                                          {transaction.party}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <p className={cn(
                                    "whitespace-nowrap text-base font-bold",
                                    transaction.type === "income" ? "text-emerald-500" : "text-red-500"
                                  )}>
                                    {formatCurrency(transaction.amount)}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                {hasMoreTransactions && (
                  <div ref={loadMoreSentinelRef} className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 lg:hidden">
              <TransactionDetail
                transaction={selectedTransaction}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex >= 0 && currentIndex < filteredAndSortedTransactions.length - 1}
                onPrev={handlePrev}
                onNext={handleNext}
                onAccountClick={focusAccountHistory}
                onCategoryClick={focusCategoryHistory}
              />
            </div>
          </div>

          <div className="hidden lg:block" data-history-intro="true">
            <div className="sticky top-24">
              <TransactionDetail
                transaction={selectedTransaction}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex >= 0 && currentIndex < filteredAndSortedTransactions.length - 1}
                onPrev={handlePrev}
                onNext={handleNext}
                onAccountClick={focusAccountHistory}
                onCategoryClick={focusCategoryHistory}
              />
            </div>
          </div>
        </div>
      ) : (
        <Card data-history-intro="true" className="rounded-3xl border-border/70 p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setCalendarMonth(prev => addMonths(prev, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              {format(calendarMonth, "MMMM yyyy")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => setCalendarMonth(prev => addMonths(prev, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map(day => {
              const dayKey = format(day, "yyyy-MM-dd")
              const dayData = calendarDataByDay.get(dayKey)
              const dayCount = dayData?.transactions.length || 0
              const inCurrentMonth = isSameMonth(day, calendarMonth)

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => openDateDialog(day)}
                  className={cn(
                    "min-h-[6.4rem] rounded-xl border p-1.5 text-left transition-colors",
                    inCurrentMonth ? "bg-card hover:bg-muted/45" : "bg-muted/20 text-muted-foreground",
                    isToday(day) && "border-primary/55 ring-1 ring-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{format(day, "d")}</span>
                    {dayCount > 0 && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{dayCount}</span>
                    )}
                  </div>
                  {dayData && (
                    <div className="mt-1.5 space-y-0.5 text-[10px]">
                      {dayData.expense > 0 && <p className="truncate text-red-500">{formatCurrency(-dayData.expense)}</p>}
                      {dayData.income > 0 && <p className="truncate text-emerald-500">{formatCurrency(dayData.income)}</p>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )

  return (
    <div ref={rootRef} className="space-y-4 md:space-y-6">
      {mobileHistoryLayout}
      {desktopHistoryLayout}

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{selectedDateLabel || "Date details"}</DialogTitle>
            <DialogDescription>
              {selectedDateData?.transactions.length || 0} transaction
              {(selectedDateData?.transactions.length || 0) !== 1 ? "s" : ""} on this date.
            </DialogDescription>
          </DialogHeader>

          {!selectedDateData || selectedDateData.transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              No transactions found on this date.
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDateData.transactions.map(transaction => (
                <button
                  key={transaction.id}
                  type="button"
                  className="w-full rounded-xl border p-3 text-left hover:bg-muted/25"
                  onClick={() => {
                    openDetails(transaction)
                    setDateDialogOpen(false)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{transaction.category} • {formatDate(transaction.date)}</p>
                    </div>
                    <p className={cn("text-sm font-semibold", transaction.type === "income" ? "text-emerald-500" : "text-red-500")}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={isFiltersSheetOpen} onOpenChange={setIsFiltersSheetOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-4">
          <SheetHeader>
            <SheetTitle>Filter Transactions</SheetTitle>
            <SheetDescription>Refine by account, category, type, date range, and sorting.</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 pt-3">
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 rounded-xl">
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
              <SelectTrigger className="h-10 rounded-xl">
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

            {dateFilter === "custom" && (
              <div className="grid gap-2">
                <div>
                  <Label htmlFor="mobile-history-start-date">Start Date</Label>
                  <Input
                    id="mobile-history-start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile-history-end-date">End Date</Label>
                  <Input
                    id="mobile-history-end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border/70 p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sort</p>
              <div className="flex flex-wrap gap-2">
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
                  Date {sortBy === "date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
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
                  Amount {sortBy === "amount" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </Button>
              </div>

              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setIsExportDialogOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Filtered Transactions
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearFilters}>Clear</Button>
              <Button className="flex-1" onClick={() => setIsFiltersSheetOpen(false)}>Done</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {!isMobile && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-3xl rounded-3xl">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>Create a new income or expense entry.</DialogDescription>
            </DialogHeader>
            <TransactionFormModern
              key={`desktop-add-${formSeed}`}
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
            <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-4">
              <SheetHeader>
                <SheetTitle>Add Transaction</SheetTitle>
                <SheetDescription>Create a new income or expense entry.</SheetDescription>
              </SheetHeader>
              <TransactionFormModern
                key={`mobile-add-${formSeed}`}
                mode="add"
                onSubmit={() => setIsAddDialogOpen(false)}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
            <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-[520px]">
              <DialogHeader className="sr-only">
                <DialogTitle>Transaction Details</DialogTitle>
                <DialogDescription>
                  Review and update details for the selected transaction.
                </DialogDescription>
              </DialogHeader>
              <TransactionDetail
                transaction={selectedTransaction}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex >= 0 && currentIndex < filteredAndSortedTransactions.length - 1}
                onPrev={handlePrev}
                onNext={handleNext}
                onClose={() => setMobileDetailOpen(false)}
                isMobile
                onAccountClick={focusAccountHistory}
                onCategoryClick={focusCategoryHistory}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      {isMobile && (
        <Button
          onClick={openAddFlow}
          className="mobile-nav-offset fixed right-4 z-40 h-12 w-12 rounded-full p-0 shadow-lg md:hidden"
          aria-label="Add transaction"
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        transactionsOverride={filteredAndSortedTransactions}
        contextLabel="current history filters"
      />
    </div>
  )
}
