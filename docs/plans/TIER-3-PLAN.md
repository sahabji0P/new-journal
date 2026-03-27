# TIER 3: Polish That Creates Memory

> These are the details that separate craft from content.
> Each one is subtle individually, but together they create
> an experience that visitors remember and talk about.

---

## Feature 3.1: Magnetic Cursor + Split-Flap Name Animation

### Concept
Two micro-interactions that create immediate "wow":
1. **Magnetic cursor**: Interactive elements subtly gravitate toward the cursor when it's nearby
2. **Split-flap animation**: Your name decodes character-by-character like an airport departure board

### Files to Create

#### 1. `components/effects/magnetic-element.tsx` — Magnetic wrapper
```
Purpose: A wrapper component that makes its children magnetically
         attracted to the cursor when hovering nearby.

Props:
  - children: ReactNode
  - strength?: number (default 0.3, range 0-1)
  - radius?: number (default 100px, how close cursor must be)
  - disabled?: boolean

Implementation:
  - Track mouse position relative to element center
  - When cursor is within radius:
    - Calculate offset vector from center to cursor
    - Apply transform: translate(offset.x * strength, offset.y * strength)
    - Use Framer Motion's useMotionValue + useTransform for smooth animation
  - When cursor leaves radius:
    - Spring back to original position (spring: stiffness 150, damping 15)

  Usage:
    <MagneticElement strength={0.3}>
      <a href="/projects">Projects</a>
    </MagneticElement>

  Where to apply:
    - Social link icons in hero
    - Nav island buttons
    - CTA buttons
    - Project card titles
    - NOT on body text (would be annoying)

  Technical approach:
    - Use onMouseMove on a containing div
    - getBoundingClientRect() to find element center
    - Calculate distance and angle
    - Apply via motion.div style={{ x, y }}
    - Use useSpring for natural motion

  Performance:
    - Only active when cursor is within radius (no-op otherwise)
    - Uses CSS transforms (GPU-accelerated)
    - Debounce mouse tracking to every 2nd frame on low-power devices
```

#### 2. `components/effects/split-flap-text.tsx` — Decode animation
```
Purpose: Text that "decodes" character by character, cycling through
         random characters before landing on the correct one.

Props:
  - text: string (the final text to display)
  - speed?: number (ms per character resolve, default 50)
  - cyclesPerChar?: number (how many random chars before resolving, default 5)
  - charset?: string (characters to cycle through)
  - triggerOnView?: boolean (start when scrolled into view)
  - delay?: number (ms delay before starting)
  - className?: string

Implementation:
  - Characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"
  - For each character in the text string:
    1. Start as random character from charset
    2. Every (speed / cyclesPerChar) ms, switch to another random char
    3. After cyclesPerChar cycles, resolve to the correct character
    4. Move to next character (stagger: speed ms)
  - Spaces resolve immediately (no cycling)

  State:
    - displayChars: string[] (current display state of each character)
    - resolvedCount: number (how many characters have resolved)
    - isComplete: boolean

  Animation timeline for "SHASHWAT":
    Frame 0:   "K . . . . . . ."  (S cycles)
    Frame 1:   "X R . . . . . ."  (S still cycling, H starts)
    Frame 2:   "M Q J . . . . ."
    Frame 3:   "S Q J A . . . ."  (S resolves!)
    Frame 4:   "S H J A T . . ."  (H resolves!)
    ...
    Frame 14:  "S H A S H W A T"  (all resolved)

  Visual styling:
    - Monospace font (critical for alignment)
    - Unresolved characters: text-muted-foreground opacity-60
    - Resolving character (currently cycling): text-lime-400 opacity-100
    - Resolved characters: text-foreground opacity-100
    - Optional: slight glow on the currently resolving character
    - Optional: subtle scan-line effect across the text

  Usage on hero:
    <SplitFlapText
      text="SHASHWAT JAIN"
      speed={60}
      cyclesPerChar={4}
      className="text-6xl font-light tracking-wider"
    />
```

#### 3. `components/effects/typewriter-text.tsx` — Typewriter effect
```
Purpose: Text that types itself character by character with a blinking cursor.

Props:
  - text: string | string[] (multiple lines for sequential typing)
  - speed?: number (ms per character, default 30)
  - delay?: number (ms before starting)
  - cursor?: boolean (show blinking cursor)
  - cursorChar?: string (default "|")
  - onComplete?: () => void

Implementation:
  - Uses requestAnimationFrame for smooth timing
  - Characters appear one at a time
  - Blinking cursor at the end (CSS animation: opacity 0↔1, 530ms)
  - For string[]: types first string, pauses 500ms, continues to next

Usage:
  - Hero tagline
  - Email address in Connect section
  - Terminal mode welcome message
```

