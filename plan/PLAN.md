# Saathi v2: Full CRUD Tooling + Premium UX + Runtime Optimization Plan

## Summary
We will deliver Saathi in two milestones so quality stays high and risk stays low.
Milestone 1 will ship full CRUD tool coverage for core financial domains (accounts, transactions, categories, parties, templates, budgets), a redesigned `/dashboard` Saathi workspace with a right-docked shared-cards panel, GSAP-based motion, strict two-step delete confirmations, and targeted state/cache synchronization.
Milestone 2 will extend the same tool framework to the remaining platform domains (goals, watchlists, recurring, notifications, receipts, settlements, settings) without redesigning architecture again.

## Locked Product Decisions
1. CRUD rollout: Core financial first, then remaining modules.
2. Delete safety: Two-step confirmation required before destructive execution.
3. Cards panel UX: Persistent right dock with search/filter + jump-to-message.
4. Visual style: Minimal glass + motion.
5. Surface scope: Full redesign for `/dashboard` workspace first; floating widget gets only light alignment updates.

## Implementation Plan

### 1) Expand Saathi Tool System to True CRUD (Core Domains First)
- Update `/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/schema.ts` to add core CRUD tool names:
`view_accounts`, `create_account`, `update_account`, `delete_account`, `view_categories`, `create_category`, `update_category`, `delete_category`, `view_parties`, `create_party`, `update_party`, `delete_party`, `view_templates`, `create_template`, `update_template`, `delete_template`, `view_transactions`, `create_transaction`, `update_transaction`, `delete_transaction`, `view_budgets`, `create_budget`, `update_budget`, `delete_budget`, `view_budget_snapshot`.
- Keep existing tool names backward-compatible in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/providers.ts` alias normalization.
- Add delete confirmation support by requiring `input.confirm === true` for every `delete_*` tool execution path in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/chat/route.ts`.
- Extend tool execution switch in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/chat/route.ts` to wire missing update/delete/view tools via existing API handlers already present in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/**/route.ts`.

### 2) Add Saathi Confirmation Card Type for Safe Destructive Actions
- Add a new `confirm` card schema in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/schema.ts` with fields: `title`, `body`, `riskLevel`, `preview`, `confirmToolRequests`, `cancelSuggestedPrompt`.
- Update card catalog prompt in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/cards.ts` to instruct model to output `confirm` cards for destructive intents.
- Render confirm cards in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiMessageCards.tsx` with explicit `Confirm` and `Cancel` actions; `Confirm` sends `toolRequests` directly.

### 3) Redesign Saathi Workspace UX (Exceptional, Minimal, Easy to Manage)
- Refactor `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiWorkspace.tsx` into a 3-zone workspace:
Conversation lane, composer lane, and right card dock.
- Add new `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiCardDock.tsx`:
aggregates all assistant `metadata.cards` from loaded history, supports search/filter by type/status/entity/date, and jump-to-source-message.
- Improve interactive cards in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiMessageCards.tsx`:
clear hierarchy, status-first headers, tighter spacing, inline validation, stronger action affordances, explicit success/error state transitions.
- Keep `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiChat.tsx` functional with minor style parity only (workspace-first scope).

### 4) Add GSAP Motion System (Performance-Safe)
- Add `@gsap/react` and standardize animation lifecycle cleanup using `useGSAP`/`gsap.context`.
- Animate in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiWorkspace.tsx` and `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiCardDock.tsx`:
message enter stagger, card dock reveal, filter transition, expanded card transitions.
- Add reduced-motion fallback and keep animation properties to `transform`/`opacity` only.

### 5) Fix LLM/DB Efficiency in Chat Pipeline
- Refactor `/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/chat/route.ts` context loading:
split into lightweight analysis context and tool-execution context; fetch only slices required by pending tools.
- Skip `getSaathiCoreKnowledge()` and full context hydration when request is tool-only (`toolRequests.length > 0`) and no generation is needed.
- Avoid unconditional `chatContext` invalidation after every chat message; only invalidate `chatContext` when mutating tools executed.
- Optimize history reads:
if client provides sufficiently recent conversation payload, reduce/skip DB recent-message fetch.
- Add in-memory TTL memoization for core knowledge file reads in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/core-knowledge.ts`.

