# GSAP Animation Overhaul — Design Spec

**Date:** 2026-03-26
**Scope:** Landing page optimization + in-app animation additions + Framer Motion removal

## Goals

1. Remove Framer Motion entirely, replace all usages with GSAP
2. Optimize landing page GSAP patterns (centralize registration, quickTo, matchMedia, useGSAP)
3. Add staggered entrance animations to key app components

## Part 1: Foundation

Create `lib/gsap-init.ts` — single place to register GSAP plugins. All files import gsap/ScrollTrigger from here.

## Part 2: Landing Page Optimizations

**Files:** HeroSection, OutcomeSection, PrinciplesSection, SignalsSection, WorkSection, ColophonSection, HighlightText, ScrambleText, SmoothScrollProvider, AppStageLoader

Changes per file:
- Remove local `gsap.registerPlugin(ScrollTrigger)` — import from `lib/gsap-init`
- Replace raw `useEffect` + `gsap.context()` with `useGSAP` hook from `@gsap/react`
- Wrap animations in `gsap.matchMedia()` with `"(prefers-reduced-motion: no-preference)"` condition
- SignalsSection: replace `gsap.to()` cursor tracking with `gsap.quickTo()` for x and y separately

## Part 3: Framer Motion Removal

**Files to migrate:** InsightsPanel, SaathiChat, SaathiMessageCards, menu-bar, SplitFlapText

Replace `motion.div` with regular `div` + GSAP `useGSAP` animations. Replace `AnimatePresence` with GSAP-driven enter/exit. Remove `framer-motion` import from all files. Uninstall `framer-motion` from package.json.

## Part 4: In-App Animations

All use `useGSAP` hook, `data-*` attributes for targeting, `prefers-reduced-motion` respect.

| Component | Animation | Duration | Stagger |
|-----------|-----------|----------|---------|
| Dashboard summary cards | y:16→0, autoAlpha:0→1 | 0.35s | 0.08s |
| AccountsGrid cards | y:12→0, autoAlpha:0→1 | 0.3s | 0.06s |
| ActivityFeed items | y:10→0, autoAlpha:0→1 | 0.24s | 0.02s |
| ActionItemsBanner expand | height:auto + item stagger | 0.3s | 0.03s |
| SettlementsDashboard cards | y:16→0, autoAlpha:0→1 | 0.3s | 0.1s |
| BalanceSummaryCard expand | y:8→0, autoAlpha:0→1 | 0.2s | 0.03s |
| GroupDashboardTab rows | y:8→0, autoAlpha:0→1 | 0.2s | 0.02s |
| Settlement chat cards | y:12→0, autoAlpha:0→1 | 0.3s | — |
| BudgetManagement cards | y:10→0, autoAlpha:0→1 | 0.24s | 0.03s |
| GroupSuggestionsCard rows | y:8→0, autoAlpha:0→1 | 0.2s | 0.03s |

## Easing Standard

- Section-level cards: `power3.out`
- List items: `power2.out`
- Expand/collapse: `power2.inOut`

## Accessibility

All animations wrapped in `gsap.matchMedia()` with `"(prefers-reduced-motion: no-preference)"` — animations are completely skipped for users who prefer reduced motion.
