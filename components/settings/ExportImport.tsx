"use client"

import { useApp } from "@/contexts/AppContext"
import { Download, FileJson, FileSpreadsheet, Upload } from "lucide-react"
import { useRef } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

export function ExportImport() {
  const { exportData, importData, exportTransactionsCSV } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportJSON = () => {
    const jsonData = exportData()
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `core-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const csvData = exportTransactionsCSV()
    const blob = new Blob([csvData], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      importData(content)
    }
    reader.readAsText(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            <CardTitle>Export Data</CardTitle>
          </div>
          <CardDescription>Download your financial data for backup or analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 p-4 border rounded-lg">
                <FileJson className="w-8 h-8 text-blue-500" />
                <div className="flex-1">
                  <h4 className="font-semibold">Complete Backup (JSON)</h4>
                  <p className="text-sm text-muted-foreground">
                    Export all data including accounts, transactions, budgets, goals, and settings
                  </p>
                </div>
              </div>
              <Button onClick={handleExportJSON} className="gap-2">
                <Download className="w-4 h-4" />
                Export JSON
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 p-4 border rounded-lg">
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <div className="flex-1">
                  <h4 className="font-semibold">Transactions (CSV)</h4>
                  <p className="text-sm text-muted-foreground">
                    Export transactions for analysis in Excel or other tools
                  </p>
                </div>
              </div>
              <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            <CardTitle>Import Data</CardTitle>
          </div>
          <CardDescription>Restore your data from a previous backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Warning:</strong> Importing data will replace all current data. Make sure to export a backup first if you want to preserve your current data.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-4 border rounded-lg border-dashed">
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <h4 className="font-semibold">Import from JSON Backup</h4>
                  <p className="text-sm text-muted-foreground">
                    Select a JSON file exported from CORE
                  </p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Select File to Import
            </Button>
          </div>

          <div className="pt-4 space-y-2">
            <h4 className="font-semibold text-sm">What gets imported?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All accounts and balances</li>
              <li>All transactions and history</li>
              <li>Budgets and spending plans</li>
              <li>Categories and customizations</li>
              <li>Goals and progress</li>
              <li>Watchlists and recurring transactions</li>
              <li>Application settings and preferences</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
