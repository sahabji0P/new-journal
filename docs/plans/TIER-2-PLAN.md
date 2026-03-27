# TIER 2: Elevate Existing Pages

> These features transform your existing content from "informational" to "unforgettable."
> They upgrade the sections you already have into immersive experiences.

---

## Feature 2.1: Scroll-Driven Narrative

### Concept
Transform the home page from a vertical stack of card sections into a cinematic, scroll-driven story. Sections morph into each other. The background evolves. Content reveals itself through scroll position. The "Journey" section scrolls horizontally. Sticky sections hold while content cycles inside. It feels like watching a film about your career, not reading a resume.

### Architecture

```
HOME PAGE SCROLL NARRATIVE
══════════════════════════

Scroll Position 0% ──────── Hero (ParticleHero from Tier 1)
                            - Particles visible
                            - Full viewport

Scroll Position 10% ─────── Transition Zone
                            - Particles fade to 30% opacity
                            - Background color shifts subtly
                            - "Now" section slides up

Scroll Position 15-30% ──── "Now" Section (Sticky)
                            - Section sticks to viewport
                            - Content inside transitions:
                              → Current role appears
                              → Tags animate in as floating pills
                              → Period text types itself
                            - Background: subtle gradient shift

Scroll Position 30-35% ──── Transition Zone
                            - "Now" unsticks and scrolls away
                            - Horizontal scroll container enters

Scroll Position 35-65% ──── "Journey" Section (Horizontal Scroll)
                            - Container sticks to viewport
                            - Content scrolls LEFT as user scrolls DOWN
                            - Each experience card slides in from right
                            - Timeline line draws itself progressively
                            - Cards have parallax depth (closer = faster)

Scroll Position 65-70% ──── Transition Zone
                            - Horizontal scroll container exits
                            - Grid section fades in

Scroll Position 70-85% ──── "Builds" Section (Staggered Grid)
                            - Projects appear in a masonry-like grid
                            - Each card reveals on scroll with different
                              timing (stagger based on position)
                            - Hover: card lifts and shows project preview
                            - Tech tags float and settle into position

Scroll Position 85-95% ──── "Notes" Section (Editorial)
                            - Blog posts appear as editorial-style cards
                            - Large featured post at top
                            - Smaller posts below in 2-column layout
                            - Text reveals line-by-line on scroll

Scroll Position 95-100% ─── "Connect" Section (Final)
                            - CTA appears with emphasis animation
                            - Social links fan out from center
                            - Email address types itself
                            - Particles from hero reappear faintly
```

### Files to Create

#### 1. `components/scroll/scroll-narrative.tsx` — Master orchestrator
```
Purpose: Wraps the home page content and manages scroll-driven state.

Implementation:
  - Uses Framer Motion's useScroll() to track scroll progress
  - Provides scroll context to child sections
  - Manages section transitions and background states

State:
  - scrollProgress: MotionValue<number> (0 to 1)
  - activeSection: string (which section is in "active" zone)
  - backgroundState: { color, particleOpacity, gradientAngle }

Structure:
  <ScrollNarrative>
    ├── <ScrollBackground />      // Animated background layer
    ├── <ParticleHero />          // From Tier 1 (opacity tied to scroll)
    ├── <StickyNowSection />      // Sticky "Now" with scroll-driven content
    ├── <HorizontalJourney />     // Horizontal-scrolling timeline
    ├── <StaggeredBuilds />       // Grid with scroll-triggered reveals
    ├── <EditorialNotes />        // Blog section with line reveals
    └── <ConnectFinale />         // Final CTA section
  </ScrollNarrative>
```

#### 2. `components/scroll/scroll-background.tsx` — Animated background
```
Purpose: Background layer that transitions through the scroll narrative.

Implementation:
  - Full viewport fixed background (position: fixed, inset: 0, z-index: -1)
  - Uses CSS custom properties animated via Framer Motion
  - Background transitions:
    - Hero zone: transparent (particles show through)
    - Now zone: very subtle dark gradient (bg-[#0a0a0c])
    - Journey zone: slightly warmer dark (bg-[#0d0c0a])
    - Builds zone: back to cool dark (bg-[#0a0c0d])
    - Connect zone: darkest (bg-[#080808])
  - Subtle grain texture overlay (CSS noise filter)
  - Transition speed: smooth 0.5s CSS transitions
```

