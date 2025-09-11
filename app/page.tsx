"use client"

import {
  BookOpen,
  CreditCard,
  DollarSign,
  Landmark,
  PiggyBank
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { MenuBar } from "../components/menu-bar"

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

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
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Money Tracker
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Animated Menu Bar */}
      <div className="sticky top-[73px] z-40 py-4 bg-background/80 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6">
          <MenuBar />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Section */}
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

        {/* Financial Overview */}
        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">$12,345.67</p>
              </div>
            </div>
          </div>
          <div className="p-6 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Landmark className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-muted-foreground">Income (This Month)</p>
                <p className="text-2xl font-bold">$4,500.00</p>
              </div>
            </div>
          </div>
          <div className="p-6 border border-border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <CreditCard className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-muted-foreground">Expenses (This Month)</p>
                <p className="text-2xl font-bold">$2,150.25</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold mb-6">Recent Transactions</h3>
          <div className="space-y-4">
            {/* Transaction Item */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted/50 rounded-full">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Bookstore</p>
                  <p className="text-sm text-muted-foreground">
                    January 15, 2024
                  </p>
                </div>
              </div>
              <p className="font-semibold text-red-500">-$25.50</p>
            </div>
            {/* Transaction Item */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted/50 rounded-full">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Salary</p>
                  <p className="text-sm text-muted-foreground">
                    January 15, 2024
                  </p>
                </div>
              </div>
              <p className="font-semibold text-green-500">+$2,000.00</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 Money Tracker. Your personal finance companion.
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Built with Next.js</span>
              <span>•</span>
              <span>Framer Motion</span>
              <span>•</span>
              <span>Tailwind CSS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}