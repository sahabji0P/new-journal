"use client"

import { useApp } from "@/contexts/AppContext"
import { toast } from "@/lib/toast"
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react"
import { useRef, useState } from "react"
import { todayLocalStr } from "@/lib/utils"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

type ImportSummaryEntry = {
  created: number
  updated: number
}

type ImportSummary = Record<string, ImportSummaryEntry>

export function ExportImport() {
  const { exportData, importData, exportTransactionsCSV } = useApp()

  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const excelFileInputRef = useRef<HTMLInputElement>(null)

  const [excelExporting, setExcelExporting] = useState(false)
  const [jsonExporting, setJsonExporting] = useState(false)
  const [csvExporting, setCsvExporting] = useState(false)
  const [excelImporting, setExcelImporting] = useState(false)
  const [jsonImporting, setJsonImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = async () => {
    setExcelExporting(true)
    try {
      const response = await fetch("/api/export/excel")
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Export failed" }))
        throw new Error(error.error || "Export failed")
      }
      const blob = await response.blob()
      const dateStr = todayLocalStr()
      triggerDownload(blob, `core-backup-${dateStr}.xlsx`)
      toast.success("Excel backup downloaded successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export Excel file"
      toast.error(message)
    } finally {
      setExcelExporting(false)
    }
  }

  const handleExportJSON = () => {
    setJsonExporting(true)
    try {
      const jsonData = exportData()
      const blob = new Blob([jsonData], { type: "application/json" })
      const dateStr = todayLocalStr()
      triggerDownload(blob, `core-backup-${dateStr}.json`)
      toast.success("JSON backup downloaded successfully")
    } catch {
      toast.error("Failed to export JSON file")
    } finally {
      setJsonExporting(false)
    }
  }

  const handleExportCSV = () => {
    setCsvExporting(true)
    try {
      const csvData = exportTransactionsCSV()
      const blob = new Blob([csvData], { type: "text/csv" })
      const dateStr = todayLocalStr()
      triggerDownload(blob, `transactions-${dateStr}.csv`)
      toast.success("CSV file downloaded successfully")
    } catch {
      toast.error("Failed to export CSV file")
    } finally {
      setCsvExporting(false)
    }
  }

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setExcelImporting(true)
    setImportSummary(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/import/excel", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Import failed")
      }

      if (data.success && data.summary) {
        setImportSummary(data.summary)
        toast.success("Excel data imported successfully")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import Excel file"
      toast.error(message)
    } finally {
      setExcelImporting(false)
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = ""
      }
    }
  }

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setJsonImporting(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const success = importData(content)
        if (success) {
          toast.success("JSON data imported successfully")
        } else {
          toast.error("Failed to import JSON data")
        }
      } catch {
        toast.error("Invalid JSON file")
      } finally {
        setJsonImporting(false)
      }
    }
    reader.onerror = () => {
      toast.error("Failed to read file")
      setJsonImporting(false)
    }
    reader.readAsText(file)

    if (jsonFileInputRef.current) {
      jsonFileInputRef.current.value = ""
    }
  }

  const formatEntityName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <CardTitle>Export Data</CardTitle>
          </div>
          <CardDescription>
            Download your financial data for backup or analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Excel Export */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-8 w-8 shrink-0 text-green-500" />
                <div className="min-w-0">
                  <h4 className="font-semibold">Complete Backup (Excel)</h4>
                  <p className="text-sm text-muted-foreground">
                    All data in a structured Excel workbook with separate sheets
                  </p>
                </div>
              </div>
              <Button
                onClick={handleExportExcel}
                disabled={excelExporting}
                className="mt-auto gap-2"
              >
                {excelExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Excel
              </Button>
            </div>

            {/* JSON Export */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <FileJson className="mt-0.5 h-8 w-8 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <h4 className="font-semibold">Complete Backup (JSON)</h4>
                  <p className="text-sm text-muted-foreground">
                    Machine-readable backup of all data
                  </p>
                </div>
              </div>
              <Button
                onClick={handleExportJSON}
                disabled={jsonExporting}
                variant="outline"
                className="mt-auto gap-2"
              >
                {jsonExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export JSON
              </Button>
            </div>

            {/* CSV Export */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-8 w-8 shrink-0 text-blue-500" />
                <div className="min-w-0">
                  <h4 className="font-semibold">Transactions Only (CSV)</h4>
                  <p className="text-sm text-muted-foreground">
                    Transaction list for spreadsheet analysis
                  </p>
                </div>
              </div>
              <Button
                onClick={handleExportCSV}
                disabled={csvExporting}
                variant="outline"
                className="mt-auto gap-2"
              >
                {csvExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
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
            <Upload className="h-5 w-5" />
            <CardTitle>Import Data</CardTitle>
          </div>
          <CardDescription>
            Restore your data from a previous backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning Banner */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm text-amber-600 dark:text-amber-400">
                <p>
                  <strong>JSON import</strong> replaces all current data. Make sure
                  to export a backup first.
                </p>
                <p className="mt-1">
                  <strong>Excel import</strong> merges with existing data, which is
                  safer for incremental updates.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Excel Import */}
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <div>
                  <h4 className="font-semibold">Import from Excel</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload an .xlsx file to merge data into your account
                  </p>
                </div>
              </div>
              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleImportExcel}
                className="hidden"
                id="import-excel-file"
              />
              <Button
                onClick={() => excelFileInputRef.current?.click()}
                disabled={excelImporting}
                className="mt-auto gap-2"
              >
                {excelImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {excelImporting ? "Importing..." : "Import Excel"}
              </Button>
            </div>

            {/* JSON Import */}
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <FileJson className="h-8 w-8 text-amber-400" />
                <div>
                  <h4 className="font-semibold">Import from JSON</h4>
                  <p className="text-sm text-muted-foreground">
                    Restore from a complete JSON backup file
                  </p>
                </div>
              </div>
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
                id="import-json-file"
              />
              <Button
                onClick={() => jsonFileInputRef.current?.click()}
                disabled={jsonImporting}
                variant="outline"
                className="mt-auto gap-2"
              >
                {jsonImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {jsonImporting ? "Importing..." : "Import JSON"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Summary */}
      {importSummary && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle className="text-base">Import Complete</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setImportSummary(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {Object.entries(importSummary).map(([entity, counts]) => {
                if (counts.created === 0 && counts.updated === 0) return null
                const parts: string[] = []
                if (counts.created > 0) parts.push(`${counts.created} created`)
                if (counts.updated > 0) parts.push(`${counts.updated} updated`)
                return (
                  <li key={entity} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                    <span>
                      <span className="font-medium">{formatEntityName(entity)}</span>
                      {": "}
                      {parts.join(", ")}
                    </span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