#### 3. `components/scroll/sticky-now-section.tsx` — Sticky "Now"
```
Purpose: The "Now" section uses sticky positioning with scroll-driven reveals.

Implementation:
  - Container: height: 300vh (3 screens of scroll distance)
  - Inner content: position: sticky, top: 0, height: 100vh
  - Content phases (mapped to scroll within this section):
    Phase 1 (0-33%): Title and role animate in
    Phase 2 (33-66%): Tags float in from edges and settle
    Phase 3 (66-100%): Description text reveals line-by-line

  - Uses useScroll({ target: sectionRef, offset: ["start start", "end end"] })
  - Each phase maps scroll progress to opacity + transform

Content animations:
  - Role title: slides up from 20px below, opacity 0→1
  - Company name: slides in from left, 100ms delay
  - Tags: Each tag floats in from a random direction, spring physics
  - Description: mask-image reveal (gradient mask slides down line by line)
```

#### 4. `components/scroll/horizontal-journey.tsx` — Horizontal timeline
```
Purpose: The Journey/Experience section scrolls horizontally as user scrolls vertically.

Implementation:
  - Outer container: height = (number of cards * 100vh)
    e.g., 4 experiences = 400vh
  - Inner container: position: sticky, top: 0, height: 100vh, overflow: hidden
  - Content track: display: flex, transform: translateX(scrollProgress * -totalWidth)

  Scroll-to-horizontal mapping:
    const { scrollYProgress } = useScroll({ target: containerRef })
    const x = useTransform(scrollYProgress, [0, 1], [0, -totalWidth])

  Each experience card:
    - Width: 80vw (desktop), 90vw (mobile)
    - Margin between cards: 5vw
    - Content: company, role, duration, highlights, skills
    - Card style: glass-card with left accent border (color-coded by type)
    - Parallax: foreground text moves faster than background elements

  Timeline element:
    - Horizontal line at center of viewport
    - Progress fills from left as user scrolls
    - Dots at each card position
    - Active dot pulses (lime-400)
    - Uses SVG path with dasharray animation

  Entry/exit animations:
    - Cards: slight rotation (1-2deg) that straightens as they enter center
    - Scale: 0.95 → 1.0 as card enters center
    - Opacity: 0.6 → 1.0 in center, 0.6 as it exits

Mobile behavior:
    - Falls back to vertical scroll with staggered reveal
    - No horizontal scroll (too awkward on touch)
    - Cards stack vertically with timeline on the left
```

#### 5. `components/scroll/staggered-builds.tsx` — Project grid
```
Purpose: Projects reveal in a staggered masonry-like grid on scroll.

Implementation:
  - Grid layout: 2 columns on desktop, 1 on mobile
  - Each card uses IntersectionObserver for reveal trigger
  - Reveal animation: different per position
    - Top-left: slide from left + fade
    - Top-right: slide from right + fade
    - Bottom items: slide up + fade
    - Stagger: 150ms between cards

  Card design (upgraded from current):
    - Glass card base
    - On hover: lift (y: -8px) + show project screenshot/preview
    - Tech stack: pills that have subtle float animation
    - Category badge: top-right corner
    - Links: appear on hover (live, github, details)
    - Featured projects get larger cards (spans 2 columns)

  Background element:
    - Subtle grid pattern (CSS grid lines at 10% opacity)
    - Grid lines animate (draw themselves) as section enters
```

#### 6. `components/scroll/editorial-notes.tsx` — Blog section
```
Purpose: Blog posts displayed in an editorial magazine style.

Implementation:
  Layout:
    - First post: full-width "featured" card with large title, excerpt, image
    - Remaining posts: 2-column grid below
    - Each card has: title, excerpt, date, category, read time

  Scroll animations:
    - Featured post: text reveals line-by-line using mask-image
    - Grid posts: stagger up from bottom, 100ms per card
    - Category labels: slide in from left

  Typography:
    - Featured post title: text-4xl font-light (editorial feel)
    - Excerpt: text-lg text-muted-foreground
    - Serif-style feel achieved through letter-spacing and line-height

  Interaction:
    - Hover on featured: subtle parallax within card (image shifts)
    - Hover on grid items: underline animation on title
```