### Files to Modify

#### `components/hero/hero-content.tsx` (from Tier 1)
```
Integrate:
  - Replace static name text with <SplitFlapText text="SHASHWAT JAIN" />
  - Replace static tagline with <TypewriterText text="AI & Backend Engineer" delay={800} />
  - Wrap social links with <MagneticElement strength={0.4}>
```

#### `components/nav-island.tsx`
```
Integrate:
  - Wrap nav buttons with <MagneticElement strength={0.2}>
  - Subtle effect, not distracting
```

---

## Feature 3.2: Live Metrics Dashboard

### Concept
A bento-grid section on the home page showing real-time data: GitHub activity, blog views, site visitors, API health. Makes the portfolio feel alive and actively maintained.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  BENTO GRID DASHBOARD                                │
│                                                      │
│  ┌──────────────────────┬───────────────────────┐   │
│  │                      │                        │   │
│  │  GitHub Activity     │   Current Visitors     │   │
│  │  ████████░░ 847      │   🟢 3 people here     │   │
│  │  commits this year   │      right now          │   │
│  │                      │                        │   │
│  ├──────────────────────┼───────────┬───────────┤   │
│  │                      │           │            │   │
│  │  Skills Radar        │  Blog     │  API       │   │
│  │                      │  Views    │  Health    │   │
│  │    ╱AI──╲            │           │            │   │
│  │   ╱  ██  ╲           │  1,247    │  ● 23ms   │   │
│  │  Backend──Frontend   │  total    │  99.9%     │   │
│  │   ╲  ██  ╱           │  reads    │  uptime    │   │
│  │    ╲____╱            │           │            │   │
│  │                      │           │            │   │
│  ├──────────────────────┴───────────┴───────────┤   │
│  │                                               │   │
│  │  Tech Stack Timeline                          │   │
│  │  2022 ──●── 2023 ──●── 2024 ──●── 2025 ──●  │   │
│  │  Python   FastAPI   PyTorch     LLMs         │   │
│  │                                               │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Files to Create

#### 1. `app/api/v1/metrics/route.ts` — Metrics aggregation endpoint
```
Purpose: Returns real-time portfolio metrics.

Data Sources:
  - GitHub API: commit count, repos, contribution streak
    - Uses: fetch('https://api.github.com/users/{username}/events')
    - Cache: 5 minute TTL (to avoid rate limits)
  - Blog post count: from getAllThoughts()
  - Project count: from getAllProjects()
  - Current time on site: (client-side only, not server metric)
  - API health: self-ping to /api/v1/stats with timing

Response:
  {
    github: {
      commitsThisYear: 847,
      streak: 12,        // consecutive days
      repos: 23,
      lastActive: "2h ago"
    },
    content: {
      thoughts: 2,
      projects: 3,
      publications: 3,
      totalWords: 15000
    },
    api: {
      status: "healthy",
      responseTime: 23,  // ms
      uptime: 99.9
    },
    skills: {
      total: 25,
      topCategories: [
        { name: "AI/ML", count: 12 },
        { name: "Backend", count: 10 },
        { name: "Frontend", count: 8 }
      ]
    }
  }

Environment Variables:
  - GITHUB_TOKEN (optional, for higher rate limits)
  - GITHUB_USERNAME
```

#### 2. `components/dashboard/bento-grid.tsx` — Grid layout
```
Purpose: Bento-style grid layout for metric cards.

Implementation:
  - CSS Grid with named areas
  - Desktop: 4 columns, 3 rows
  - Tablet: 2 columns
  - Mobile: 1 column (stack)
  - Gap: 16px
  - Each cell: glass-card styling

  Grid template (desktop):
    "github   github   visitors visitors"
    "radar    radar    blog     api"
    "timeline timeline timeline timeline"

  Each cell is a self-contained component:
    <BentoGrid>
      <BentoCard area="github"><GitHubActivity /></BentoCard>
      <BentoCard area="visitors"><VisitorCount /></BentoCard>
      <BentoCard area="radar"><SkillRadar /></BentoCard>
      <BentoCard area="blog"><BlogStats /></BentoCard>
      <BentoCard area="api"><ApiHealth /></BentoCard>
      <BentoCard area="timeline"><TechTimeline /></BentoCard>
    </BentoGrid>

Animation:
  - Cards stagger in on scroll (100ms per card)
  - Numbers count up from 0 to final value (1.5s, ease-out)
  - Pulse animation on "live" indicators
```

