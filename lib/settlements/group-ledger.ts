export type SplitMode = "equal" | "custom" | "percentage"

export type ParsedGroupShare = {
  userId: string
  name: string
  amount: number
  amountCents: number
  isPaid: boolean
  paidAt?: string
  percentage?: number
}

export type ParsedGroupTransactionData =
  | {
      transactionType: "expense"
      splitType: SplitMode
      totalAmountCents: number
      shares: ParsedGroupShare[]
    }
  | {
      transactionType: "settlement"
      totalAmountCents: number
      fromUserId: string
      toUserId: string
      fromUserName: string
      toUserName: string
      shares: []
    }

export type LedgerUser = {
  id: string
  name: string
  email: string
}

export type LedgerExpense = {
  paidByUserId: string
  totalAmountCents: number
  shares: {
    userId: string
    amountCents: number
  }[]
}

export type LedgerSettlement = {
  fromUserId: string
  toUserId: string
  amountCents: number
}

export type LedgerBalance = {
  userId: string
  userName: string
  userEmail: string
  balanceCents: number
}

export type LedgerSuggestion = {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amountCents: number
}

const SPLIT_MODES = new Set<SplitMode>(["equal", "custom", "percentage"])

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toCentsFromUnknown(value: unknown): number | null {
  const parsed = toFiniteNumber(value)
  if (parsed === null) return null
  return Math.round(parsed * 100)
}

export function centsToAmount(cents: number): number {
  return Number((cents / 100).toFixed(2))
}

export function amountToCents(amount: number): number {
  return Math.round(amount * 100)
}

export function splitEqually(totalCents: number, memberIds: string[]) {
  if (memberIds.length === 0) return [] as { userId: string; amountCents: number }[]
  const baseShare = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - (baseShare * memberIds.length)

  return memberIds.map((userId, index) => ({
    userId,
    amountCents: baseShare + (index === 0 ? remainder : 0),
  }))
}

export function splitByPercentages(
  totalCents: number,
  percentageSplits: { userId: string; percentage: number }[]
) {
  const totalPercentage = percentageSplits.reduce((sum, split) => sum + split.percentage, 0)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error("Percentages must sum to 100")
  }

  const computed = percentageSplits.map((split) => ({
    userId: split.userId,
    percentage: split.percentage,
    amountCents: Math.floor((totalCents * split.percentage) / 100),
  }))

  const allocated = computed.reduce((sum, split) => sum + split.amountCents, 0)
  if (allocated !== totalCents && computed.length > 0) {
    computed[0].amountCents += totalCents - allocated
  }

  return computed
}

export function validateCustomSplit(
  totalCents: number,
  shares: { userId: string; amountCents: number }[]
): { valid: boolean; error?: string } {
  const sum = shares.reduce((running, share) => running + share.amountCents, 0)
  if (sum !== totalCents) {
    return {
      valid: false,
      error: `Split total (${centsToAmount(sum)}) must equal total amount (${centsToAmount(totalCents)})`,
    }
  }

  const invalid = shares.find((share) => share.amountCents < 0)
  if (invalid) {
    return {
      valid: false,
      error: "Split amounts must be non-negative",
    }
  }

  return { valid: true }
}

function parseShareEntries(
  rawShares: unknown,
  memberNameById: Map<string, string>
): ParsedGroupShare[] {
  if (!Array.isArray(rawShares)) return []

  const parsed: ParsedGroupShare[] = []

  for (const rawEntry of rawShares) {
    if (typeof rawEntry !== "object" || rawEntry === null) continue
    const entry = rawEntry as Record<string, unknown>
    if (typeof entry.userId !== "string" || !entry.userId.trim()) continue

    const explicitCents = toFiniteNumber(entry.amountCents)
    const derivedCents = toCentsFromUnknown(entry.amount)
    const cents = explicitCents !== null ? Math.round(explicitCents) : derivedCents
    if (cents === null || cents < 0) continue

    const fallbackName = memberNameById.get(entry.userId) || "Member"
    const parsedShare: ParsedGroupShare = {
      userId: entry.userId,
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name : fallbackName,
      amountCents: cents,
      amount: centsToAmount(cents),
      isPaid: Boolean(entry.isPaid),
    }

    if (typeof entry.paidAt === "string" && entry.paidAt.trim()) {
      parsedShare.paidAt = entry.paidAt
    }

    const parsedPercentage = toFiniteNumber(entry.percentage)
    if (parsedPercentage !== null) {
      parsedShare.percentage = parsedPercentage
    }

    parsed.push(parsedShare)
  }

  return parsed
}

function parseLegacyShares(
  splitData: unknown,
  memberNameById: Map<string, string>
): ParsedGroupTransactionData | null {
  const shares = parseShareEntries(splitData, memberNameById)
  if (shares.length === 0) return null

  const totalAmountCents = shares.reduce((sum, share) => sum + share.amountCents, 0)
  return {
    transactionType: "expense",
    splitType: "custom",
    totalAmountCents,
    shares,
  }
}