#### 7. `components/scroll/connect-finale.tsx` — Final section
```
Purpose: Ending section with emphasis and callback to hero.

Implementation:
  - Large CTA text: "Let's build something" with gradient text effect
  - Email address types itself on scroll enter
  - Social links fan out from center point (circular layout)
  - Subtle particle effect returns (callback to hero, lower density)
  - "Made with Next.js + too much coffee" footer text

  Animation sequence (triggered on section enter):
    1. CTA text fades in and scales from 0.9 to 1.0 (300ms)
    2. Email types character by character (500ms)
    3. Social links appear from center, moving to final positions (400ms, stagger 100ms)
    4. Footer text fades in (200ms)
```

#### 8. `lib/hooks/use-section-scroll.ts` — Reusable scroll hook
```
Purpose: Provides scroll progress within a specific section.

Usage:
  const { progress, isInView } = useSectionScroll(sectionRef, {
    offset: ["start end", "end start"],  // when to start/stop tracking
    clamp: true                           // keep progress between 0-1
  })

Returns:
  - progress: MotionValue<number> (0 at section top, 1 at section bottom)
  - isInView: boolean (section is visible at all)
  - phase: number (for multi-phase sections, which phase is active)
```

### Files to Modify

#### `components/home-client.tsx` — Major refactor
```
Changes:
  This is the biggest change in Tier 2. The home-client.tsx file gets refactored:

  BEFORE (current):
    <main>
      <Intro section />
      <Now section />
      <Journey section (expandable cards) />
      <Builds section (expandable cards) />
      <Notes section (expandable cards) />
      <Connect section />
    </main>

  AFTER:
    <ScrollNarrative data={data}>
      <ParticleHero>
        <HeroContent ... />    // From Tier 1
      </ParticleHero>
      <StickyNowSection now={data.now} />
      <HorizontalJourney journey={data.journey} />
      <StaggeredBuilds builds={data.builds} />
      <EditorialNotes notes={data.notes} />
      <ConnectFinale />
    </ScrollNarrative>

  The ExpandableFeedSection component is no longer used on home page
  (but kept for potential use on archive pages)

  Data flow stays the same — data comes from getHomeJournalData()
```

#### `components/nav-island.tsx`
```
Changes:
  - Update section detection to work with new scroll narrative
  - Home sections now have different scroll boundaries
  - The horizontal scroll section needs special handling for active detection
  - Progress bar should reflect overall page progress
```

### Performance Considerations
```
- Use CSS will-change sparingly (only on actively animating elements)
- Horizontal scroll uses CSS transforms (GPU-accelerated), not left/margin
- IntersectionObserver for reveal triggers (not scroll listeners)
- Framer Motion's useScroll is optimized (uses rAF internally)
- Sticky sections use native CSS position: sticky (no JS)
- Grain texture overlay uses CSS only (no canvas)
- Mobile: reduce animation complexity, no horizontal scroll
- prefers-reduced-motion: all scroll animations become instant reveals
```

---

## Feature 2.2: Force-Directed Skill/Project Graph

### Concept
An interactive node graph visualization where skills are nodes, projects are connections, and the graph layout is computed by physics simulation. Visitors can drag nodes, zoom, and click to explore your expertise as a spatial map rather than a flat list.

### Architecture

```
┌───────────────────────────────────────────────────────┐
│  Skill Graph Page (app/skills/page.tsx)                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  <SkillGraphCanvas>                               │ │
│  │                                                   │ │
│  │   ┌─────┐         ┌──────┐         ┌─────────┐  │ │
│  │   │React├─────────┤Neural├─────────┤ PyTorch  │  │ │
│  │   │ (M) │         │Canvas│         │   (XL)   │  │ │
│  │   └──┬──┘         │(proj)│         └────┬─────┘  │ │
│  │      │            └──────┘              │        │ │
│  │      │                                  │        │ │
│  │   ┌──▼──┐     ┌───────┐          ┌─────▼────┐  │ │
│  │   │Next │     │FastAPI│──────────┤ Python   │  │ │
│  │   │.js  │     │ (L)   │          │  (XXL)   │  │ │
│  │   │ (L) │     └───┬───┘          └──────────┘  │ │
│  │   └─────┘         │                             │ │
│  │                    │                             │ │
│  │              ┌─────▼─────┐                      │ │
│  │              │QuantumAna │                      │ │
│  │              │  (project)│                      │ │
│  │              └───────────┘                      │ │
│  │                                                   │ │
│  │  Node sizes = depth of expertise (frequency)     │ │
│  │  Connections = shared between projects            │ │
│  │  Colors: lime (skills), cyan (projects),          │ │
│  │          amber (research)                         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  <SkillDetailPanel>  (shown on node click)        │ │
│  │  Skill: "Python"                                  │ │
│  │  Used in: 3 projects, 2 roles, 1 paper            │ │
│  │  Related: PyTorch, FastAPI, TensorFlow             │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

### Files to Create

#### 1. `lib/skill-graph.ts` — Data preparation
```
Purpose: Aggregates skills from all content and builds graph data structure.

