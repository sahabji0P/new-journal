# State Management

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Money Tracker uses **React Context API** for global state management. No Redux, Zustand, or other state libraries.

## Why React Context?

### Advantages
- **Built-in**: No additional dependencies
- **Simple**: Easy to understand and maintain
- **Sufficient**: Handles app's scale well
- **TypeScript**: Excellent type inference

### When to Use Context
✅ Global app state (user data, accounts, transactions)
✅ Shared UI state (theme, modals)
✅ Data that many components need

### When NOT to Use Context
❌ Rapidly changing state (use local state)
❌ Heavy computations (use useMemo)
❌ Form state (use local state or form libraries)

## AppContext Structure

Located in `/contexts/AppContext.tsx` (~1625 lines).

### State Shape

```typescript
interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  session: Session | null;
  
  // Loading
  isLoading: boolean;
  loadingProgress: number;
  loadingStage: string;
  
  // Financial Data
  accounts: FinancialAccount[];
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  parties: Party[];
  goals: Goal[];
  watchlists: Watchlist[];
  recurring: RecurringTransaction[];
  templates: TransactionTemplate[];
  settlements: Settlement[];
  receipts: Receipt[];
  
  // Notifications
  notifications: Notification[];
  insights: Insight[];
  
  // Settings
  settings: UserSettings | null;
  
  // CRUD Operations
  addAccount: (account) => Promise<Account>;
  updateAccount: (id, data) => Promise<Account>;
  deleteAccount: (id) => Promise<void>;
  
  addTransaction: (transaction) => Promise<Transaction>;
  updateTransaction: (id, data) => Promise<Transaction>;
  deleteTransaction: (id) => Promise<void>;
  
  // ... more CRUD operations
}
```

### Provider Setup

```typescript
import { AppProvider } from '@/contexts/AppContext';

function RootLayout({ children }) {
  return (
    <SessionProvider>
      <AppProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AppProvider>
    </SessionProvider>
  );
}
```

### Using Context

```typescript
import { useApp } from '@/contexts/AppContext';

function TransactionsList() {
  const { 
    transactions, 
    accounts,
    addTransaction,
    deleteTransaction,
    isLoading 
  } = useApp();
  
  if (isLoading) return <Loading />;
  
  return (
    <div>
      {transactions.map(txn => (
        <TransactionRow 
          key={txn.id} 
          transaction={txn}
          onDelete={() => deleteTransaction(txn.id)}
        />
      ))}
    </div>
  );
}
```

## Data Loading Strategy

### Two-Phase Sync

**Phase 1 - Core Data** (immediate):
- Accounts
- Recent transactions
- Budgets
- Categories
- Notifications
- Settings

**Phase 2 - Advanced Data** (deferred):
- Parties
- Goals
- Watchlists
- Recurring transactions
- Templates
- Settlements
- Receipts

**Loading Stages**:
1. "preparing" - Initializing
2. "syncing" - Fetching data
3. "organizing" - Processing
4. "ready" - Complete

## CRUD Operations

### Pattern

All CRUD operations follow this pattern:

```typescript
async function addTransaction(data: TransactionInput) {
  try {
    // 1. Optimistic update
    setTransactions(prev => [...prev, { ...data, id: 'temp' }]);
    
    // 2. API call
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Failed');
    
    const transaction = await response.json();
    
    // 3. Update with real data
    setTransactions(prev => 
      prev.map(t => t.id === 'temp' ? transaction : t)
    );
    
    // 4. Sync related data (accounts, budgets)
    await syncAccounts();
    await syncBudgets();
    
    // 5. Success feedback
    toast.success('Transaction created!');
    
    return transaction;
    
  } catch (error) {
    // 6. Revert optimistic update
    setTransactions(prev => prev.filter(t => t.id !== 'temp'));
    
    // 7. Error feedback
    toast.error(error.message);
    throw error;
  }
}
```

### Optimistic Updates

UI updates immediately before API confirms:

**Benefits**:
- Instant feedback
- Feels faster
- Better UX

**Risks**:
- Must revert on error
- Can show temporary inconsistent state

## Performance Considerations

### useMemo for Computed Values

```typescript
const totalBalance = useMemo(() => {
  return accounts.reduce((sum, acc) => sum + acc.balance, 0);
}, [accounts]);
```

### useCallback for Stable Functions

```typescript
const handleAddTransaction = useCallback(async (data) => {
  await addTransaction(data);
}, [addTransaction]);
```

### Selective Re-renders

Context split by concern to reduce unnecessary re-renders:
- Could separate into AccountsContext, TransactionsContext, etc.
- Currently single context for simplicity

## Best Practices

### DO ✅
- Keep context updates minimal
- Use local state for component-specific data
- Memoize expensive computations
- Use optimistic updates for better UX

### DON'T ❌
- Don't put everything in context
- Don't update context on every keystroke
- Don't do heavy computation in render
- Don't forget error handling

## Alternative Approaches

### Redux
**Pros**: Predictable, debugging tools, middleware
**Cons**: Boilerplate, learning curve, overkill for this app

### Zustand
**Pros**: Simple, small bundle, good DX
**Cons**: Another dependency, not built-in

### Jotai/Recoil
**Pros**: Atomic state, granular updates
**Cons**: More complex, less common

## Migration Path

If the app grows significantly:

1. **Add caching**: localStorage for offline support
2. **Add pagination**: Reduce data size in context
3. **Split contexts**: Separate concerns (auth, data, UI)
4. **Consider Redux**: If state logic becomes complex
5. **Add Tanstack Query**: For server state management

## Related Documentation

- [Data Flow](./data-flow.md)
- [API Design](./api-design.md)
- [Component Patterns](../development/component-patterns.md)

---
