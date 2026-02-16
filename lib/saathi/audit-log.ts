import type { SaathiCard } from "@/lib/saathi/schema"

export type SaathiLogOperation = "view" | "create" | "update" | "delete" | "other"

const RESOURCE_KEYWORDS: Record<string, string[]> = {
  accounts: ["account"],
  categories: ["category"],
  parties: ["party"],
  templates: ["template"],
  transactions: ["transaction"],
  budgets: ["budget"],
  workspace: ["workspace", "data", "cleanup", "clear"],
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function inferSaathiLogOperation(tool: string): SaathiLogOperation {
  if (tool.startsWith("view_")) return "view"
  if (tool.startsWith("create_")) return "create"
  if (tool.startsWith("update_")) return "update"
  if (tool.startsWith("delete_")) return "delete"
  if (tool === "clear_core_data") return "delete"
  return "other"
}

export function inferSaathiLogResource(tool: string): string {
  if (tool === "clear_core_data") return "workspace"
  if (tool === "view_budget_snapshot") return "budgets"
  if (tool === "create_transaction_from_template") return "transactions"

  const base = tool.replace(/^(view|create|update|delete)_/, "")
  if (!base) return "workspace"
  if (base.endsWith("s")) return base
  return `${base}s`
}

function statusForOperation(operation: SaathiLogOperation): "info" | "created" | "updated" | "deleted" | null {
  if (operation === "create") return "created"
  if (operation === "update") return "updated"
  if (operation === "delete") return "deleted"
  if (operation === "view") return "info"
  return null
}

export function getMatchingCardDetailsForLog(
  cards: SaathiCard[],
  operation: SaathiLogOperation,
  resource: string
): string[] {
  const expectedStatus = statusForOperation(operation)
  if (!expectedStatus) return []

  if (operation === "view") {
    const listCard = cards.find(card => card.type === "list")
    if (listCard) {
      return listCard.items.slice(0, 6).map(item => item.description ? `${item.label}: ${item.description}` : item.label)
    }

    const statsCard = cards.find(card => card.type === "stats")
    if (statsCard) {
      return statsCard.stats.slice(0, 8).map(stat => `${stat.label}: ${stat.value}`)
    }

    const budgetCards = cards.filter((card): card is Extract<SaathiCard, { type: "budget" }> => card.type === "budget")
    if (budgetCards.length > 0) {
      return budgetCards.slice(0, 4).map(card => (
        `${card.name}: spent ${formatCurrency(card.spent)} of ${formatCurrency(card.allocated)}`
      ))
    }

    return []
  }

  const entityCards = cards.filter((card): card is Extract<SaathiCard, { type: "entity" }> => (
    card.type === "entity" && card.status === expectedStatus
  ))

  if (entityCards.length > 0) {
    const keywords = RESOURCE_KEYWORDS[resource] || [resource.replace(/s$/, "")]
    const matched = entityCards.find(card => keywords.some(keyword => card.title.toLowerCase().includes(keyword)))
      || entityCards[0]

    return matched.fields.map(field => `${field.label}: ${field.value}`).slice(0, 12)
  }

  const fallbackStats = cards.find(card => card.type === "stats")
  if (fallbackStats) {
    return fallbackStats.stats.slice(0, 8).map(stat => `${stat.label}: ${stat.value}`)
  }

  const fallbackText = cards.find(card => card.type === "text")
  if (fallbackText) {
    return [fallbackText.title ? `${fallbackText.title}: ${fallbackText.body}` : fallbackText.body]
  }

  const fallbackConfirm = cards.find(card => card.type === "confirm")
  if (fallbackConfirm && fallbackConfirm.preview.length > 0) {
    return fallbackConfirm.preview.slice(0, 8)
  }

  return []
}