Types:
  interface GraphNode {
    id: string
    label: string
    type: "skill" | "project" | "research" | "experience"
    size: number        // computed from frequency
    color: string       // based on type
    metadata: {
      count: number     // how many times this skill appears
      categories: string[]
      usedIn: { type: string, name: string, slug: string }[]
    }
  }

  interface GraphEdge {
    source: string      // node id
    target: string      // node id
    weight: number      // strength of connection
    sharedIn: string[]  // project/role names where both appear
  }

  interface SkillGraphData {
    nodes: GraphNode[]
    edges: GraphEdge[]
  }

Functions:
  - buildSkillGraph(): SkillGraphData
    1. Collect all skills from:
       - Experience: skills[] array from each role
       - Projects: tech[] array from each project
       - Research: tags[] array from each paper
    2. Create skill nodes:
       - id: lowercase skill name
       - size: log(frequency) * 10 (scaled 10-60px)
       - color: lime-400 for skills, cyan-400 for projects, amber-400 for research
    3. Create project/research/experience nodes:
       - One node per project, one per role, one per paper
       - Size: fixed 40px (medium)
    4. Create edges:
       - Skill ↔ Project: if skill is in project's tech array
       - Skill ↔ Experience: if skill is in role's skills array
       - Skill ↔ Research: if skill is in paper's tags array
       - Skill ↔ Skill: if both appear together in 2+ items (weight = co-occurrence count)
    5. Return { nodes, edges }
```

#### 2. `components/graph/skill-graph-canvas.tsx` — The visualization
```
Purpose: Renders the force-directed graph using Canvas 2D.

Why Canvas instead of SVG or Three.js:
  - Better performance for 100+ nodes with real-time physics
  - Simpler than Three.js for 2D
  - Pixel-perfect text rendering

Implementation:
  - HTML5 Canvas element, full width/height of container
  - D3-force simulation (d3-force library):
    - forceCenter: centers the graph
    - forceManyBody: nodes repel each other (strength: -100)
    - forceLink: edges pull connected nodes together (distance: 80-200)
    - forceCollide: prevents node overlap (radius: node.size + 5)
    - forceX/forceY: gentle gravity toward center

  Rendering (in requestAnimationFrame loop):
    1. Clear canvas
    2. Draw edges:
       - Straight lines between connected nodes
       - Opacity: edge.weight / maxWeight * 0.3
       - Color: gradient from source.color to target.color
       - Width: 1-2px based on weight
    3. Draw nodes:
       - Circles with fill color
       - Stroke: white at 20% opacity
       - Size: node.size (radius in pixels)
       - Labels: node.label centered inside (or below for small nodes)
       - Font: 10-14px based on node size
    4. Draw hover state:
       - Highlighted node: brighter color, larger stroke
       - Connected nodes highlighted
       - Non-connected nodes dimmed
       - Connected edges thickened
    5. Draw selected state:
       - Selected node: ring animation
       - Detail panel opens

  Interaction:
    - Mouse move: hit-test nodes, show hover state + cursor pointer
    - Click: select node, open detail panel
    - Drag: grab and move nodes (update simulation)
    - Scroll wheel: zoom in/out (scale canvas transform)
    - Pan: drag empty space to pan view
    - Double-click: reset zoom/pan
    - Touch: pinch-zoom, tap to select, long-press to drag

  Physics controls (optional visible UI):
    - Charge strength slider (how much nodes repel)
    - Link distance slider
    - Gravity slider
    - "Reheat" button (restarts simulation)

  Animation:
    - On mount: nodes start clustered, simulation spreads them
    - New selection: camera smoothly pans to center selected node
    - Hover: connected edges animate (dash offset)
```

#### 3. `components/graph/skill-detail-panel.tsx` — Info panel
```
Purpose: Shows details about a selected node.

Layout:
  - Slides in from right (or bottom on mobile)
  - Width: 320px (or full-width bottom sheet on mobile)
  - Glass card styling

