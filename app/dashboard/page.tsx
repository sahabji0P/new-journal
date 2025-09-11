"use client"

import { Dashboard } from "@/components/dashboard/Dashboard"
import { MenuBar } from "@/components/menu-bar"
import {
    CreditCard,
    PiggyBank,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function Home() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    interface Transaction {
        id: number
        description: string
        amount: number
        date: string
        category: string
        type: "income" | "expense"
        accountId: number
        accountName: string
    }

    interface Account {
        id: number
        name: string
        balance: number
        type: "checking" | "savings" | "credit"
    }

    const accounts: Account[] = [
        { id: 1, name: "Checking", balance: 8500.5, type: "checking" },
        { id: 2, name: "Savings", balance: 15000.0, type: "savings" },
        { id: 3, name: "Credit Card", balance: -500.25, type: "credit" },
    ]

    const transactions: Transaction[] = [
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
    ]

    const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([
        1, 2, 3,
    ])

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    if (!mounted) {
        return null
    }

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
        })
    }

    const toggleAccountSelection = (accountId: number) => {
        setSelectedAccountIds(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        )
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount)
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <MenuBar />

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                <section className="mb-12">
                    <div className="bg-gradient-to-r from-background via-muted/10 to-background p-8 rounded-2xl border border-border/50">
                        <div className="max-w-3xl">
                            <h2 className="text-3xl font-bold mb-4">
                                Welcome to your Financial Dashboard
                            </h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Get a clear overview of your finances. Track your spending,
                                manage budgets, and achieve your financial goals.
                            </p>
                            <div className="flex items-center gap-4 mt-6">
                                <button className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg hover:bg-foreground/90 transition-colors">
                                    <CreditCard className="w-4 h-4" />
                                    Add Transaction
                                </button>
                                <button className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg hover:border-muted-foreground/50 transition-colors">
                                    <PiggyBank className="w-4 h-4" />
                                    View Budgets
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
                <Dashboard
                    accounts={accounts}
                    transactions={transactions}
                    selectedAccountIds={selectedAccountIds}
                    toggleAccountSelection={toggleAccountSelection}
                    formatCurrency={formatCurrency}
                />
            </main>

            {/* Footer */}
            <footer className="border-t border-border/50 mt-12">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            <p className="text-sm text-muted-foreground mt-1">
                                {formatDate(currentTime)} • {formatTime(currentTime)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
                                aria-label="Toggle theme"
                            >
                                {theme === "dark" ? (
                                    <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
