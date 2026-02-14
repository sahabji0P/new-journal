export interface LocalSaathiMessageMetadata {
  cards?: unknown[]
  executedTools?: unknown[]
  provider?: string
  mutations?: unknown[]
}

export interface LocalSaathiMessage {
  role: "user" | "assistant"
  content: string
  metadata?: LocalSaathiMessageMetadata
}

const SAATHI_HISTORY_STORAGE_KEY = "saathi:recent-conversation"
const MAX_RECENT_MESSAGES = 6

function sanitizeMetadata(input: unknown): LocalSaathiMessageMetadata | undefined {
  if (!input || typeof input !== "object") return undefined
  const raw = input as Record<string, unknown>

  const cards = Array.isArray(raw.cards)
    ? raw.cards.filter(item => item && typeof item === "object").slice(0, 5)
    : undefined

  const executedTools = Array.isArray(raw.executedTools)
    ? raw.executedTools.filter(item => item && typeof item === "object").slice(0, 4)
    : undefined

  const provider = typeof raw.provider === "string" ? raw.provider : undefined
  const mutations = Array.isArray(raw.mutations)
    ? raw.mutations.filter(item => item && typeof item === "object").slice(0, 6)
    : undefined

  if (!cards && !executedTools && !provider && !mutations) return undefined

  return {
    ...(cards ? { cards } : {}),
    ...(executedTools ? { executedTools } : {}),
    ...(provider ? { provider } : {}),
    ...(mutations ? { mutations } : {}),
  }
}

export function readSaathiRecentConversation(): LocalSaathiMessage[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(SAATHI_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const normalized = parsed
      .filter((item): item is { role: "user" | "assistant"; content: string; metadata?: unknown } => {
        if (!item || typeof item !== "object") return false
        const candidate = item as { role?: unknown; content?: unknown }
        return (
          (candidate.role === "user" || candidate.role === "assistant") &&
          typeof candidate.content === "string" &&
          candidate.content.trim().length > 0
        )
      })
      .map(item => ({
        role: item.role,
        content: item.content.trim(),
        metadata: sanitizeMetadata(item.metadata),
      }))
      .slice(-MAX_RECENT_MESSAGES)

    return normalized
  } catch {
    return []
  }
}

export function writeSaathiRecentConversation(messages: LocalSaathiMessage[]) {
  if (typeof window === "undefined") return

  const trimmed = messages
    .filter(item => item.content.trim().length > 0 && (item.role === "user" || item.role === "assistant"))
    .map(item => ({
      role: item.role,
      content: item.content.trim(),
      metadata: sanitizeMetadata(item.metadata),
    }))
    .slice(-MAX_RECENT_MESSAGES)

  window.localStorage.setItem(SAATHI_HISTORY_STORAGE_KEY, JSON.stringify(trimmed))
}

export function clearSaathiRecentConversation() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SAATHI_HISTORY_STORAGE_KEY)
}

export function appendSaathiRecentConversation(...entries: LocalSaathiMessage[]) {
  const current = readSaathiRecentConversation()
  writeSaathiRecentConversation([...current, ...entries])
}
