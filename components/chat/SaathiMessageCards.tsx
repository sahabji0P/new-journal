"use client"

import Link from "next/link"
import { AlertCircle, CheckCircle2, CircleDot, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { SaathiAssistantMetadataSchema, type SaathiCard } from "@/lib/saathi/schema"

interface SaathiMessageCardsProps {
  metadata: unknown
  onSuggestedPrompt?: (prompt: string) => void
}

function statusBadgeClass(status: "info" | "draft" | "created" | "updated" | "error") {
  if (status === "created" || status === "updated") return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (status === "error") return "text-red-700 bg-red-50 border-red-200"
  if (status === "draft") return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-muted-foreground bg-muted border-border"
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function renderCard(card: SaathiCard, index: number, onSuggestedPrompt?: (prompt: string) => void) {
  if (card.type === "text") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          {card.title && <CardTitle className="text-sm">{card.title}</CardTitle>}
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.body}</p>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "stats") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{card.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {card.stats.map((stat, statIndex) => (
              <div key={`stat-${statIndex}`} className="rounded-lg border p-2.5">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p
                  className={cn(
                    "text-sm font-semibold mt-0.5",
                    stat.tone === "good" && "text-emerald-600",
                    stat.tone === "warn" && "text-amber-600"
                  )}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "list") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{card.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <ul className="space-y-2">
            {card.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`} className="rounded-lg border p-2.5">
                <p className="text-sm font-medium">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "entity") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">{card.title}</CardTitle>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
              {card.status}
            </span>
          </div>
          <CardDescription className="capitalize">
            {card.entityType}
            {card.entityId ? ` • ${card.entityId}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="space-y-1.5">
            {card.fields.map((field, fieldIndex) => (
              <div key={`field-${fieldIndex}`} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{field.label}</span>
                <span className="text-right font-medium">{field.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "budget") {
    const width = Math.max(0, Math.min(100, card.usagePercent))
    const overBudget = card.remaining < 0
    return (
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{card.name}</CardTitle>
          <CardDescription>Budget progress</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="space-y-2">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full transition-all", overBudget ? "bg-red-500" : "bg-emerald-500")}
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Allocated</p>
                <p className="font-medium">{formatCurrency(card.allocated)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Spent</p>
                <p className="font-medium">{formatCurrency(card.spent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className={cn("font-medium", overBudget && "text-red-600")}>
                  {formatCurrency(card.remaining)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Usage</p>
                <p className="font-medium">{card.usagePercent.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card key={`saathi-card-${index}`} className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">{card.title}</CardTitle>
        {card.description && <CardDescription>{card.description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-wrap gap-2">
          {card.actions.map((action, actionIndex) => {
            if (action.href) {
              return (
                <Button key={`action-${actionIndex}`} size="sm" variant={action.variant || "default"} asChild>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              )
            }

            if (action.suggestedPrompt && onSuggestedPrompt) {
              return (
                <Button
                  key={`action-${actionIndex}`}
                  size="sm"
                  variant={action.variant || "outline"}
                  onClick={() => onSuggestedPrompt(action.suggestedPrompt as string)}
                >
                  {action.label}
                </Button>
              )
            }

            return (
              <Button key={`action-${actionIndex}`} size="sm" variant={action.variant || "secondary"} disabled>
                {action.label}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function SaathiMessageCards({ metadata, onSuggestedPrompt }: SaathiMessageCardsProps) {
  const parsed = SaathiAssistantMetadataSchema.safeParse(metadata)
  if (!parsed.success) return null

  if (parsed.data.cards.length === 0 && parsed.data.executedTools.length === 0) return null

  return (
    <div className="space-y-2.5 mt-3">
      {parsed.data.cards.map((card, index) => renderCard(card, index, onSuggestedPrompt))}

      {parsed.data.executedTools.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Actions Executed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-2">
              {parsed.data.executedTools.map((item, index) => (
                <div key={`tool-${index}`} className="text-xs rounded-md border p-2 flex items-start gap-2">
                  {item.status === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium flex items-center gap-1">
                      <CircleDot className="w-3 h-3" />
                      {item.tool}
                    </p>
                    <p className="text-muted-foreground mt-0.5">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