#### 3. `components/dashboard/github-activity.tsx`
```
Purpose: Shows GitHub contribution activity.

Display:
  - Mini heatmap (last 12 weeks, 7 rows)
  - Each cell: 10x10px square, opacity based on commits
  - Color: lime-400 at varying opacities
  - Headline number: "847 commits this year"
  - Sub text: "12-day streak"
  - Link to GitHub profile
```

#### 4. `components/dashboard/visitor-count.tsx`
```
Purpose: Shows (simulated) current visitors.

Implementation:
  - Simple display: "N people here right now"
  - Green dot pulsing animation
  - NOTE: For real implementation, would need WebSocket/SSE
  - Simpler approach: show "page views today" from a counter API
  - Or use a simple counter API (e.g., CountAPI or self-hosted)

  Could also show:
  - "You're the Nth visitor"
  - Visitor location map (tiny world map with dots)
```

#### 5. `components/dashboard/skill-radar.tsx`
```
Purpose: Radar/spider chart showing skill distribution.

Implementation:
  - SVG-based radar chart
  - 5-6 axes: AI/ML, Backend, Frontend, DevOps, Research, Systems
  - Each axis: skill count in that category
  - Filled polygon showing strength distribution
  - Color: lime-400 fill at 20% opacity, lime-400 stroke
  - Animate: polygon grows from center on scroll-enter
  - Labels at each axis endpoint
```

#### 6. `components/dashboard/api-health.tsx`
```
Purpose: Shows API health status.

Display:
  - Status dot (green/yellow/red)
  - Response time in ms
  - Uptime percentage
  - Mini sparkline of last 10 response times
  - Updated every 30 seconds (polling)
```

#### 7. `components/dashboard/tech-timeline.tsx`
```
Purpose: Horizontal timeline of technology adoption.

Display:
  - Horizontal line with year markers
  - Technology nodes at the year you started using them
  - Nodes sized by how many projects use that tech
  - Color-coded by category
  - Hover: shows tech name and project count
  - Auto-scrolls to current year
```

#### 8. `lib/hooks/use-count-up.ts` — Number animation hook
```
Purpose: Animates a number from 0 to target value.

Usage:
  const count = useCountUp(847, { duration: 1500, easing: "easeOutCubic" })
  // count smoothly animates from 0 to 847 over 1.5 seconds

Props:
  - target: number
  - duration: number (ms)
  - easing: string
  - triggerOnView: boolean (default true)
  - decimals: number (default 0)
```

### Files to Modify

#### `components/home-client.tsx` (or scroll narrative equivalent)
```
Add: Dashboard section between "Builds" and "Notes" (or after "Notes")
  - New section in the scroll narrative
  - Title: "By the Numbers" or "Live Dashboard"
  - Contains <BentoGrid /> with all metric cards
```

---

## Feature 3.3: Generative Art Headers

### Concept
Each section of your portfolio gets a unique generative art piece as its header background. The art is algorithmically generated from your actual portfolio data — number of projects controls particle count, years of experience controls flow complexity. Every time you ship something new, the art subtly changes.

### Files to Create

#### 1. `components/generative/flow-field-header.tsx` — Section header art
```
Purpose: Canvas-based generative art that serves as section backgrounds.

Props:
  - seed: number (deterministic random seed — derived from content hash)
  - complexity: number (1-10, controls noise octaves)
  - particleCount: number (50-500)
  - colorScheme: "lime" | "cyan" | "amber" | "mixed"
  - height: number (default 200px)
  - className?: string

Algorithm:
  1. Create 2D simplex noise field seeded with the seed value
  2. Spawn particles at random positions
  3. Each frame: move particles along noise field vectors
  4. Draw particle trails as fading lines
  5. Color: based on colorScheme, with slight variation from noise

  The result is a unique flow pattern for each section.

Data-Driven Parameters:
  - "Journey" section: seed = hash of experience dates
    complexity = years of experience
    particleCount = total roles * 50
    color = lime

  - "Builds" section: seed = hash of project names
    complexity = number of unique technologies
    particleCount = total projects * 80
    color = cyan

  - "Notes" section: seed = hash of thought titles
    complexity = total categories
    particleCount = total thoughts * 40
    color = amber

  - "Research" section: seed = hash of paper titles
    complexity = unique venues
    particleCount = total papers * 60
    color = mixed

Rendering:
  - Canvas 2D (not WebGL — lightweight, sufficient for 2D)
  - Render once on mount (not animated continuously)
  - Or: slow animation (1 frame per 100ms) for subtle movement
  - Apply CSS opacity: 0.15 (subtle background, not distracting)
  - CSS mix-blend-mode: screen (blends with dark background)

Performance:
  - Renders in offscreen canvas, then transfers to visible canvas
  - Memoized: only re-renders if data changes
  - No animation on prefers-reduced-motion
  - Canvas resolution: half-pixel for retina (save GPU)
```

