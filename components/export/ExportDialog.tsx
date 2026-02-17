"use client"

import { useState } from "react"
import { useApp } from "@/contexts/AppContext"
import type { Transaction } from "@/lib/types"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { FieldLabel } from "../ui/field"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Download, FileText, FileJson } from "lucide-react"
import { toast } from "@/lib/toast"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionsOverride?: Transaction[]
  contextLabel?: string
}

export function ExportDialog({
  open,
  onOpenChange,
  transactionsOverride,
  contextLabel,
}: ExportDialogProps) {
  const { transactions, accounts } = useApp()

  const isScopedExport = Boolean(transactionsOverride)

  const [format, setFormat] = useState<"csv" | "json">("csv")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedAccount, setSelectedAccount] = useState<string>("all")

  const handleExport = () => {
    let filteredTransactions = transactionsOverride ? [...transactionsOverride] : [...transactions]

    if (!isScopedExport && startDate) {
      filteredTransactions = filteredTransactions.filter(t => t.date >= startDate)
    }

    if (!isScopedExport && endDate) {
      filteredTransactions = filteredTransactions.filter(t => t.date <= endDate)
    }

    if (!isScopedExport && selectedAccount !== "all") {
      filteredTransactions = filteredTransactions.filter(t => t.accountId === selectedAccount)
    }

    if (filteredTransactions.length === 0) {
      toast.info("No transactions match the current export filters")
      return
    }

    if (format === "csv") {
      exportToCSV(filteredTransactions)
    } else {
      exportToJSON(filteredTransactions)
    }

    toast.success(`Exported ${filteredTransactions.length} transactions`, {
      description: `Format: ${format.toUpperCase()}`,
    })
    onOpenChange(false)
  }

  const exportToCSV = (data: Transaction[]) => {
    const headers = [
      "ID",
      "Date",
      "Description",
      "Amount",
      "Type",
      "Category",
      "Account",
      "Party",
      "Tags",
      "Notes",
    ]

    const rows = data.map(t => [
      t.id,
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      Math.abs(t.amount).toFixed(2),
      t.type,
      t.category,
      t.accountName,
      t.party || "",
      t.tags?.join("; ") || "",
      t.notes ? `"${t.notes.replace(/"/g, '""')}"` : "",
    ])

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    downloadFile(csvContent, "transactions.csv", "text/csv")
  }

  const exportToJSON = (data: Transaction[]) => {
    const exportData = {
      exportDate: new Date().toISOString(),
      transactionCount: data.length,
      context: contextLabel || null,
      filters: isScopedExport
        ? { source: "history-filtered-view" }
        : {
          startDate: startDate || "none",
          endDate: endDate || "none",
          account: selectedAccount === "all"
            ? "all"
            : accounts.find(a => a.id === selectedAccount)?.name || "unknown",
        },
      transactions: data.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        account: {
          id: t.accountId,
          name: t.accountName,
        },
        party: t.party || null,
        tags: t.tags || [],
        notes: t.notes || null,
        splits: t.splits || null,
        receiptId: t.receiptId || null,
        templateId: t.templateId || null,
      })),
    }

    const jsonContent = JSON.stringify(exportData, null, 2)
    downloadFile(jsonContent, "transactions.json", "application/json")
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono">Export Transactions</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {isScopedExport
              ? `Export ${contextLabel || "the currently filtered transaction set"} as CSV or JSON`
              : "Export your transaction data in CSV or JSON format"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="export-format">Export Format</FieldLabel>
            <Select value={format} onValueChange={(value: "csv" | "json") => setFormat(value)}>
              <SelectTrigger id="export-format" className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>CSV (Excel compatible)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    <span>JSON (Full data)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isScopedExport && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="start-date">Start Date (optional)</FieldLabel>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="end-date">End Date (optional)</FieldLabel>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="account-filter">Filter by Account (optional)</FieldLabel>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger id="account-filter" className="font-mono">
                    <SelectValue />
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
              </div>
            </>
          )}

          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-sm font-mono">
              {isScopedExport
                ? `${transactionsOverride?.length || 0} transactions in current view`
                : `${transactions.length} total transactions`}
            </p>
            {isScopedExport && contextLabel && (
              <p className="text-xs text-muted-foreground font-mono mt-1">{contextLabel}</p>
            )}
            {!isScopedExport && (startDate || endDate || selectedAccount !== "all") && (
              <p className="text-xs text-muted-foreground font-mono mt-1">Filters active</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export {format.toUpperCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