Content for SKILL nodes:
  - Skill name (large)
  - Expertise level: visual bar based on frequency
  - "Used in" section:
    - List of projects using this skill (clickable → project page)
    - List of roles using this skill (clickable → experience page)
    - List of papers using this skill (clickable → research page)
  - "Related skills" section:
    - Other skills frequently used alongside this one
    - Clickable → focuses graph on that skill

Content for PROJECT nodes:
  - Project name + description
  - Tech stack as tags
  - Links (live, github, details page)

Content for EXPERIENCE nodes:
  - Company, role, duration
  - Key highlights
  - Link to full experience page
```

#### 4. `app/skills/page.tsx` — Skills page
```
Purpose: Full-page skill graph experience.

Implementation:
  - Server component that builds graph data
  - Passes to client component
  - Full viewport height (minus nav)
  - Optional: legend showing node types and sizes
  - Optional: search/filter bar at top
  - Nav integration: appears in main navigation
```

### Files to Modify

#### `lib/nav-context.tsx`
```
Add: Skills page to navigation
  - Icon: Network or GitBranch from lucide-react
  - Label: "Skills"
  - href: "/skills"
```

#### `package.json`
```
Add dependency:
  - "d3-force": "^3.x"         // Force simulation
  - "@types/d3-force": "^3.x"  // TypeScript types (devDep)
```

### Performance
```
- Canvas rendering is ~60fps for up to 200 nodes
- D3-force simulation auto-cools (slows down as graph stabilizes)
- Off-screen nodes are culled (not rendered)
- Zoom levels: 0.25x to 3x (limits prevent performance issues)
- Mobile: reduce node count (show only skills with count >= 2)
```

---

## Feature 2.3: Terminal Mode (Extended Command Palette)

### Concept
Extend your existing `cmdk` command palette into a full terminal emulator experience. Users can toggle "Terminal Mode" which transforms the entire page into a terminal interface where they type commands to navigate and explore your portfolio. Commands like `ls projects`, `cat experience/google`, and `curl /api/v1/stats` return styled terminal output.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Terminal Mode                                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ shashwat.dev ~ $                                    │ │
│  │                                                     │ │
│  │ Welcome to shashwat.dev v2.0                        │ │
│  │ Type 'help' to see available commands               │ │
│  │                                                     │ │
│  │ $ help                                              │ │
│  │                                                     │ │
│  │ Navigation:                                         │ │
│  │   ls [section]     List items in a section          │ │
│  │   cd [page]        Navigate to a page               │ │
│  │   cat [item]       View details of an item          │ │
│  │                                                     │ │
│  │ Portfolio:                                          │ │
│  │   whoami            About me                        │ │
│  │   skills            List all skills                 │ │
│  │   tree              Show site structure              │ │
│  │   stats             Portfolio statistics             │ │
│  │                                                     │ │
│  │ API:                                                │ │
│  │   curl [endpoint]   Hit a real API endpoint         │ │
│  │   api               Open API playground              │ │
│  │                                                     │ │
│  │ Fun:                                                │ │
│  │   sudo hire me      😏                              │ │
│  │   neofetch          System info (portfolio style)   │ │
│  │   matrix            Enter the matrix                │ │
│  │   ping brain        Check if I'm thinking           │ │
│  │   cowsay [text]     🐮                              │ │
│  │                                                     │ │
│  │ Meta:                                               │ │
│  │   history            Command history                │ │
│  │   clear              Clear terminal                 │ │
│  │   exit               Back to normal mode            │ │
│  │   theme [dark|light] Toggle theme                   │ │
│  │                                                     │ │
│  │ $ ls projects                                       │ │
│  │                                                     │ │
│  │ drwxr-xr-x  neural-canvas/     AI-powered design   │ │
│  │ drwxr-xr-x  quantum-analytics/ Data visualization  │ │
│  │ drwxr-xr-x  realtime-collab/   Collaborative tool  │ │
│  │                                                     │ │
│  │ $ cat projects/neural-canvas                        │ │
│  │                                                     │ │
│  │ ╔══════════════════════════════════════════════╗    │ │
│  │ ║  Neural Canvas                               ║    │ │
│  │ ║  ─────────────────────────────────────────── ║    │ │
│  │ ║  AI-powered design tool that generates...    ║    │ │
│  │ ║                                              ║    │ │
│  │ ║  Tech: Python, PyTorch, React, FastAPI       ║    │ │
│  │ ║  Status: Live                                ║    │ │
│  │ ║  Links: [GitHub] [Live Demo]                 ║    │ │
│  │ ╚══════════════════════════════════════════════╝    │ │
│  │                                                     │ │
│  │ $ _                                                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Files to Create

#### 1. `lib/terminal/commands.ts` — Command registry
```
Purpose: Defines all available terminal commands and their handlers.

