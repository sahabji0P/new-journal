# Recurring Transactions: Calendar Integration & Form Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show upcoming recurring payments on the transaction calendar view (with distinct styling for unpaid items), and redesign the recurring transaction form to match the app's modern UI inspired by a subscription-management aesthetic.

**Architecture:** Two independent workstreams — (A) inject projected recurring occurrences into the calendar data layer and render them distinctly, (B) replace the plain add/edit form with a modern card-based layout matching TransactionFormModern's patterns. Both share the same data model; no schema changes needed.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS 4, date-fns, Radix UI (shadcn/ui), Prisma (read-only for this feature)

---

## Research: Start Date & End Date

**Start Date — Keep it, but default to today and rename to "First Payment".** The `startDate` field is used to calculate `nextDueDate` (the core scheduling field). Without it, we can't compute when the first occurrence happens. However, 90%+ of users create recurring transactions starting "now", so we default to today and let them change it.

**End Date — Remove from the form.** The `endDate` field is optional in the schema and is never checked by `processRecurringTransactions()` — it has zero runtime effect. Users who want to stop a recurring transaction simply toggle it inactive. Removing it reduces form complexity with no functionality loss. The DB column stays (no migration needed); we just stop exposing it in the UI.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/transactions/TransactionsList.tsx` | Modify | Inject recurring projections into `calendarDataByDay`, render upcoming items distinctly |
| `components/transactions/TransactionRow.tsx` | Modify | Add `isUpcoming` prop for dashed/muted styling |
| `components/recurring/RecurringTransactionsManagement.tsx` | Modify | Replace add/edit form dialogs with new modern layout |
| `lib/recurring-calendar.ts` | Create | Pure utility: generate projected occurrence dates for a date range from recurring rules |

---

## Task 1: Recurring Calendar Projection Utility

**Files:**
- Create: `lib/recurring-calendar.ts`

This is a pure function that takes recurring transactions and a date range, and returns projected occurrences as lightweight objects suitable for calendar display.

- [ ] **Step 1: Create the utility file**

```typescript
// lib/recurring-calendar.ts
import { addDays, addWeeks, addMonths, addYears, parseISO, isBefore, isAfter, format } from "date-fns"
import type { RecurringTransaction } from "./types"

export interface ProjectedOccurrence {
  /** Synthetic ID for React keys: `recurring-{ruleId}-{date}` */
  id: string
  recurringId: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  accountId: string
  accountName?: string
  date: string          // "yyyy-MM-dd"
  frequency: string
  isUpcoming: true      // literal — always true, discriminator for rendering
}

/**
 * Advance a date by one frequency step.
 */
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

/**
 * Retreat a date by one frequency step (inverse of advanceDate).
 */
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

