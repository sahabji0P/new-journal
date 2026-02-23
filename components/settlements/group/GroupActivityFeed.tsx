"use client"

import { useState } from "react"
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ActivityTransaction {
  id: string
  transactionType?: string
  paidByName: string
  fromUserName?: string
  toUserName?: string
  totalAmount: number
  description: string
  shares: Array<{ userId: string; name: string; amount: number }>
  notes?: string
  createdAt: string
}

interface GroupActivityFeedProps {
  transactions: ActivityTransaction[]
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}

const ITEMS_PER_PAGE = 10

export function GroupActivityFeed({
  transactions,
  formatCurrency,
  formatDate,
}: GroupActivityFeedProps) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(transactions.length / ITEMS_PER_PAGE))
  const paginatedItems = transactions.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium mb-3">
        <MessageSquare className="h-4 w-4" />
        Activity Feed
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {transactions.length}
        </span>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedItems.map((tx) => {
              const isSettlement = tx.transactionType === "settlement"

              return (
                <div
                  key={tx.id}
                  className={`rounded-lg border p-3 ${
                    isSettlement
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-gradient-to-b from-background to-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {isSettlement && tx.fromUserName && tx.toUserName
                        ? `${tx.fromUserName} paid ${tx.toUserName} ${formatCurrency(tx.totalAmount)}`
                        : `${tx.paidByName} paid ${formatCurrency(tx.totalAmount)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mt-1">
                    {tx.description}
                  </div>

                  {!isSettlement && tx.shares.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {tx.shares.map((share) => (
                        <div
                          key={share.userId}
                          className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs"
                        >
                          <span>{share.name}</span>
                          <span className="font-medium">
                            {formatCurrency(share.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tx.notes && (
                    <div className="text-xs text-muted-foreground mt-2 italic">
                      {tx.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
