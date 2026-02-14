import { readFile } from "fs/promises"
import path from "path"

const CORE_KNOWLEDGE_PATH = path.join(process.cwd(), "docs/saathi/CORE_KNOWLEDGE.md")
const CORE_KNOWLEDGE_TTL_MS = 5 * 60 * 1000

const FALLBACK_CORE_KNOWLEDGE = `
# CORE product snapshot
- Personal finance workspace with accounts, transactions, budgets, categories, parties, templates, insights, goals, recurring entries, and receipts.
- Saathi should support both guidance and operational workflows (create/update/manage records).
- Keep answers grounded in user data and app capabilities.
`.trim()

let memoizedCoreKnowledge: { value: string; expiresAt: number } | null = null

export async function getSaathiCoreKnowledge(): Promise<string> {
  const now = Date.now()
  if (memoizedCoreKnowledge && memoizedCoreKnowledge.expiresAt > now) {
    return memoizedCoreKnowledge.value
  }

  try {
    const content = await readFile(CORE_KNOWLEDGE_PATH, "utf-8")
    const trimmed = content.trim()
    const value = trimmed || FALLBACK_CORE_KNOWLEDGE
    memoizedCoreKnowledge = {
      value,
      expiresAt: now + CORE_KNOWLEDGE_TTL_MS,
    }
    return value
  } catch {
    memoizedCoreKnowledge = {
      value: FALLBACK_CORE_KNOWLEDGE,
      expiresAt: now + CORE_KNOWLEDGE_TTL_MS,
    }
    return FALLBACK_CORE_KNOWLEDGE
  }
}
