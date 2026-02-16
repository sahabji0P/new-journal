"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, Eye, Loader2, PencilLine, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SaathiLogOperation = "view" | "create" | "update" | "delete" | "other"

interface SaathiLogEntry {
  id: string
  timestamp: string
  tool: string
  operation: SaathiLogOperation
  resource: string
  status: "success" | "error"
  summary: string
  userRequest: string
  details: string[]
}

function operationTone(operation: SaathiLogOperation): string {
  if (operation === "create") return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (operation === "update") return "text-amber-700 bg-amber-50 border-amber-200"
  if (operation === "delete") return "text-red-700 bg-red-50 border-red-200"
  if (operation === "view") return "text-slate-700 bg-slate-100 border-slate-300"
  return "text-muted-foreground bg-muted border-border"
}

function operationIcon(operation: SaathiLogOperation) {
  if (operation === "create") return Plus
  if (operation === "update") return PencilLine
  if (operation === "delete") return Trash2
  if (operation === "view") return Eye
  return Activity
}

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return timestamp
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function titleCase(input: string): string {
  return input
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function SaathiLog() {
  const [logs, setLogs] = useState<SaathiLogEntry[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle")
  const [error, setError] = useState("")

  const loadLogs = useCallback(async () => {
    setStatus("loading")
    setError("")

    try {
      const response = await fetch("/api/settings/saathi-logs?limit=150")
      if (!response.ok) {
        throw new Error("Failed to fetch Saathi logs")
      }

      const payload = await response.json() as SaathiLogEntry[]
      setLogs(Array.isArray(payload) ? payload : [])
      setStatus("loaded")
    } catch (fetchError) {
      setStatus("error")
      setError(fetchError instanceof Error ? fetchError.message : "Could not load Saathi logs")
    }
  }, [])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const summary = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        if (log.operation === "view") acc.view += 1
        else if (log.operation === "create") acc.create += 1
        else if (log.operation === "update") acc.update += 1
        else if (log.operation === "delete") acc.delete += 1
        else acc.other += 1
        return acc
      },
      { view: 0, create: 0, update: 0, delete: 0, other: 0 }
    )
  }, [logs])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saathi Log</CardTitle>
          <CardDescription>
            Every Saathi database operation with action type, status, and affected fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Views</p>
              <p className="text-sm font-semibold">{summary.view}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Creates</p>
              <p className="text-sm font-semibold">{summary.create}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Updates</p>
              <p className="text-sm font-semibold">{summary.update}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Deletes</p>
              <p className="text-sm font-semibold">{summary.delete}</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Other</p>
              <p className="text-sm font-semibold">{summary.other}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest 150 tool executions by Saathi</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadLogs()} disabled={status === "loading"}>
              {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status === "loading" && logs.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading Saathi logs...
            </div>
          )}

          {status === "error" && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || "Could not load Saathi logs."}
            </div>
          )}

          {status !== "loading" && logs.length === 0 && (
            <p className="text-sm text-muted-foreground">No Saathi operations logged yet.</p>
          )}

          {logs.length > 0 && (
            <div className="space-y-2">
              {logs.map(log => {
                const Icon = operationIcon(log.operation)
                return (
                  <div key={log.id} className="rounded-lg border bg-background p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${operationTone(log.operation)}`}>
                          <Icon className="w-3 h-3" />
                          {titleCase(log.operation)}
                        </span>
                        <span className="text-xs text-muted-foreground">{titleCase(log.resource)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${
                            log.status === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {titleCase(log.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm font-medium">{log.summary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Request: {log.userRequest}
                    </p>

                    {log.details.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {log.details.map((line, index) => (
                          <p key={`${log.id}-detail-${index}`} className="text-xs text-muted-foreground">
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