Types:
  interface TerminalCommand {
    name: string
    aliases: string[]
    description: string
    usage: string
    handler: (args: string[], context: TerminalContext) => TerminalOutput
  }

  interface TerminalOutput {
    type: "text" | "table" | "box" | "error" | "success" | "ascii-art" | "link"
    content: string
    color?: string
    navigateTo?: string  // if command should also navigate
  }

  interface TerminalContext {
    allProjects: Project[]
    allExperiences: Experience[]
    allThoughts: ThoughtPost[]
    allWork: Work[]
    history: string[]
    currentPath: string  // simulated filesystem path
  }

Commands:

  "help" → Displays all commands with descriptions

  "whoami" → Returns:
    "Shashwat Jain
     AI & Backend Engineer
     Location: ...
     Currently: {current role} at {company}
     Status: Open to collaborate"

  "ls" → Lists items in a section:
    "ls" → sections (projects, experience, thoughts, research)
    "ls projects" → all projects with descriptions
    "ls experience" → all roles
    "ls thoughts" → all blog posts
    "ls research" → all papers
    "ls -la projects" → detailed view with dates, tech

  "cat" → Shows details:
    "cat projects/neural-canvas" → full project details in a box
    "cat experience/ai-startup" → full role details
    "cat thoughts/future-of-web" → thought excerpt + "read more" link

  "cd" → Navigates:
    "cd projects" → router.push('/projects')
    "cd thoughts" → router.push('/thoughts')
    "cd ~" or "cd" → router.push('/')

  "skills" → Returns formatted skill list with counts

  "tree" → Returns site structure as ASCII tree:
    "shashwat.dev
     ├── projects/
     │   ├── neural-canvas
     │   ├── quantum-analytics
     │   └── realtime-collab
     ├── experience/
     │   ├── ai-startup
     │   └── tech-company
     ├── thoughts/
     │   ├── blog2
     │   └── future-of-web-development
     ├── research/
     │   ├── brain-tumor-classification
     │   ├── multimodal-retrieval
     │   └── transformer-attention
     └── api/
         └── v1/ (12 endpoints)"

  "stats" → Returns portfolio statistics

  "curl" → Hits real API endpoints:
    "curl /api/v1/stats" → actual fetch + display response
    "curl /api/v1/projects" → actual fetch + display
    Uses the Tier 1 API routes

  "neofetch" → ASCII art system info:
    "      ___           shashwat@dev
     |  ___|          ──────────────
     | |__ _ __       OS: Next.js 15.5.9
     |  __| '_ \      Kernel: React 19.0.0
     | |  | | | |     Shell: TypeScript 5
     |_|  |_| |_|     Theme: Dark (oklch)
                       Resolution: Responsive
                       WM: Framer Motion
                       Terminal: cmdk
                       CPU: Turbopack
                       Memory: MDX × 10 files
                       Uptime: Since 2023"

  "sudo hire me" →
    "[sudo] password for visitor: ********
     ✓ Authentication successful
     📧 Sending email to shashwat...
     📬 Done! Check your inbox, Shashwat knows you're interested.
     (Just kidding — but seriously, email me!)"

  "matrix" → Green raining characters animation (5 seconds)

  "ping brain" →
    "PING brain.shashwat.dev (127.0.0.1):
     64 bytes: time=2ms 🧠 thinking about AI
     64 bytes: time=1ms 🧠 building something cool
     64 bytes: time=3ms 🧠 writing code
     --- brain.shashwat.dev ping statistics ---
     3 packets transmitted, 3 received, 0% loss"

  "cowsay" → ASCII cow saying the text

  "history" → Shows command history
  "clear" → Clears terminal output
  "exit" → Exits terminal mode
  "theme dark|light" → Toggles theme

  Tab completion:
    - Completes command names
    - Completes section names after "ls", "cd", "cat"
    - Completes slug names after "cat projects/", etc.
```

#### 2. `components/terminal/terminal-mode.tsx` — Full terminal UI
```
Purpose: Full-screen terminal overlay.