/**
 * Generate all projected occurrences for a set of recurring rules
 * within [rangeStart, rangeEnd].
 *
 * Handles three cases:
 * - nextDueDate is before rangeStart → advance cursor into range
 * - nextDueDate is after rangeEnd → retreat cursor into range
 * - nextDueDate is within range → start there
 *
 * Excludes dates that already have a matching real transaction
 * (matched by recurringId + date).
 */
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

    // If nextDueDate is after rangeEnd, walk backwards to find occurrences in range
    while (isAfter(cursor, rangeEnd) && safety < 400) {
      cursor = retreatDate(cursor, rule.frequency)
      safety++
    }

    // If nextDueDate is before rangeStart, walk forward into range
    safety = 0
    while (isBefore(cursor, rangeStart) && safety < 400) {
      cursor = advanceDate(cursor, rule.frequency)
      safety++
    }

    // Now walk forward through the range, collecting occurrences
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
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/recurring-calendar.ts
git commit -m "feat: add recurring calendar projection utility"
```

---

## Task 2: Show Recurring Projections on Calendar

**Files:**
- Modify: `components/transactions/TransactionsList.tsx`

Inject projected occurrences into the calendar data and render them with distinct styling.

- [ ] **Step 1: Import the utility and recurring data**

At the top of `TransactionsList.tsx`, add:

```typescript
import { projectRecurringOccurrences, type ProjectedOccurrence } from "@/lib/recurring-calendar"
import { startOfMonth, endOfMonth } from "date-fns"  // already imported, just ensure present
```

In the destructured `useApp()` call (~line 139), add `recurringTransactions`:

```typescript
const {
  transactions,
  accounts,
  categories,
  recurringTransactions,   // ADD THIS
  formatCurrency,
} = useApp()
```

- [ ] **Step 2: Compute projected occurrences for the visible calendar month**

Add a new `useMemo` after `calendarDataByDay` (around line 399):

```typescript
const calendarProjections = useMemo(() => {
  if (viewMode !== "calendar") return []

  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)

  // Build dedup set: "recurringId:yyyy-MM-dd" for existing transactions
  const existingDates = new Set<string>()
  transactions.forEach(t => {
    if (t.recurringId) {
      existingDates.add(`${t.recurringId}:${format(new Date(t.date), "yyyy-MM-dd")}`)
    }
  })

  return projectRecurringOccurrences(recurringTransactions, monthStart, monthEnd, existingDates)
}, [viewMode, calendarMonth, recurringTransactions, transactions])
```

- [ ] **Step 3: Merge projections into calendarDataByDay**

Create a combined memo that merges real transactions + projections:

```typescript
const calendarDataWithProjections = useMemo(() => {
  const merged = new Map<string, CalendarDayData>()

  // Deep-copy existing entries to avoid mutating calendarDataByDay objects
  calendarDataByDay.forEach((value, key) => {
    merged.set(key, { ...value, projections: [] })
  })

  for (const projection of calendarProjections) {
    const key = projection.date
    const existing = merged.get(key)

    if (existing) {
      existing.projections!.push(projection)
    } else {
      merged.set(key, { transactions: [], income: 0, expense: 0, projections: [projection] })
    }
  }

  return merged
}, [calendarDataByDay, calendarProjections])
```

Update the `CalendarDayData` interface to include projections:

```typescript
interface CalendarDayData {
  transactions: Transaction[]
  projections?: ProjectedOccurrence[]
  income: number
  expense: number
}
```

- [ ] **Step 4: Update calendar grid rendering to use merged data and show projection indicators**

Replace `calendarDataByDay.get(dayKey)` with `calendarDataWithProjections.get(dayKey)` in the calendar grid.

Add a projection indicator (amber/blue dashed dot) alongside the existing red/green dots:

```tsx
{/* Upcoming recurring indicator */}
{dayData.projections && dayData.projections.length > 0 && (
  <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400 ring-1 ring-amber-400/50" />
)}
```

- [ ] **Step 5: Update selected date detail section to show projections**

Below the real transactions list in the selected date section, render projected items:

```tsx
{selectedDateData?.projections && selectedDateData.projections.length > 0 && (
  <div className="mt-3 border-t border-dashed border-border/50 pt-3">
    <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-amber-500/80">
      Upcoming
    </p>
    {selectedDateData.projections.map(projection => (
      <TransactionRow
        key={projection.id}
        transaction={{
          ...projection,
          notes: undefined,
          tags: [],
          party: undefined,
          accountName: projection.accountName || "",
          recurringId: projection.recurringId,
        } as Transaction}
        formatCurrency={formatCurrency}
        onClick={() => {}}
        isUpcoming
        variant="compact"
      />
    ))}
  </div>
)}
```

- [ ] **Step 6: Update `selectedDateData` lookup to use merged data**

Change:
```typescript
const selectedDateData = selectedDateKey ? calendarDataByDay.get(selectedDateKey) : undefined
```
To:
```typescript
const selectedDateData = selectedDateKey ? calendarDataWithProjections.get(selectedDateKey) : undefined
```

- [ ] **Step 7: Verify it compiles and commit**

Run: `npx tsc --noEmit`

```bash
git add components/transactions/TransactionsList.tsx
git commit -m "feat: show recurring transaction projections on calendar view"
```

---

## Task 3: Upcoming Transaction Styling in TransactionRow

**Files:**
- Modify: `components/transactions/TransactionRow.tsx`

- [ ] **Step 1: Add `isUpcoming` prop**

```typescript
interface TransactionRowProps {
  transaction: Transaction
  formatCurrency: (amount: number) => string
  onClick: (transaction: Transaction) => void
  isSelected?: boolean
  isFocused?: boolean
  isUpcoming?: boolean         // ADD
  variant?: "default" | "compact"
}
```

Destructure it with default `false`:
```typescript
isUpcoming = false,
```

- [ ] **Step 2: Apply distinct styling when `isUpcoming`**

Update the button's className:
```typescript
className={cn(
  "w-full text-left transition-colors rounded-lg",
  isCompact ? "py-2.5 px-2" : "py-3 px-2",
  "hover:bg-muted/40",
  isSelected && "bg-muted/25",
  isUpcoming && "border border-dashed border-amber-500/30 opacity-65"
)}
```

Update the icon circle to use amber when upcoming:
```typescript
<span
  className={cn(
    "inline-flex shrink-0 items-center justify-center rounded-full",
    isCompact ? "h-8 w-8" : "h-9 w-9",
    isUpcoming
      ? "bg-amber-500/15 text-amber-500"
      : isIncome
        ? "bg-emerald-500/15 text-emerald-500"
        : "bg-muted text-muted-foreground"
  )}
