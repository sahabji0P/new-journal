import { revalidateTag, unstable_cache } from "next/cache"

export const USER_CACHE_SCOPES = {
  accounts: "accounts",
  transactions: "transactions",
  budgets: "budgets",
  budgetSummary: "budget-summary",
  categories: "categories",
  parties: "parties",
  goals: "goals",
  watchlists: "watchlists",
  recurring: "recurring",
  notifications: "notifications",
  settings: "settings",
  templates: "templates",
  settlements: "settlements",
  settlementGroupMessages: "settlement-group-messages",
  receipts: "receipts",
  insights: "insights",
  chatHistory: "chat-history",
  chatContext: "chat-context",
  syncCore: "sync-core",
  syncAdvanced: "sync-advanced",
} as const

export type UserCacheScope = (typeof USER_CACHE_SCOPES)[keyof typeof USER_CACHE_SCOPES]

const ALL_SCOPES = Object.values(USER_CACHE_SCOPES) as UserCacheScope[]

function getUserScopeTag(userId: string, scope: UserCacheScope): string {
  return `user:${userId}:${scope}`
}

export async function getCachedUserData<T>({
  userId,
  scope,
  loader,
  keyParts = [],
  revalidateSeconds = 120,
}: {
  userId: string
  scope: UserCacheScope
  loader: () => Promise<T>
  keyParts?: string[]
  revalidateSeconds?: number | false
}): Promise<T> {
  const cachedLoader = unstable_cache(loader, [scope, userId, ...keyParts], {
    tags: [getUserScopeTag(userId, scope)],
    revalidate: revalidateSeconds,
  })

  return cachedLoader()
}

export function invalidateUserCache(
  userId: string,
  scopes: readonly UserCacheScope[] = ALL_SCOPES
): void {
  const uniqueScopes = new Set(scopes)
  for (const scope of uniqueScopes) {
    revalidateTag(getUserScopeTag(userId, scope))
  }
}

export function stableSearchParamsKey(searchParams: URLSearchParams): string {
  const entries = [...searchParams.entries()].sort(([left], [right]) => left.localeCompare(right))
  if (entries.length === 0) return "default"
  return entries.map(([key, value]) => `${key}=${value}`).join("&")
}