#### 2. `lib/generative/noise.ts` — Seeded noise utilities
```
Purpose: Deterministic noise generation for generative art.

Functions:
  - seededRandom(seed: number): () => number
    - Returns a seeded pseudo-random number generator
    - Same seed always produces same sequence

  - seededNoise2D(seed: number): (x: number, y: number) => number
    - Seeded 2D simplex noise
    - Uses simplex-noise library with custom seed

  - contentHash(strings: string[]): number
    - Converts an array of strings to a deterministic numeric hash
    - Used to derive seed from content data
    - Simple: sum of char codes with prime multiplier
```

#### 3. `components/generative/section-art.tsx` — Smart wrapper
```
Purpose: Automatically generates appropriate art for each section.

Props:
  - section: "journey" | "builds" | "notes" | "research" | "skills"
  - data: any (the section's content data for parameter derivation)

Implementation:
  - Computes seed, complexity, particleCount from data
  - Renders <FlowFieldHeader /> with computed parameters
  - Includes fallback (gradient) for SSR/no-JS
```

### Files to Modify

#### `components/scroll/` sections (from Tier 2)
```
Add <SectionArt> as background layer to each scroll section:
  - horizontal-journey.tsx: <SectionArt section="journey" data={experiences} />
  - staggered-builds.tsx: <SectionArt section="builds" data={projects} />
  - editorial-notes.tsx: <SectionArt section="notes" data={thoughts} />
```

---

## Feature 3.4: Animated Architecture Diagrams

### Concept
For each project, instead of just a text description, show an SVG system architecture diagram that builds itself as the user scrolls. Request flow lines animate, components fade in, data paths illuminate. This replaces static project descriptions with visual stories.

### Files to Create

#### 1. `components/diagrams/architecture-diagram.tsx` — SVG diagram renderer
```
Purpose: Renders an animated SVG architecture diagram for a project.

Props:
  - diagram: DiagramData (nodes, edges, layout)
  - animateOnScroll?: boolean (default true)
  - className?: string

Types:
  interface DiagramNode {
    id: string
    label: string
    type: "frontend" | "api" | "service" | "database" | "ml-model" | "queue" | "cache" | "external"
    x: number          // position (percentage 0-100)
    y: number
    icon?: string      // lucide icon name
  }

  interface DiagramEdge {
    from: string       // node id
    to: string         // node id
    label?: string     // e.g., "REST", "gRPC", "WebSocket"
    style?: "solid" | "dashed" | "animated"
    direction?: "forward" | "backward" | "both"
  }

  interface DiagramData {
    nodes: DiagramNode[]
    edges: DiagramEdge[]
    title: string
  }

Rendering:
  - SVG viewBox (responsive, scales to container)
  - Nodes:
    - Rounded rectangles with icon + label
    - Color-coded by type:
      frontend: cyan-400
      api: lime-400
      service: amber-400
      database: violet-400
      ml-model: pink-400
      queue: orange-400
      cache: sky-400
      external: gray-400
    - Drop shadow for depth

  - Edges:
    - SVG <path> with curved connections (cubic bezier)
    - Arrowheads for direction
    - Labels on the path midpoint
    - Dashed style for async connections

Animation (scroll-driven):
  1. Phase 1 (0-30%): Nodes fade in one by one, staggered
     - Each node: opacity 0→1, scale 0.8→1.0
     - Stagger: 150ms between nodes
     - Order: left-to-right, top-to-bottom

  2. Phase 2 (30-70%): Edges draw themselves
     - Each edge: SVG stroke-dashoffset animation
     - Starts from source, "draws" to target
     - Arrow head appears when edge completes
     - Labels fade in after edge completes

  3. Phase 3 (70-100%): Data flow animation
     - Small dots travel along edges (representing data flow)
     - Dots move from source to destination
     - Continuous loop
     - Color: matches source node
     - Creates a "living system" feel

  Static mode (prefers-reduced-motion):
    - All elements visible immediately
    - No flowing dots
    - Dashed edges are CSS-animated only
```