>
```

Add an "Upcoming" label to the secondary text:
```typescript
const secondaryParts = isUpcoming ? ["Upcoming"] : []
secondaryParts.push(transaction.category)
if (transaction.party) secondaryParts.push(transaction.party)
secondaryParts.push(transactionTimeLabel(transaction.date))
```

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add components/transactions/TransactionRow.tsx
git commit -m "feat: add upcoming recurring transaction styling to TransactionRow"
```

---

## Task 4: Redesign Recurring Transaction Form

**Files:**
- Modify: `components/recurring/RecurringTransactionsManagement.tsx`

Replace the current plain form layout (add + edit dialogs) with a modern card-based design inspired by the subscription management screenshot, while using the app's existing UI components (Input, Select, Switch, FieldLabel, Button).

Design principles from inspiration:
- **Top section**: Type toggle (expense/income) + large amount display with frequency label
- **Billing section**: Card rows for "First payment" date, "Repeat" toggle with frequency chips, "Payment method" (account selector)
- **Details section**: Description, category, notes, tags
- **Config section**: Active toggle, auto-create toggle, reminder days

- [ ] **Step 1: Update DEFAULT_RECURRING_FORM — remove endDate**

```typescript
const DEFAULT_RECURRING_FORM = {
  description: "",
  amount: "",
  category: "",
  type: "expense" as "income" | "expense",
  accountId: "",
  frequency: "monthly" as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
  startDate: new Date().toISOString().split("T")[0],
  isActive: true,
  autoCreate: true,
  reminderDays: "3",
  notes: "",
  tags: "",
}
```

- [ ] **Step 2: Extract the form body into a reusable `RecurringTransactionForm` component**

Create a new inline component within the same file (above the main export) that renders the form body. This will be used by both the Add and Edit dialogs — no duplication.

```typescript
type RecurringFormData = typeof DEFAULT_RECURRING_FORM
type RecurringFormProps = {
  formData: RecurringFormData
  setFormData: React.Dispatch<React.SetStateAction<RecurringFormData>>
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  formatCurrency: (amount: number) => string
}

function RecurringTransactionForm({ formData, setFormData, accounts, categories, formatCurrency }: RecurringFormProps) {
  const frequencyLabel: Record<string, string> = {
    daily: "day", weekly: "week", biweekly: "2 weeks",
    monthly: "month", quarterly: "quarter", yearly: "year",
  }

  return (
    <div className="space-y-5">
      {/* ── Type Toggle + Amount ── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(["expense", "income"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: t }))}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors",
                formData.type === t
                  ? t === "expense"
                    ? "bg-red-500/15 text-red-500 ring-1 ring-red-500/30"
                    : "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-baseline gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            className="h-14 text-2xl font-bold font-mono border-none bg-muted/30 rounded-xl text-center"
          />
          <span className="shrink-0 text-sm text-muted-foreground font-medium">
            / {frequencyLabel[formData.frequency] || formData.frequency}
          </span>
        </div>
      </div>

      {/* ── Description ── */}
      <div>
        <FieldLabel htmlFor="rec-description">Description</FieldLabel>
        <Input
          id="rec-description"
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="e.g. Netflix, Rent, Salary"
          className="mt-1.5 rounded-xl"
        />
      </div>

      {/* ── Billing Section ── */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Billing</p>

        {/* First payment date */}
        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">First payment</p>
            <p className="text-xs text-muted-foreground">When does this start?</p>
          </div>
          <Input
            type="date"
            value={formData.startDate}
            onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-auto border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Frequency selector */}
        <div className="rounded-xl bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium mb-2">Repeat cycle</p>
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, frequency: f }))}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  formData.frequency === f
                    ? "bg-primary text-primary-foreground ring-1 ring-primary/50"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {f === "biweekly" ? "Bi-weekly" : f}
              </button>
            ))}
          </div>
        </div>

        {/* Account (payment method) */}
        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Payment method</p>
            <p className="text-xs text-muted-foreground">Account to charge</p>
          </div>
          <Select
            value={formData.accountId}
            onValueChange={value => setFormData(prev => ({ ...prev, accountId: value }))}
          >
            <SelectTrigger className="w-auto border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none gap-1.5 focus:ring-0">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Category</p>
            <p className="text-xs text-muted-foreground">Spending category</p>
          </div>
          <Select
            value={formData.category}
            onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="w-auto border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none gap-1.5 focus:ring-0">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Configuration ── */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Settings</p>

        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Enable this recurring rule</p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={checked => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Auto-create</p>
            <p className="text-xs text-muted-foreground">Create transaction on due date</p>
          </div>
          <Switch
            checked={formData.autoCreate}
            onCheckedChange={checked => setFormData(prev => ({ ...prev, autoCreate: checked }))}
          />
        </div>

        {!formData.autoCreate && (
          <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Remind before</p>
              <p className="text-xs text-muted-foreground">Days before due date</p>
            </div>
            <Input
              type="number"
              min="0"
              max="30"
              value={formData.reminderDays}
              onChange={e => setFormData(prev => ({ ...prev, reminderDays: e.target.value }))}
              className="w-16 border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none focus-visible:ring-0"
            />
          </div>
        )}
      </div>

      {/* ── Notes & Tags ── */}
      <div className="space-y-3">
        <div>
          <FieldLabel htmlFor="rec-notes">Notes (optional)</FieldLabel>
          <Input
            id="rec-notes"
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional details"
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <FieldLabel htmlFor="rec-tags">Tags (optional)</FieldLabel>
          <Input
            id="rec-tags"
            value={formData.tags}
            onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="comma-separated, e.g. subscription, essential"
            className="mt-1.5 rounded-xl"
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace the Add dialog form body**

Find the current add dialog form content (the `<div className="space-y-4">` block inside the add DialogContent, ~lines 1040-1248) and replace it with:

```tsx
<RecurringTransactionForm
  formData={formData}
  setFormData={setFormData}
  accounts={accounts}
  categories={categories}
  formatCurrency={formatCurrency}
