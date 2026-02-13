import { readFile } from "fs/promises"
import path from "path"

const CORE_KNOWLEDGE_PATH = path.join(process.cwd(), "docs/saathi/CORE_KNOWLEDGE.md")

const FALLBACK_CORE_KNOWLEDGE = `
# CORE product snapshot
- Personal finance workspace with accounts, transactions, budgets, categories, parties, templates, insights, goals, recurring entries, and receipts.
- Saathi should support both guidance and operational workflows (create/update/manage records).
- Keep answers grounded in user data and app capabilities.
`.trim()

export async function getSaathiCoreKnowledge(): Promise<string> {
  try {
    const content = await readFile(CORE_KNOWLEDGE_PATH, "utf-8")
    const trimmed = content.trim()
    if (!trimmed) return FALLBACK_CORE_KNOWLEDGE
    return trimmed
  } catch {
    return FALLBACK_CORE_KNOWLEDGE
  }
}
