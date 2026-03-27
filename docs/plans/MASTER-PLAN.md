# MASTER IMPLEMENTATION PLAN

> The unified plan for transforming this portfolio from good to extraordinary.
> This document ties together all three tiers with dependencies, build order,
> and agent instructions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current State](#current-state)
3. [Target State](#target-state)
4. [Complete Feature Map](#complete-feature-map)
5. [Dependency Graph](#dependency-graph)
6. [Phase-by-Phase Build Order](#phase-by-phase-build-order)
7. [New File Inventory](#new-file-inventory)
8. [Modified File Inventory](#modified-file-inventory)
9. [Package Dependencies](#package-dependencies)
10. [Architecture Decisions](#architecture-decisions)
11. [Design System Extensions](#design-system-extensions)
12. [Performance Budget](#performance-budget)
13. [Accessibility Checklist](#accessibility-checklist)
14. [Testing Strategy](#testing-strategy)
15. [Agent Instructions](#agent-instructions)

---

## Project Overview

**What:** Transform a standard Next.js portfolio into an extraordinary, immersive experience that directly demonstrates AI & Backend engineering competence.

**Who:** Shashwat Jain — AI & Backend Engineer

**Stack:** Next.js 15.5.9, React 19, Framer Motion, Tailwind CSS 4, TypeScript, MDX content, Python backend at 127.0.0.1:8000

**Branch:** `journal-2` (current working branch)

**Detailed Plans:**
- [TIER-1-PLAN.md](./TIER-1-PLAN.md) — AI Chat, Particle Hero, Public API
- [TIER-2-PLAN.md](./TIER-2-PLAN.md) — Scroll Narrative, Skill Graph, Terminal Mode
- [TIER-3-PLAN.md](./TIER-3-PLAN.md) — Magnetic Cursor, Metrics Dashboard, Generative Art, Architecture Diagrams

---

## Current State

```
CURRENT PORTFOLIO STRUCTURE:

app/
├── layout.tsx                 # Root layout with Providers
├── page.tsx                   # Home (server → HomeClient)
├── globals.css                # Tailwind + custom animations
├── api/ingest/route.ts        # Python backend proxy
├── ingest/page.tsx            # Ingest form page
├── thoughts/
│   ├── page.tsx               # Thoughts listing
│   ├── thoughts-client.tsx    # Client component
│   └── [slug]/page.tsx        # Individual thought
├── projects/
│   ├── page.tsx               # Projects archive
│   └── [slug]/page.tsx        # Project detail
├── work/
│   ├── page.tsx               # Research archive
│   └── [slug]/page.tsx        # Paper detail
├── experience/
│   └── page.tsx               # Experience archive
└── exp/[slug]/page.tsx        # Experience detail

components/
├── home-client.tsx            # HOME PAGE — 323 lines, expandable sections
├── nav-island.tsx             # NAVIGATION — 789 lines, floating nav
├── providers.tsx              # Theme + Nav context wrapper
├── experience-client.tsx      # Experience archive
├── experience-detail-client.tsx
├── projects-client.tsx        # Projects archive
├── work-client.tsx            # Work archive
├── thoughts-section.tsx       # Reusable thoughts display
├── project-section.tsx        # Reusable projects display
├── research-section.tsx       # Reusable research display
├── work-experience-section.tsx
├── ingest-form.tsx
└── ui/
    ├── command.tsx             # cmdk wrapper
    └── dialog.tsx             # Radix dialog wrapper

lib/
├── nav-context.tsx            # Nav config context + hooks
├── journal-feed.ts            # Home page data aggregation
├── project-utils.ts           # Project CRUD
├── experience-utils.ts        # Experience CRUD
├── experience-types.ts        # Experience types + formatters
├── mdx-utils.ts               # Thoughts CRUD
├── work-utils.ts              # Work/research CRUD
├── nav-utils.ts               # Server-side nav helpers
├── utils.ts                   # cn() helper
└── gsap-init.ts               # GSAP init (unused)

content/
├── experience/    (2 MDX files)
├── projects/      (3 MDX files)
├── thoughts/      (2 MDX files)
└── work/          (3 MDX files)
```

### Current Visual Identity
- Dark mode default (oklch color space)
- Lime-400 (#a3e635) accent
- Cyan-400 (#22d3ee) secondary accent
- Inter font family
- Glass-card styling with backdrop blur
- Framer Motion spring animations
- Floating NavIsland with scroll progress

---

## Target State

```
TRANSFORMED PORTFOLIO:

NEW PAGES:
  /                    → Immersive scroll narrative with particle hero
  /skills              → Interactive force-directed skill graph
  /api-playground      → Live API documentation & playground

NEW FLOATING UI:
  - AI Chat Widget (bottom-right, expandable)
  - Terminal Mode (Ctrl+`, full-screen overlay)

NEW SECTIONS ON HOME:
  - Particle flow field hero with decode animation
  - Sticky "Now" section with scroll-driven reveals
  - Horizontal-scrolling Journey timeline
  - Staggered project grid with hover previews
  - Editorial blog section
  - Bento-grid live metrics dashboard
  - Cinematic connect finale

NEW API:
  /api/v1/profile
  /api/v1/experience[/:slug]
  /api/v1/projects[/:slug]
  /api/v1/research[/:slug]
  /api/v1/thoughts[/:slug]
  /api/v1/skills
  /api/v1/stats
  /api/v1/metrics
  /api/chat

NEW EFFECTS ON ALL PAGES:
  - Magnetic cursor on interactive elements
  - Generative art section headers
  - Animated architecture diagrams on project pages
  - Split-flap text decode animations
  - Count-up number animations
```

---

## Complete Feature Map

| ID | Feature | Tier | Priority | Effort | Dependencies |
|----|---------|------|----------|--------|-------------|
| 1.1 | AI Chat Widget | 1 | Critical | Large | 1.3 (uses same data utils) |
| 1.2 | Particle Hero | 1 | Critical | Large | None |
| 1.3 | Public API + Playground | 1 | Critical | Medium | None |
| 2.1 | Scroll-Driven Narrative | 2 | High | X-Large | 1.2 (hero integration) |
| 2.2 | Force-Directed Skill Graph | 2 | High | Large | 1.3 (API data) |
| 2.3 | Terminal Mode | 2 | High | Large | 1.3 (curl command uses API) |
| 3.1 | Magnetic Cursor + Split-Flap | 3 | Medium | Small | 1.2 (hero integration) |
| 3.2 | Live Metrics Dashboard | 3 | Medium | Medium | 1.3 (API endpoints) |
| 3.3 | Generative Art Headers | 3 | Medium | Medium | 2.1 (section backgrounds) |
| 3.4 | Architecture Diagrams | 3 | Medium | Medium | None (project pages exist) |

---

## Dependency Graph

```
                    ┌──────────┐
                    │ 1.3 API  │ ◄─── Foundation: many features use this
                    └────┬─────┘
                         │
            ┌────────────┼────────────┬──────────────┐
            │            │            │              │
            ▼            ▼            ▼              ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
      │ 1.1 Chat │ │ 2.2 Graph│ │ 2.3 Term │ │ 3.2 Dash │
      └──────────┘ └──────────┘ └──────────┘ └──────────┘

      ┌──────────┐
      │ 1.2 Hero │ ◄─── Visual foundation for home page
      └────┬─────┘
           │
      ┌────┼──────────────┐
      │    │              │
      ▼    ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 2.1 Scroll│ │ 3.1 FX   │ │ 3.3 GenArt│
│ Narrative │ │ Magnetic │ │ Headers  │
└──────────┘ └──────────┘ └──────────┘
                              │
                              ▼
                        Depends on 2.1
                        (section refs)

      ┌──────────┐
      │ 3.4 Diag │ ◄─── Independent (project pages exist)
      └──────────┘
```

---

## Phase-by-Phase Build Order

### PHASE 0: Setup (30 minutes)
```
Action: Install ALL dependencies at once

npm install \
  ai @ai-sdk/react react-markdown \
  @react-three/fiber @react-three/drei three simplex-noise \
  d3-force

npm install -D @types/three @types/d3-force

Verify: npm run build should still succeed
Verify: npm run dev should still work
```

### PHASE 1A: API Foundation (Feature 1.3 — API routes only)
```
Build the REST API first — it's a dependency for Chat, Terminal, Graph, and Dashboard.

Files to create (in order):
  1. lib/api/response.ts
  2. app/api/v1/profile/route.ts
  3. app/api/v1/experience/route.ts
  4. app/api/v1/experience/[slug]/route.ts
  5. app/api/v1/projects/route.ts
  6. app/api/v1/projects/[slug]/route.ts
  7. app/api/v1/research/route.ts
  8. app/api/v1/research/[slug]/route.ts
  9. app/api/v1/thoughts/route.ts
  10. app/api/v1/thoughts/[slug]/route.ts
  11. app/api/v1/skills/route.ts
  12. app/api/v1/stats/route.ts

Test: curl http://localhost:3000/api/v1/stats
Test: curl http://localhost:3000/api/v1/projects
Test: curl http://localhost:3000/api/v1/skills

No UI changes yet. Just the API layer.
```

### PHASE 1B: Particle Hero (Feature 1.2) [parallel with 1A]
```
Can be built simultaneously with API routes (no dependency).

Files to create:
  1. lib/hooks/use-reduced-motion.ts
  2. components/hero/particle-field.tsx
  3. components/hero/hero-content.tsx
  4. components/hero/particle-hero.tsx

Files to modify:
  1. components/home-client.tsx
     - Remove gradient blob divs
     - Replace intro section with <ParticleHero>

Test: npm run dev → hero shows particles
Test: Check mobile (should fall back to simpler effect)
Test: Check prefers-reduced-motion (should skip animation)
```

### PHASE 1C: AI Chat Widget (Feature 1.1) [after Phase 1A]
```
Needs API utilities from Phase 1A.

Files to create:
  1. lib/ai/portfolio-rag.ts
  2. app/api/chat/route.ts
  3. components/chat/chat-widget.tsx
  4. components/chat/chat-messages.tsx
  5. components/chat/chat-input.tsx

Files to modify:
  1. components/providers.tsx — add <ChatWidget />

Environment setup:
  - Add OPENAI_API_KEY to .env.local
  - OR: Add a /chat endpoint to your Python backend

Test: Open chat → ask "What projects has Shashwat built?"
Test: Verify streaming works
Test: Check mobile layout
```

### PHASE 1D: API Playground (Feature 1.3 continued) [after Phase 1A]
```
Needs API routes from Phase 1A.

Files to create:
  1. app/api-playground/page.tsx
  2. components/playground/playground-client.tsx
  3. components/playground/json-viewer.tsx
  4. components/playground/endpoint-tree.tsx

Files to modify:
  1. lib/nav-context.tsx — add API page to nav

Test: Navigate to /api-playground
Test: Try each endpoint in the playground
Test: Verify JSON viewer highlights correctly
```

### PHASE 1 CHECKPOINT
```
At this point you should have:
  ✅ 12 working API endpoints
  ✅ Interactive particle hero
  ✅ AI chat widget answering questions about your portfolio
  ✅ API playground where visitors can explore your data

Run: npm run build (verify production build succeeds)
Run: Lighthouse audit (should be 90+ performance)
Commit and tag: "tier-1-complete"
```

---

### PHASE 2A: Scroll-Driven Narrative (Feature 2.1)
```
The biggest single feature. Refactors the entire home page.

Files to create:
  1. lib/hooks/use-section-scroll.ts
  2. components/scroll/scroll-narrative.tsx
  3. components/scroll/scroll-background.tsx
  4. components/scroll/sticky-now-section.tsx
  5. components/scroll/horizontal-journey.tsx
  6. components/scroll/staggered-builds.tsx
  7. components/scroll/editorial-notes.tsx
  8. components/scroll/connect-finale.tsx

Files to modify:
  1. components/home-client.tsx — MAJOR refactor
     - Replace flat section layout with ScrollNarrative wrapper
     - Each section becomes a dedicated scroll component
     - ExpandableFeedSection no longer used on home (keep for archives)
  2. components/nav-island.tsx
     - Update section detection for new scroll boundaries
     - Handle horizontal scroll section specially

Test: Full scroll through home page on desktop
Test: Full scroll on mobile (horizontal → vertical fallback)
Test: Nav island correctly tracks sections
Test: prefers-reduced-motion (instant reveals, no horizontal scroll)
```

### PHASE 2B: Force-Directed Skill Graph (Feature 2.2) [parallel with 2A]
```
Independent of scroll narrative.

Files to create:
  1. lib/skill-graph.ts
  2. components/graph/skill-graph-canvas.tsx
  3. components/graph/skill-detail-panel.tsx
  4. app/skills/page.tsx

Files to modify:
  1. lib/nav-context.tsx — add Skills to navigation

Test: Navigate to /skills
Test: Verify all skills from all content types appear
Test: Drag nodes, zoom, click for details
Test: Mobile touch interactions
```

### PHASE 2C: Terminal Mode (Feature 2.3) [parallel with 2A and 2B]
```
Independent of other Tier 2 features.

Files to create:
  1. lib/terminal/commands.ts
  2. lib/terminal/tab-complete.ts
  3. lib/terminal/ascii-art.ts
  4. components/terminal/terminal-mode.tsx
  5. components/terminal/terminal-toggle.tsx

Files to modify:
  1. components/providers.tsx — add terminal mode state
  2. components/nav-island.tsx — add terminal toggle

Test: Press Ctrl+` → terminal opens
Test: Type "help" → all commands listed
Test: Type "ls projects" → projects listed
Test: Type "curl /api/v1/stats" → real API response
Test: Type "sudo hire me" → easter egg
Test: Tab completion works
Test: Command history (up/down arrows) works
Test: "exit" closes terminal
```

### PHASE 2 CHECKPOINT
```
At this point you should have:
  ✅ Cinematic scroll-driven home page
  ✅ Horizontal-scrolling journey timeline
  ✅ Interactive skill graph on /skills
  ✅ Full terminal mode with 15+ commands

Run: npm run build
Run: Lighthouse audit
Commit and tag: "tier-2-complete"
```

---

### PHASE 3A: Magnetic Cursor + Split-Flap (Feature 3.1) [smallest, start first]
```
Quick wins that enhance existing UI.

Files to create:
  1. components/effects/magnetic-element.tsx
  2. components/effects/split-flap-text.tsx
  3. components/effects/typewriter-text.tsx

Files to modify:
  1. components/hero/hero-content.tsx — use SplitFlapText + TypewriterText
  2. components/nav-island.tsx — wrap buttons with MagneticElement
  3. components/scroll/connect-finale.tsx — TypewriterText for email

Test: Hover near social links → subtle magnetic pull
Test: Page load → name decodes character by character
Test: Tagline types itself after name
```

### PHASE 3B: Live Metrics Dashboard (Feature 3.2) [parallel with 3A]
```
Files to create:
  1. app/api/v1/metrics/route.ts
  2. components/dashboard/bento-grid.tsx
  3. components/dashboard/github-activity.tsx
  4. components/dashboard/visitor-count.tsx
  5. components/dashboard/skill-radar.tsx
  6. components/dashboard/api-health.tsx
  7. components/dashboard/tech-timeline.tsx
  8. lib/hooks/use-count-up.ts

Files to modify:
  1. components/home-client.tsx (or scroll narrative) — add dashboard section

Environment:
  - Add GITHUB_TOKEN to .env.local (optional, for higher rate limits)
  - Add GITHUB_USERNAME to .env.local

Test: Dashboard section shows on home page
Test: Numbers animate on scroll
Test: GitHub data loads (or graceful fallback)
Test: API health shows real response time
```

### PHASE 3C: Generative Art Headers (Feature 3.3) [parallel]
```
Files to create:
  1. lib/generative/noise.ts
  2. components/generative/flow-field-header.tsx
  3. components/generative/section-art.tsx

Files to modify:
  1. components/scroll/horizontal-journey.tsx — add section art
  2. components/scroll/staggered-builds.tsx — add section art
  3. components/scroll/editorial-notes.tsx — add section art

Test: Each section has a unique subtle background pattern
Test: Pattern changes when content changes
Test: Performance: no frame drops
```

### PHASE 3D: Architecture Diagrams (Feature 3.4) [parallel]
```
Files to create:
  1. lib/diagrams/project-diagrams.ts
  2. components/diagrams/architecture-diagram.tsx
  3. components/diagrams/diagram-node.tsx
  4. components/diagrams/diagram-edge.tsx

Files to modify:
  1. app/projects/[slug]/page.tsx — add diagram above content

Test: Project page shows animated diagram
Test: Diagram builds on scroll
Test: Data flow dots animate
Test: Mobile: diagram is readable
```

### PHASE 3 CHECKPOINT / FINAL
```
At this point you should have:
  ✅ Magnetic cursor on interactive elements
  ✅ Split-flap name decode on hero
  ✅ Typewriter effect on tagline
  ✅ Bento grid dashboard with live metrics
  ✅ Generative art section backgrounds
  ✅ Animated architecture diagrams

Run: npm run build (MUST succeed)
Run: Lighthouse audit (target: 85+ performance, 95+ accessibility)
Run: Test on mobile devices (iOS Safari, Android Chrome)
Run: Test prefers-reduced-motion
Commit and tag: "tier-3-complete"
```

---

## New File Inventory

### Total new files: ~58

```
lib/
├── api/
│   └── response.ts                    # API response helpers
├── ai/
│   └── portfolio-rag.ts               # RAG content aggregator
├── hooks/
│   ├── use-reduced-motion.ts          # Accessibility hook
│   ├── use-section-scroll.ts          # Scroll progress per section
│   └── use-count-up.ts               # Number animation hook
├── skill-graph.ts                     # Graph data builder
├── terminal/
│   ├── commands.ts                    # Terminal command registry
│   ├── tab-complete.ts                # Tab completion engine
│   └── ascii-art.ts                   # ASCII art generators
├── generative/
│   └── noise.ts                       # Seeded noise utilities
└── diagrams/
    └── project-diagrams.ts            # Diagram definitions

components/
├── hero/
│   ├── particle-hero.tsx              # Hero wrapper
│   ├── particle-field.tsx             # Three.js particles
│   └── hero-content.tsx               # Hero text overlay
├── chat/
│   ├── chat-widget.tsx                # Floating chat UI
│   ├── chat-messages.tsx              # Message display
│   └── chat-input.tsx                 # Chat input
├── scroll/
│   ├── scroll-narrative.tsx           # Scroll orchestrator
│   ├── scroll-background.tsx          # Animated background
│   ├── sticky-now-section.tsx         # Sticky "Now"
│   ├── horizontal-journey.tsx         # Horizontal timeline
│   ├── staggered-builds.tsx           # Project grid
│   ├── editorial-notes.tsx            # Blog section
│   └── connect-finale.tsx             # Final CTA
├── graph/
│   ├── skill-graph-canvas.tsx         # Canvas graph renderer
│   └── skill-detail-panel.tsx         # Info panel
├── terminal/
│   ├── terminal-mode.tsx              # Full terminal UI
│   └── terminal-toggle.tsx            # Toggle button
├── playground/
│   ├── playground-client.tsx          # API explorer
│   ├── json-viewer.tsx                # JSON display
│   └── endpoint-tree.tsx              # Sidebar nav
├── effects/
│   ├── magnetic-element.tsx           # Magnetic hover
│   ├── split-flap-text.tsx            # Decode animation
│   └── typewriter-text.tsx            # Typewriter effect
├── dashboard/
│   ├── bento-grid.tsx                 # Grid layout
│   ├── github-activity.tsx            # GitHub stats
│   ├── visitor-count.tsx              # Visitor counter
│   ├── skill-radar.tsx                # Radar chart
│   ├── api-health.tsx                 # API status
│   └── tech-timeline.tsx              # Tech adoption timeline
├── generative/
│   ├── flow-field-header.tsx          # Canvas art
│   └── section-art.tsx                # Smart wrapper
└── diagrams/
    ├── architecture-diagram.tsx        # SVG diagram
    ├── diagram-node.tsx               # Node component
    └── diagram-edge.tsx               # Edge component

app/
├── api/
│   ├── chat/route.ts                  # Chat endpoint
│   └── v1/
│       ├── profile/route.ts
│       ├── experience/route.ts
│       ├── experience/[slug]/route.ts
│       ├── projects/route.ts
│       ├── projects/[slug]/route.ts
│       ├── research/route.ts
│       ├── research/[slug]/route.ts
│       ├── thoughts/route.ts
│       ├── thoughts/[slug]/route.ts
│       ├── skills/route.ts
│       ├── stats/route.ts
│       └── metrics/route.ts
├── api-playground/page.tsx
└── skills/page.tsx
```

## Modified File Inventory

```
MODIFIED FILES (across all tiers):

components/home-client.tsx        # MAJOR: refactored to use scroll narrative
components/providers.tsx          # Add ChatWidget + Terminal mode
components/nav-island.tsx         # Update section detection, add terminal toggle,
                                  # magnetic elements
lib/nav-context.tsx               # Add Skills + API pages to nav
app/projects/[slug]/page.tsx      # Add architecture diagrams
package.json                      # New dependencies
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "ai": "^4.x",                     // AI SDK core (Tier 1 - Chat)
    "@ai-sdk/react": "^1.x",          // React hooks for AI (Tier 1 - Chat)
    "@ai-sdk/openai": "^1.x",         // OpenAI provider (Tier 1 - Chat)
    "react-markdown": "^9.x",         // Markdown in chat (Tier 1 - Chat)
    "@react-three/fiber": "^9.x",     // React Three.js (Tier 1 - Hero)
    "@react-three/drei": "^10.x",     // Three.js helpers (Tier 1 - Hero)
    "three": "^0.170.x",              // Three.js core (Tier 1 - Hero)
    "simplex-noise": "^4.x",          // Noise generation (Tier 1 - Hero, Tier 3 - Art)
    "d3-force": "^3.x"                // Force simulation (Tier 2 - Graph)
  },
  "devDependencies": {
    "@types/three": "^0.170.x",       // Three.js types
    "@types/d3-force": "^3.x"         // D3 force types
  }
}
```

**Bundle impact estimate:**
- three.js: ~150KB gzipped (lazy-loaded, only on home page)
- @react-three/fiber + drei: ~50KB gzipped (lazy-loaded with three)
- ai SDK: ~30KB gzipped
- d3-force: ~15KB gzipped (only on /skills page)
- simplex-noise: ~5KB gzipped
- react-markdown: ~15KB gzipped
- **Total potential impact: ~265KB** (but lazy-loaded per route, so no single page loads all)

---

## Architecture Decisions

### 1. Three.js via React Three Fiber (not raw Three.js)
**Why:** Integrates with React lifecycle, enables Suspense for lazy loading, cleaner component model. Your project is React-based so R3F is the natural fit.

### 2. Canvas 2D for Skill Graph (not Three.js or SVG)
**Why:** 2D graph doesn't need 3D. Canvas 2D gives best performance for 100+ nodes with real-time physics. SVG would struggle with that many animated elements.

### 3. SVG for Architecture Diagrams (not Canvas)
**Why:** Diagrams have fewer elements (5-15 nodes), need text rendering, and benefit from SVG's built-in animation (stroke-dashoffset, animateMotion). Accessibility is also better with SVG.

### 4. AI SDK for Chat (not raw fetch to Python backend)
**Why:** Streaming support, useChat hook, standardized message format. BUT the AI model could also be proxied through your Python backend if you want to showcase your own infra — this is configurable.

### 5. No Additional Animation Library
**Why:** Framer Motion already handles 90% of needs. CSS animations handle the rest. Adding GSAP would increase bundle size for marginal benefit. Your existing Framer Motion setup is sufficient for scroll-driven animations.

### 6. Data-Driven Generative Art (not random)
**Why:** Tying the art to your actual portfolio data makes it meaningful, not decorative. It also means the art evolves as you add content — a living portfolio.

### 7. Terminal as Overlay (not separate page)
**Why:** The terminal should be accessible from anywhere via keyboard shortcut. An overlay with full-screen takeover is more impactful than a page you navigate to.

---

## Design System Extensions

### New CSS Variables (add to globals.css)
```css
/* Terminal colors */
--terminal-bg: oklch(0.08 0 0);
--terminal-text: oklch(0.75 0.15 130);     /* lime-ish */
--terminal-prompt: oklch(0.65 0.15 150);    /* green-ish */
--terminal-error: oklch(0.65 0.2 25);       /* red-ish */
--terminal-success: oklch(0.7 0.15 160);    /* emerald-ish */

/* Graph colors */
--graph-skill: oklch(0.75 0.15 130);        /* lime-400 */
--graph-project: oklch(0.7 0.15 195);       /* cyan-400 */
--graph-research: oklch(0.7 0.15 85);       /* amber-400 */
--graph-experience: oklch(0.7 0.15 300);    /* violet-400 */

/* Dashboard colors */
--dash-positive: oklch(0.7 0.15 160);       /* green */
--dash-neutral: oklch(0.6 0.05 250);        /* blue-gray */
--dash-warning: oklch(0.7 0.15 85);         /* amber */
```

### New Animation Keyframes (add to globals.css)
```css
@keyframes decode {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes flow-dot {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}

@keyframes count-up {
  from { --num: 0; }
}

@keyframes grain {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -10%); }
  30% { transform: translate(3%, -15%); }
  50% { transform: translate(12%, 9%); }
  70% { transform: translate(9%, 4%); }
  90% { transform: translate(-1%, 7%); }
}
```

### New Utility Classes
```css
.terminal-font { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
.grain-overlay {
  background-image: url("data:image/svg+xml,..."); /* noise texture */
  opacity: 0.03;
  mix-blend-mode: overlay;
}
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

---

## Performance Budget

| Metric | Target | Current (est.) |
|--------|--------|----------------|
| LCP (Largest Contentful Paint) | < 2.5s | ~1.8s |
| FID (First Input Delay) | < 100ms | ~50ms |
| CLS (Cumulative Layout Shift) | < 0.1 | ~0.02 |
| Total JS bundle (initial) | < 200KB | ~120KB |
| Three.js chunk (lazy) | < 200KB | N/A |
| FPS during animations | > 55fps | 60fps |
| TTI (Time to Interactive) | < 3.5s | ~2.5s |

### Lazy Loading Strategy
```
Route: /           → Loads: core + particle hero (lazy) + chat widget (lazy)
Route: /skills     → Loads: core + d3-force (lazy) + canvas graph
Route: /api-playground → Loads: core + playground components
Route: /projects/* → Loads: core + SVG diagram components
Terminal mode      → Loads: terminal components on Ctrl+` only
```

---

## Accessibility Checklist

Every feature MUST respect these:

- [ ] `prefers-reduced-motion`: All animations have instant/no-motion fallback
- [ ] Keyboard navigation: All interactive elements are focusable and operable
- [ ] Screen reader: All visual-only content has text alternatives
- [ ] Color contrast: WCAG AA minimum (4.5:1 for text, 3:1 for UI)
- [ ] Terminal mode: Full keyboard operation, announces output to screen readers
- [ ] Chat widget: Focus trap when open, Escape to close
- [ ] Particle hero: aria-hidden (decorative), hero text is real DOM text
- [ ] Skill graph: Accessible text alternative (skill list) available
- [ ] Architecture diagrams: alt text describing the system architecture

---

## Testing Strategy

### Manual Testing Checklist (per phase)
```
□ Desktop Chrome (latest)
□ Desktop Firefox (latest)
□ Desktop Safari (latest)
□ Mobile iOS Safari
□ Mobile Android Chrome
□ Tablet iPad
□ prefers-reduced-motion enabled
□ Screen reader (VoiceOver)
□ Keyboard-only navigation
□ Slow network (3G throttled)
□ Low-power device simulation (CPU 4x throttle)
```

### Automated
```
□ npm run build — succeeds without errors
□ npm run lint — no errors
□ TypeScript — no type errors
□ Lighthouse CI — scores meet budget
```

---

## Agent Instructions

### For Agents Implementing These Features

When you are an agent working on any of these features, follow these rules:

1. **Read the specific tier plan first.** This master plan gives the overview. The tier plans (TIER-1-PLAN.md, TIER-2-PLAN.md, TIER-3-PLAN.md) have the detailed implementation specs.

2. **Check the dependency graph.** Don't start a feature that depends on an incomplete feature.

3. **Match the existing design system.** Use:
   - oklch colors from globals.css
   - Existing utility classes (glass-card, gradient-text, etc.)
   - Framer Motion for animations (already in project)
   - Tailwind CSS classes consistent with existing components
   - lucide-react for icons

4. **Keep these consistent across all features:**
   - Spring animations: stiffness 180-260, damping 24-28 (matches NavIsland)
   - Accent color: lime-400 (#a3e635) for active/highlight states
   - Card style: glass-card with backdrop-blur-sm, border-border/50
   - Text hierarchy: text-5xl+ for display, text-lg for body, text-xs uppercase for labels
   - Spacing: generous vertical spacing (py-16 to py-24 between sections)

5. **Always handle:**
   - prefers-reduced-motion
   - Mobile responsive
   - Loading states
   - Error states
   - Empty states

6. **File naming conventions:**
   - Components: kebab-case.tsx (e.g., chat-widget.tsx)
   - Utilities: kebab-case.ts (e.g., skill-graph.ts)
   - API routes: route.ts inside appropriate directory

7. **Import conventions:**
   - Use `@/` path alias for all imports
   - Group: React → external libs → internal components → internal utils → types

8. **Test after each file.** Don't write 5 files before checking if the first one works.

9. **Don't modify files outside the plan.** If you need to change something not listed, check with the user first.

10. **Commit after each phase completion.** Tag with phase name.

---

## Quick Reference: What Goes Where

| "I need to..." | Look at... |
|----------------|-----------|
| Add a new API endpoint | `lib/api/response.ts` for helpers, `app/api/v1/` for routes |
| Add a new component | Appropriate subdirectory in `components/` |
| Add a new page | `app/` directory |
| Add a utility function | `lib/` directory |
| Add a hook | `lib/hooks/` directory |
| Change navigation | `lib/nav-context.tsx` |
| Change the home page layout | `components/scroll/` (Tier 2+) or `components/home-client.tsx` |
| Change global styles | `app/globals.css` |
| Add a terminal command | `lib/terminal/commands.ts` |
| Add a diagram for a project | `lib/diagrams/project-diagrams.ts` |
| Change the particle effect | `components/hero/particle-field.tsx` |