### 6) Make Cache and App State Consistent After Saathi Mutations
- Add mutation summary to assistant metadata in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/schema.ts` and `/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/chat/route.ts` (affected entity + scope list).
- Emit `window` custom event from `/Users/shashwatjain/Desktop/coding_stuff/new-journal/components/chat/SaathiWorkspace.tsx` on successful tool executions.
- Add listener in `/Users/shashwatjain/Desktop/coding_stuff/new-journal/contexts/AppContext.tsx` to perform targeted refetch of affected slices only (accounts, transactions, budgets, categories, parties, templates).
- Add missing `USER_CACHE_SCOPES.chatContext` invalidations in mutating routes that feed Saathi context:
`/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/categories/route.ts`,
`/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/parties/route.ts`,
`/Users/shashwatjain/Desktop/coding_stuff/new-journal/app/api/templates/route.ts`.

### 7) Prompt and Tooling Quality Hardening
- Update `/Users/shashwatjain/Desktop/coding_stuff/new-journal/lib/saathi/tools.ts` with strict CRUD behavior rules:
always prefer exact-id operations when available, never auto-delete without confirmation card, and keep batch operations bounded.
- Update `/Users/shashwatjain/Desktop/coding_stuff/new-journal/docs/api/chat.md` with new tool list, new card type, and metadata mutation payload.
- Update `/Users/shashwatjain/Desktop/coding_stuff/new-journal/docs/saathi/CORE_KNOWLEDGE.md` to include delete-confirmation workflow and card dock behavior.

## Public API / Interface / Type Changes
1. `SaathiToolNameSchema` expands to include core CRUD families listed above.
2. `SaathiCardSchema` adds `confirm` variant for destructive confirmation flows.
3. `SaathiEntityCardSchema.status` adds `deleted` state.
4. `SaathiAssistantMetadataSchema` adds mutation payload (`mutations`) for client sync.
5. `/api/chat` response metadata remains backward compatible; `uiVersion` becomes `"v2"` while parser accepts `"v1"` and `"v2"`.

## Test Cases and Scenarios

### Functional
1. Create/update/delete for each core domain via Saathi text prompts.
2. Delete requests always produce confirm card first; no delete occurs without explicit confirm action.
3. Confirm and cancel flows from confirm cards behave correctly.
4. Card dock shows all cards from session history, filters correctly, and jumps to source message.
5. Draft interactive card edits execute correct tool requests and return updated cards.

### Consistency and Cache
1. After Saathi creates/updates/deletes data, corresponding AppContext slices refresh without page reload.
2. Server cache tags for affected scopes are invalidated correctly.
3. Non-mutating chat queries do not invalidate `chatContext`.

### Performance
1. Tool-only requests skip LLM prompt generation path and avoid unnecessary full context DB fan-out.
2. Non-mutating chat requests reduce average DB query count versus current baseline.
3. Motion remains smooth with no layout-thrashing; reduced-motion users receive non-animated transitions.

### Regression
1. Existing `create_*` and `update_*` prompts still work with old aliases.
2. `/dashboard` workspace and floating chat both remain operational.
3. `npm run lint` and `npm run build` pass.

## Milestone Breakdown
1. Milestone 1: Core CRUD tools + confirmation cards + workspace redesign + GSAP motion + sync/cache fixes + docs. ✅ COMPLETE
2. Milestone 2: Extend same framework to goals, watchlists, recurring, notifications, settlements, settings; add corresponding card editors and confirmations. ✅ COMPLETE
   - Note: `receipts` has no CRUD API route; receipt handling remains attachment-only (image extraction at prompt time).

## Assumptions and Defaults
1. Workspace redesign is the primary UX target in this cycle; floating widget is not removed.
2. Delete actions are never single-step.
3. Core CRUD milestone is prioritized over all-modules-at-once.
4. Event-driven targeted refresh is preferred over full `/api/sync` reload after every Saathi action.
5. Existing Next.js cache tag system remains the canonical server cache mechanism.

## External Design/Engineering References Used
- [OpenAI ChatKit UI Guidelines](https://openai.github.io/chatkit-js/guides/UI_GUIDELINES.html)
- [OpenAI ChatKit Starter App](https://openai.github.io/chatkit-js/)
- [Vercel AI Elements announcement](https://vercel.com/changelog/introducing-ai-elements)
- [Vercel AI Voice Elements (Jan 14, 2026)](https://vercel.com/changelog/ai-voice-elements)
- [Anthropic Artifacts Help (dedicated sidebar + right panel model)](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- [GSAP `gsap.context()` docs](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/)
- [@gsap/react guidance](https://github.com/greensock/react)
- [Google Gemini Context Caching docs](https://ai.google.dev/gemini-api/docs/caching)
- [Next.js `revalidateTag` (Last updated Feb 11, 2026)](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
