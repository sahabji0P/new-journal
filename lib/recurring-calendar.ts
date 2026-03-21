import { addDays, addWeeks, addMonths, addYears, parseISO, isBefore, isAfter, format } from "date-fns"
import type { RecurringTransaction } from "./types"

export interface ProjectedOccurrence {
  id: string
  recurringId: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  accountId: string
  accountName?: string
  date: string
  frequency: string
  isUpcoming: true
}

function advanceDate(date: Date, frequency: RecurringTransaction["frequency"]): Date {
  switch (frequency) {
    case "daily":     return addDays(date, 1)
    case "weekly":    return addWeeks(date, 1)
    case "biweekly":  return addWeeks(date, 2)
    case "monthly":   return addMonths(date, 1)
    case "quarterly": return addMonths(date, 3)
    case "yearly":    return addYears(date, 1)
    default:          return addDays(date, 1)
  }
}

function retreatDate(date: Date, frequency: RecurringTransaction["frequency"]): Date {
  switch (frequency) {
    case "daily":     return addDays(date, -1)
    case "weekly":    return addWeeks(date, -1)
    case "biweekly":  return addWeeks(date, -2)
    case "monthly":   return addMonths(date, -1)
    case "quarterly": return addMonths(date, -3)
    case "yearly":    return addYears(date, -1)
    default:          return addDays(date, -1)
  }
}

export function projectRecurringOccurrences(
  recurringTransactions: RecurringTransaction[],
  rangeStart: Date,
  rangeEnd: Date,
  existingTransactionDates: Set<string>,
): ProjectedOccurrence[] {
  const results: ProjectedOccurrence[] = []

  for (const rule of recurringTransactions) {
    if (!rule.isActive) continue

    let cursor = parseISO(rule.nextDueDate)
    let safety = 0

    while (isAfter(cursor, rangeEnd) && safety < 400) {
      cursor = retreatDate(cursor, rule.frequency)
      safety++
    }

    safety = 0
    while (isBefore(cursor, rangeStart) && safety < 400) {
      cursor = advanceDate(cursor, rule.frequency)
      safety++
    }

    safety = 0
    while (!isAfter(cursor, rangeEnd) && safety < 400) {
      safety++

      const dateKey = format(cursor, "yyyy-MM-dd")
      const dedupKey = `${rule.id}:${dateKey}`

      if (!existingTransactionDates.has(dedupKey)) {
        results.push({
          id: `recurring-${rule.id}-${dateKey}`,
          recurringId: rule.id,
          description: rule.description,
          amount: rule.amount,
          category: rule.category,
          type: rule.type,
          accountId: rule.accountId,
          accountName: rule.accountName,
          date: dateKey,
          frequency: rule.frequency,
          isUpcoming: true,
        })
      }

      cursor = advanceDate(cursor, rule.frequency)
    }
  }

  return results
}