#### 2. `lib/diagrams/project-diagrams.ts` — Diagram definitions
```
Purpose: Defines the architecture diagram for each project.

Format: One diagram definition per project slug.

Example for "neural-canvas":
  {
    title: "Neural Canvas Architecture",
    nodes: [
      { id: "ui", label: "React UI", type: "frontend", x: 10, y: 50 },
      { id: "api", label: "FastAPI", type: "api", x: 35, y: 50 },
      { id: "model", label: "PyTorch Model", type: "ml-model", x: 60, y: 30 },
      { id: "queue", label: "Task Queue", type: "queue", x: 60, y: 70 },
      { id: "db", label: "PostgreSQL", type: "database", x: 85, y: 50 },
    ],
    edges: [
      { from: "ui", to: "api", label: "REST" },
      { from: "api", to: "model", label: "Inference", style: "animated" },
      { from: "api", to: "queue", label: "Async Jobs" },
      { from: "model", to: "api", label: "Result", direction: "backward" },
      { from: "queue", to: "db", label: "Store" },
    ]
  }

Function:
  - getDiagramForProject(slug: string): DiagramData | null
  - Returns null if no diagram defined (graceful fallback)
```

#### 3. `components/diagrams/diagram-node.tsx` — Individual node component
```
Purpose: Renders a single node in the architecture diagram.

Implementation:
  - SVG group: <g transform="translate(x, y)">
  - Background: rounded rect with fill color
  - Icon: lucide icon rendered as SVG (small, centered top)
  - Label: text centered below icon
  - Hover: slight grow + tooltip with full description
  - Animation: uses Framer Motion's motion.g for SVG animation
```

#### 4. `components/diagrams/diagram-edge.tsx` — Edge with animation
```
Purpose: Renders an animated edge between nodes.

Implementation:
  - Calculates curved path between two nodes
  - SVG <path> with stroke-dasharray for draw animation
  - Arrowhead: SVG <marker> definition
  - Label: <text> positioned at path midpoint
  - Flow dots: <circle> elements animated along the path using
    SVG <animateMotion> or Framer Motion

Path calculation:
  - If nodes are roughly horizontal: cubic bezier with vertical curve
  - If nodes are roughly vertical: cubic bezier with horizontal curve
  - Avoids overlapping other nodes (basic collision avoidance)
```

### Files to Modify

#### `app/projects/[slug]/page.tsx`
```
Add: Architecture diagram section above or below the MDX content
  - Import getDiagramForProject
  - If diagram exists, render <ArchitectureDiagram /> before content
  - Full width, max-height 400px
```

#### `components/scroll/staggered-builds.tsx` (from Tier 2)
```
Optional: Show mini-diagrams on hover or inside expanded project cards
  - Simplified version: just nodes, no animation
  - Click to go to full project page for animated version
```

---

## Tier 3 Dependencies & Build Order

```
Step 1: No new packages needed
  (All use Framer Motion, Canvas API, SVG — already available)
  Exception: if you want a dedicated counter animation library

Step 2: Build Magnetic Cursor + Split-Flap (Feature 3.1)
  - Create components/effects/ files (3 files)
  - Integrate into hero and nav
  → Quick win, start here

Step 3: Build Live Metrics Dashboard (Feature 3.2) [parallel]
  - Create app/api/v1/metrics/route.ts
  - Create components/dashboard/ files (7 files)
  - Create lib/hooks/use-count-up.ts
  - Add to home page
  → Independent, build alongside 3.1

Step 4: Build Generative Art Headers (Feature 3.3) [parallel]
  - Create lib/generative/ files (1 file)
  - Create components/generative/ files (2 files)
  - Integrate into scroll sections
  → Independent, build alongside 3.1 and 3.2

Step 5: Build Architecture Diagrams (Feature 3.4) [after projects exist]
  - Create lib/diagrams/ files (1 file)
  - Create components/diagrams/ files (3 files)
  - Modify project detail page
  → Can be built last

Step 6: Final integration and polish
  - Ensure all effects respect prefers-reduced-motion
  - Test on mobile devices
  - Performance audit
  - Adjust timing/easing across all animations for consistency
```

### Estimated New Files: 18-20
### Estimated Modified Files: 4-6
### New Dependencies: 0 (uses existing stack)