export function parseGroupTransactionData(params: {
  splitData: unknown
  totalAmount: number
  paidByUserId: string
  paidByName: string
  memberNameById: Map<string, string>
}): ParsedGroupTransactionData {
  const legacyParsed = parseLegacyShares(params.splitData, params.memberNameById)
  if (legacyParsed) return legacyParsed

  if (typeof params.splitData !== "object" || params.splitData === null) {
    return {
      transactionType: "expense",
      splitType: "custom",
      totalAmountCents: amountToCents(params.totalAmount),
      shares: [],
    }
  }

  const payload = params.splitData as Record<string, unknown>
  const parsedType =
    payload.transactionType === "settlement" || payload.transactionType === "expense"
      ? payload.transactionType
      : "expense"

  if (parsedType === "settlement") {
    const settlementAmountFromCents = toFiniteNumber(payload.amountCents)
    const settlementAmountCents =
      settlementAmountFromCents !== null
        ? Math.round(settlementAmountFromCents)
        : amountToCents(params.totalAmount)

    const fromUserId =
      typeof payload.fromUserId === "string" && payload.fromUserId
        ? payload.fromUserId
        : params.paidByUserId

    const toUserId =
      typeof payload.toUserId === "string" && payload.toUserId ? payload.toUserId : ""

    const fromUserName =
      typeof payload.fromUserName === "string" && payload.fromUserName
        ? payload.fromUserName
        : params.memberNameById.get(fromUserId) || params.paidByName

    const toUserName =
      typeof payload.toUserName === "string" && payload.toUserName
        ? payload.toUserName
        : params.memberNameById.get(toUserId) || "Member"

    return {
      transactionType: "settlement",
      totalAmountCents: Math.max(0, settlementAmountCents),
      fromUserId,
      toUserId,
      fromUserName,
      toUserName,
      shares: [],
    }
  }

  const splitType =
    typeof payload.splitType === "string" && SPLIT_MODES.has(payload.splitType as SplitMode)
      ? (payload.splitType as SplitMode)
      : "custom"

  const shares = parseShareEntries(payload.shares, params.memberNameById)
  const fallbackTotal = amountToCents(params.totalAmount)
  const payloadTotal = toFiniteNumber(payload.totalAmountCents)
  const totalAmountCents =
    payloadTotal !== null
      ? Math.round(payloadTotal)
      : shares.reduce((sum, share) => sum + share.amountCents, 0) || fallbackTotal

  return {
    transactionType: "expense",
    splitType,
    totalAmountCents: Math.max(0, totalAmountCents),
    shares,
  }
}

export function calculateGroupBalances(input: {
  users: LedgerUser[]
  expenses: LedgerExpense[]
  settlements: LedgerSettlement[]
}): LedgerBalance[] {
  const balanceByUserId = new Map<string, number>()

  for (const user of input.users) {
    balanceByUserId.set(user.id, 0)
  }

  for (const expense of input.expenses) {
    const currentPayerBalance = balanceByUserId.get(expense.paidByUserId) || 0
    balanceByUserId.set(expense.paidByUserId, currentPayerBalance + expense.totalAmountCents)

    for (const share of expense.shares) {
      const currentShareBalance = balanceByUserId.get(share.userId) || 0
      balanceByUserId.set(share.userId, currentShareBalance - share.amountCents)
    }
  }

  for (const settlement of input.settlements) {
    const fromBalance = balanceByUserId.get(settlement.fromUserId) || 0
    balanceByUserId.set(settlement.fromUserId, fromBalance + settlement.amountCents)

    const toBalance = balanceByUserId.get(settlement.toUserId) || 0
    balanceByUserId.set(settlement.toUserId, toBalance - settlement.amountCents)
  }

  return input.users.map((user) => ({
    userId: user.id,
    userName: user.name || user.email || "Member",
    userEmail: user.email,
    balanceCents: balanceByUserId.get(user.id) || 0,
  }))
}

export function generateSettlementSuggestions(balances: LedgerBalance[]): LedgerSuggestion[] {
  const debtors = balances
    .filter((balance) => balance.balanceCents < 0)
    .map((balance) => ({
      userId: balance.userId,
      userName: balance.userName,
      pendingCents: Math.abs(balance.balanceCents),
    }))
    .sort((left, right) => right.pendingCents - left.pendingCents)

  const creditors = balances
    .filter((balance) => balance.balanceCents > 0)
    .map((balance) => ({
      userId: balance.userId,
      userName: balance.userName,
      pendingCents: balance.balanceCents,
    }))
    .sort((left, right) => right.pendingCents - left.pendingCents)

  const suggestions: LedgerSuggestion[] = []

  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]

    const suggestedAmount = Math.min(debtor.pendingCents, creditor.pendingCents)
    if (suggestedAmount > 0) {
      suggestions.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amountCents: suggestedAmount,
      })
    }

    debtor.pendingCents -= suggestedAmount
    creditor.pendingCents -= suggestedAmount

    if (debtor.pendingCents === 0) debtorIndex += 1
    if (creditor.pendingCents === 0) creditorIndex += 1
  }

  return suggestions
}

export function maximumAllowedSettlementCents(
  balances: LedgerBalance[],
  fromUserId: string,
  toUserId: string
): number {
  const fromBalance = balances.find((entry) => entry.userId === fromUserId)?.balanceCents || 0
  const toBalance = balances.find((entry) => entry.userId === toUserId)?.balanceCents || 0

  if (fromBalance >= 0 || toBalance <= 0) return 0
  return Math.min(Math.abs(fromBalance), toBalance)
}