Structure:
  <TerminalMode>
    ├── <TerminalHeader />
    │   - Title bar: "shashwat.dev — Terminal"
    │   - Traffic light buttons (red/yellow/green circles)
    │   - Close button → exits terminal mode
    │
    ├── <TerminalOutput />
    │   - Scrollable output area
    │   - Renders TerminalOutput[] as styled blocks
    │   - Auto-scrolls to bottom
    │   - Welcome message on first render
    │   - Each output entry has timestamp
    │
    ├── <TerminalInput />
    │   - Fixed at bottom
    │   - Prompt: "shashwat.dev ~ $ "
    │   - Input with monospace font
    │   - Command history (up/down arrows)
    │   - Tab completion
    │   - Auto-focus
    │
    └── State
        - outputs: TerminalOutput[]
        - history: string[]
        - historyIndex: number
        - isProcessing: boolean (for async commands like curl)

Styling:
  - Background: #0d0d0f (matches your dark bg)
  - Text: #a3e635 (lime-400, classic terminal green)
  - Font: monospace (Geist Mono or JetBrains Mono)
  - Prompt color: #4ade80 (green-400)
  - Error text: #f87171 (red-400)
  - Success text: #34d399 (emerald-400)
  - Box borders: ASCII box-drawing characters

Animation:
  - Terminal opens: scale from center with blur clear (200ms)
  - New output: typewriter effect for short outputs, instant for long
  - "matrix" command: full canvas takeover with green rain
  - Close: fade out (150ms)
```

#### 3. `components/terminal/terminal-toggle.tsx` — Toggle button
```
Purpose: Button/shortcut to enter terminal mode.

Implementation:
  - Keyboard shortcut: Ctrl+` (backtick) or Cmd+K then T
  - Small terminal icon in NavIsland (or standalone floating button)
  - Tooltip: "Terminal Mode (Ctrl+`)"
  - Badge: "> _" blinking cursor icon
```

#### 4. `lib/terminal/tab-complete.ts` — Tab completion engine
```
Purpose: Provides tab completion for terminal commands.

Implementation:
  - Trie-based prefix matching
  - Completes commands, section names, and slugs
  - Shows all options if multiple matches
  - Cycles through options on repeated Tab
```

#### 5. `lib/terminal/ascii-art.ts` — ASCII art generators
```
Purpose: Generates ASCII art for various commands.

Functions:
  - generateBox(title, content, width): string
    - Draws a box with ╔═╗║╚═╝ characters
  - generateTable(headers, rows): string
    - Draws aligned table with borders
  - generateTree(items, depth): string
    - Draws directory tree with ├── └── │ characters
  - neofetchArt(): string
    - The neofetch ASCII art + system info
  - cowsay(text): string
    - Classic cowsay output
  - matrixConfig: { chars, speed, density }
    - Config for the matrix rain effect
```

### Files to Modify

#### `components/providers.tsx`
```
Add: Terminal mode state and component
  - Add terminal mode context or state
  - Render <TerminalMode /> when active
  - Register keyboard shortcut (Ctrl+`)
```

#### `components/nav-island.tsx`
```
Add: Terminal toggle button in the nav island
  - Small "> _" icon that opens terminal mode
  - Or add to expanded nav as a special action item
```

---

## Tier 2 Dependencies & Build Order

```
Step 1: Install Tier 2 packages
  npm install d3-force
  npm install -D @types/d3-force

Step 2: Build Scroll Narrative (Feature 2.1)
  - Create lib/hooks/use-section-scroll.ts
  - Create components/scroll/ files (7 files)
  - Refactor components/home-client.tsx
  - Update components/nav-island.tsx
  → This is the largest feature, start first

Step 3: Build Skill Graph (Feature 2.2) [parallel with Step 2]
  - Create lib/skill-graph.ts
  - Create components/graph/ files (3 files)
  - Create app/skills/page.tsx
  - Update lib/nav-context.tsx
  → Independent, can be built alongside scroll narrative

Step 4: Build Terminal Mode (Feature 2.3) [parallel with Steps 2-3]
  - Create lib/terminal/ files (3 files)
  - Create components/terminal/ files (3 files)
  - Update components/providers.tsx
  - Update components/nav-island.tsx
  → Independent, can be built alongside both

Step 5: Integration testing
  - Test scroll narrative on mobile/desktop
  - Test skill graph with real data
  - Test all terminal commands
  - Performance profiling
```

### Estimated New Files: 18-22
### Estimated Modified Files: 4-6
### New Dependencies: 2
