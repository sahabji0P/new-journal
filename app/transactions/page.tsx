"use client"

import { MenuBar } from "@/components/menu-bar"

export default function TransactionsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <MenuBar />
            <main className="max-w-6xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold mb-4">Transactions</h1>
                <p>A list of your transactions will appear here.</p>
            </main>
        </div>
    )
}
