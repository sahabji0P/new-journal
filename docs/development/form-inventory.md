# Form Inventory And UX Upgrade Status

## Upgraded In This Pass
These now use the improved mobile-first dialog behavior (full-screen on mobile with back navigation), and unsaved-change confirmation on close for add/edit flows.

| Area | Form | File | Status |
|---|---|---|---|
| Settings | Add/Edit Account | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/settings/Accounts.tsx` | Upgraded |
| Settings | Add/Edit Category | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/settings/Categories.tsx` | Upgraded |
| Settings | Add/Edit Party | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/settings/Parties.tsx` | Upgraded |
| Budget | Create Budget | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/budget/BudgetManagement.tsx` | Upgraded |
| Budget | Add Category Allocation | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/budget/BudgetManagement.tsx` | Upgraded |
| Goals | Add/Edit Goal | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/goals/GoalsManagement.tsx` | Upgraded |
| Goals | Contribute To Goal | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/goals/GoalsManagement.tsx` | Upgraded |
| Watchlists | Add/Edit Watchlist | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/watchlists/WatchlistsManagement.tsx` | Upgraded |
| Recurring | Add/Edit Recurring Transaction | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/recurring/RecurringTransactionsManagement.tsx` | Upgraded |
| Templates | Add/Edit Template | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/templates/TemplatesManagement.tsx` | Upgraded |
| Settlements | Record Settlement | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/settlements/SettlementsManagement.tsx` | Upgraded |
| Transactions | Add/Edit Transaction (cancel guard) | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/transactions/TransactionFormModern.tsx` | Upgraded |

## Global UX Foundation Added
| Feature | File | Status |
|---|---|---|
| Mobile full-screen dialog presentation + back action + improved entry animation | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/ui/dialog.tsx` | Added |
| Reusable unsaved-change guard hook | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/hooks/use-form-close-guard.ts` | Added |

## Remaining Forms To Upgrade In Next Pass
These forms are still functional but not yet migrated to the same unsaved-guard standard.

| Area | Form | File |
|---|---|---|
| Transactions | Quick Add chooser + full add/edit dialog wrappers | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/transactions/TransactionsList.tsx` |
| Transactions | Inline Edit Transaction Details | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/transactions/TransactionDetail.tsx` |
| Templates | Quick Add transaction from template | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/templates/TemplatesManagement.tsx` |
| Splits | Split Expense Form | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/splits/SplitExpenseForm.tsx` |
| Export | Export configuration form | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/export/ExportDialog.tsx` |
| Chat | Saathi workspace input form | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiWorkspace.tsx` |
| Chat | Saathi chat input form | `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiChat.tsx` |

## Upgrade Pattern
Use this pattern for all remaining forms:
1. Snapshot initial form state on open.
2. Intercept close (`onOpenChange` or back/cancel action).
3. Show stay/discard confirmation only if dirty.
4. On submit success, clear snapshot and close.
5. Keep mobile behavior full-screen with top back action.