/>

<div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
  <Button variant="outline" onClick={() => handleAddDialogChange(false)}>
    Cancel
  </Button>
  <Button onClick={handleAddRecurring}>Add Recurring Transaction</Button>
</div>
```

- [ ] **Step 4: Replace the Edit dialog form body**

Find the edit dialog form content and replace it the same way. **Note:** This component uses a single shared `formData`/`setFormData` state for both add and edit dialogs (pre-populated on edit open). Use the same `formData`/`setFormData` props and wire the submit button to `handleEditRecurring`.

- [ ] **Step 5: Update handleAddRecurring — remove endDate handling**

In the `handleAddRecurring` function, remove the `endDate` field from the payload sent to the API. The field should simply not be included:

```typescript
// Remove: endDate: formData.endDate || undefined,
```

Do the same for `handleEditRecurring`.

- [ ] **Step 6: Add the `cn` import if not already present**

```typescript
import { cn } from "@/lib/utils"
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add components/recurring/RecurringTransactionsManagement.tsx
git commit -m "feat: redesign recurring transaction form with modern card-based layout"
```

---

## Task 5: Final Integration & Polish

**Files:**
- Modify: `components/transactions/TransactionsList.tsx` (minor)

- [ ] **Step 1: Ensure calendar net amount includes projections**

In the selected date section, update the net amount to also reflect upcoming amounts:

```typescript
const projectedExpense = selectedDateData?.projections
  ?.filter(p => p.type === "expense")
  .reduce((sum, p) => sum + Math.abs(p.amount), 0) || 0
const projectedIncome = selectedDateData?.projections
  ?.filter(p => p.type === "income")
  .reduce((sum, p) => sum + Math.abs(p.amount), 0) || 0
```

Display as a secondary line: "(+₹X upcoming)" below the real net, only when projections exist.

- [ ] **Step 2: Verify full build compiles**

Run: `npm run build`

- [ ] **Step 3: Manual testing checklist**

1. Open calendar view → verify today is selected by default
2. Navigate to a month with recurring transactions → see amber dots on projected days
3. Click a day with projections → see "Upcoming" section below real transactions
4. Upcoming rows show dashed border, amber icon, "Upcoming" label, muted opacity
5. Open Add Recurring dialog → verify new card-based form layout
6. Verify type toggle, amount, frequency chips, billing rows all work
7. No endDate field visible
8. Start date defaults to today
9. Edit an existing recurring → same modern form, pre-populated
10. Create a recurring transaction → appears on calendar as projection
11. Quick Complete still works (not affected by form changes)

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: recurring calendar projections and form redesign — final polish"
```
