# Settlement-Transaction Integration — Design Spec

## Goal

Integrate settlement payments with personal transactions, add "Resolve Payment" with partial payment support on the dashboard, enhance expense cards with payment status tracking, and redesign the AddExpenseSheet form.

## 1. Dashboard "Resolve Payment" Flow

### BalanceSummaryCard Changes
- "You Get Back" items: Add **"Resolve"** button alongside existing "Remind"
- Clicking "Resolve" opens `ResolvePaymentSheet` (new bottom sheet component)

### ResolvePaymentSheet
- **Who is paying**: Pre-filled name (read-only)
- **Amount**: Pre-filled with full owed amount, editable for partial payments. Validated: `0 < amount <= maxOwed`
- **Account**: Select which account receives the money (user's accounts dropdown)
- **Notes**: Optional (e.g. "UPI", "cash", "bank transfer")
- **"Record Payment"** button

**On submit:**
1. Call `recordSettlementGroupPayment` (existing API) → creates settlement in group ledger + posts to chat
2. Call new endpoint or extend existing: auto-create personal transactions for both parties (see Section 4)

### Chat Message for Partial Payments
Settlement message in chat shows: `"[Person] paid [You] ₹500 of ₹910"` for partial, or `"[Person] paid [You] ₹910"` for full settlement.

The existing `SettlementMessageCard` already shows fromName → toName + amount. For partial payments, the settlement API already handles this — the chat message content JSON includes the amount. The balance system automatically tracks remaining debt.

## 2. ExpenseMessageCard Enhancement

### Current State
Shows split breakdown (name + amount) with no payment status.

### Changes
- Each share row: Add paid/unpaid indicator — green `CheckCircle` if `isPaid`, grey `Circle` if not
- Payer's share: Always shown as "paid" (they paid the bill)
- Summary line below splits: `"3/4 settled"` or `"All settled"` with progress
- When a settlement resolves, the expense's `splitData` JSON gets updated with `isPaid: true, paidAt: timestamp` for the relevant share

### Data Flow
When `POST /settlements` creates a settlement payment, it also updates the most recent expense transaction's `splitData` to mark the relevant share as paid. This is a best-effort match: find the most recent expense where this user has an unpaid share owed to the payer.

## 3. AddExpenseSheet Redesign

### Current Issues
- Flat layout, all fields same visual weight
- "Paid By" buried in a grid
- Participant selection is checkbox-heavy
- No way to mark who already paid their share

### New Layout (top to bottom)

**Section 1 — Header area:**
- Sheet title "Add Expense"
- Description input (prominent, placeholder: "What was this for?")

**Section 2 — Amount + Payer:**
- Large amount input (centered, big font)
- "Paid by" as a row of member avatar chips — tap to select payer. Selected one has primary ring.

**Section 3 — Split configuration:**
- Segmented control: Equal | Custom | Percentage (compact, single row)
- Below: participant list as toggleable avatar chips with names
- For Custom mode: inline amount input under each selected participant
- For Percentage mode: inline percentage input under each participant
- Balance indicator bar (same as current)

**Section 4 — Pre-paid tracking:**
- Expandable section: "Already paid their share?"
- Toggle per participant (excluding the payer) to mark as pre-settled
- Marked participants will have `isPaid: true` in the stored splitData

**Section 5 — Footer:**
- Notes (collapsible/expandable, starts collapsed)
- "Add Expense" submit button (full width)

### Props remain the same
The component interface doesn't change — same `onSubmit` shape. The `shares` in the submit payload include `isPaid` status for pre-paid participants.

## 4. Settlement → Personal Transaction Auto-Creation

### When a settlement payment is recorded:

**Modify `POST /api/settlements/groups/[groupId]/settlements`** to additionally:

1. **Create personal transaction for receiver** (the person getting paid):
   - `type: "income"`
   - `amount: +settlementAmount`
   - `description: "Settlement from [PayerName] — [GroupName]"`
   - `category: "Settlement"`
   - `accountId`: receiver's first/default account
   - `tags: ["group-settlement", groupName]`
   - `notes: "Settlement payment in group: [GroupName]"`
   - Update receiver's account balance: `increment: settlementAmount`

2. **Create personal transaction for payer**:
   - `type: "expense"`
   - `amount: -settlementAmount`
   - `description: "Settlement to [ReceiverName] — [GroupName]"`
   - `category: "Settlement"`
   - `accountId`: payer's first/default account
   - `tags: ["group-settlement", groupName]`
   - `notes: "Settlement payment in group: [GroupName]"`
   - Update payer's account balance: `decrement: settlementAmount`

3. **Update expense share `isPaid` status**:
   - Find the most recent expense transaction in the group where the payer has an unpaid share
   - Update `splitData` JSON: set `isPaid: true, paidAt: now` for the payer's share
   - If partial payment, find shares proportionally or mark the one closest in amount

4. **Invalidate caches** for both users: transactions, accounts, budgets, syncCore

### Account Selection
For auto-created transactions, use the user's first account (`financialAccount` ordered by `createdAt`). The ResolvePaymentSheet allows the receiver to select their account — this gets passed to the API.

## 5. Transaction Detail — Split Display

### When viewing a transaction with `isShared: true` and `splits`:
- `SplitViewer` component already shows paid/unpaid status with toggles
- Ensure `isPaid` badges display correctly with green check / grey circle
- If the transaction is linked to a group (has "group-settlement" tag), show group name context

### No structural changes needed
The existing `SplitViewer` already supports `isPaid` display and `onMarkPaid` toggle. The data just needs to flow correctly from the group settlement updates.

## File Changes

### New Files
- `components/settlements/dashboard/ResolvePaymentSheet.tsx` — Bottom sheet for recording incoming payments

### Modified Files
- `components/settlements/dashboard/BalanceSummaryCard.tsx` — Add "Resolve" button + sheet trigger
- `components/settlements/chat/cards/ExpenseMessageCard.tsx` — Add paid/unpaid badges, progress summary
- `components/settlements/chat/AddExpenseSheet.tsx` — Full UI redesign with pre-paid tracking
- `app/api/settlements/groups/[groupId]/settlements/route.ts` — Auto-create personal transactions + update share isPaid
- `components/settlements/chat/cards/SettlementMessageCard.tsx` — Support partial payment display

### Unchanged
- `SplitViewer.tsx` — Already supports isPaid display
- `TransactionDetail.tsx` — Already renders SplitViewer correctly
- Group ledger calculation — Already handles partial settlements correctly
