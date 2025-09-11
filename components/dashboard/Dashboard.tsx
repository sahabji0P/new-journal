"use client"

import {
    BookOpen,
    CheckCircle,
    CreditCard,
    DollarSign,
    Landmark,
} from "lucide-react"

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

interface DashboardProps {
    accounts: Account[]
    transactions: Transaction[]
    selectedAccountIds: number[]
    toggleAccountSelection: (accountId: number) => void
    formatCurrency: (amount: number) => string
}

export function Dashboard({
    accounts,
    transactions,
    selectedAccountIds,
    toggleAccountSelection,
    formatCurrency,
}: DashboardProps) {
    const filteredAccounts = accounts.filter(acc =>
        selectedAccountIds.includes(acc.id)
    )
    const totalBalance = filteredAccounts.reduce(
        (sum, acc) => sum + acc.balance,
        0
    )

    const recentTransactions = transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)

    return (
        <>
            {/* Account Selection */}
            <section className="mb-8">
                <h3 className="text-xl font-bold mb-4">Your Accounts</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {accounts.map(account => (
                        <button
                            key={account.id}
                            onClick={() => toggleAccountSelection(account.id)}
                            className={`flex items-center justify-between gap-3 p-4 rounded-lg border transition-all ${selectedAccountIds.includes(account.id)
                                ? "border-primary/80 bg-primary/10 shadow-lg"
                                : "border-border hover:border-muted-foreground/50"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`p-2 rounded-full ${selectedAccountIds.includes(account.id)
                                        ? "bg-primary/20"
                                        : "bg-muted/50"
                                        }`}
                                >
                                    <Landmark className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold text-left">{account.name}</p>
                                    <p className="text-sm text-muted-foreground text-left">
                                        {formatCurrency(account.balance)}
                                    </p>
                                </div>
                            </div>
                            {selectedAccountIds.includes(account.id) && (
                                <CheckCircle className="w-5 h-5 text-primary" />
                            )}
                        </button>
                    ))}
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
                            <p className="text-2xl font-bold">
                                {formatCurrency(totalBalance)}
                            </p>
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
                    {recentTransactions.map(tx => (
                        <div
                            key={tx.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-muted/50 rounded-full">
                                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold">{tx.description}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(tx.date).toLocaleDateString("en-US", {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })}{" "}
                                        • {tx.accountName}
                                    </p>
                                </div>
                            </div>
                            <p
                                className={`font-semibold ${tx.type === "income" ? "text-green-500" : "text-red-500"
                                    }`}
                            >
                                {tx.type === "income" ? "+" : "-"}
                                {formatCurrency(Math.abs(tx.amount))}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </>
    )
}
