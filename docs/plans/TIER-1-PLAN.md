# TIER 1: Transformative Features

> These three features alone will put your portfolio in the top 1% of developer sites.
> Each one directly DEMONSTRATES your AI & Backend engineering skills.

---

## Feature 1.1: AI Chat Widget (RAG-Powered)

### Concept
A floating chat widget where visitors ask questions about you and get AI-powered answers sourced from your actual portfolio content (MDX files, experience, projects, research). The AI cites specific projects and experience. For an AI engineer, having a working AI on your portfolio IS the proof of competence.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                  │
│                                                      │
│  ┌──────────────┐    ┌───────────────────────┐      │
│  │ ChatWidget    │───▶│ app/api/chat/route.ts │      │
│  │ (floating UI) │◀───│ (streaming endpoint)  │      │
│  │               │    └───────────┬───────────┘      │
│  │ - Message list│                │                   │
│  │ - Input box   │                │ streamText()      │
│  │ - Typing anim │                │                   │
│  └──────────────┘    ┌───────────▼───────────┐      │
│                      │ lib/ai/portfolio-rag.ts│      │
│                      │                        │      │
│                      │ - Load all MDX content │      │
│                      │ - Build context string │      │
│                      │ - System prompt with   │      │
│                      │   your full portfolio  │      │
│                      └────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### Files to Create

#### 1. `lib/ai/portfolio-rag.ts` — Content aggregator
```
Purpose: Loads ALL your MDX content at build/request time and formats it
         as context for the AI model.

Functions:
  - getPortfolioContext(): string
    - Calls getAllExperiences(), getAllProjects(), getAllThoughts(), getAllWork()
    - Formats each into structured text:
      "## Experience\n### {company} - {role}\n{description}\nHighlights: {highlights}\nSkills: {skills}\n\n"
    - Returns a single string with ALL your portfolio data

  - getSystemPrompt(): string
    - Returns the system prompt that tells the AI:
      "You are Shashwat's portfolio assistant. Answer questions about
       his work, skills, and experience using ONLY the following context.
       Be conversational, concise, and cite specific projects/roles.
       If asked something not in the context, say you don't know.
       Never make up information."
    - Appends getPortfolioContext() as context block

  - getSuggestedQuestions(): string[]
    - Returns starter questions like:
      "What AI projects has Shashwat built?"
      "Tell me about his research papers"
      "What's his tech stack?"
      "What is he working on right now?"
```

#### 2. `app/api/chat/route.ts` — Streaming chat endpoint
```
Purpose: Handles chat messages, streams AI responses back.

Implementation:
  - POST handler
  - Extract messages from request body
  - Call getSystemPrompt() for full context
  - Use AI SDK's streamText() with:
    - model: your preferred model (can use OpenAI, Anthropic, or local)
    - system: getSystemPrompt()
    - messages: from request
  - Return toUIMessageStreamResponse()

Environment Variables Needed:
  - OPENAI_API_KEY or ANTHROPIC_API_KEY (for the AI model)
  - Or connect to your existing Python backend at 127.0.0.1:8000

Option B (Use Your Python Backend):
  - Instead of AI SDK, proxy to your Python backend
  - Add a /chat endpoint to your Python service
  - Frontend still uses the same streaming pattern
  - This showcases YOUR infrastructure, not just an API key
```

#### 3. `components/chat/chat-widget.tsx` — The floating UI
```
Purpose: A floating chat bubble in the bottom-right corner that expands
         into a full chat interface.

Structure:
  <ChatWidget>
    ├── <ChatToggle />          // Floating button to open/close
    │   - Fixed position bottom-right (but offset from NavIsland)
    │   - Pulsing dot animation when closed
    │   - Icon: MessageCircle from lucide-react
    │   - Badge showing "Ask me anything"
    │
    ├── <ChatPanel />           // The expanded chat window
    │   - AnimatePresence for smooth open/close
    │   - Glass card styling (matches your existing glass-card class)
    │   - Header: "Chat with Shashwat's AI" + close button
    │   - Width: 380px desktop, full-width mobile
    │   - Height: 500px desktop, 70vh mobile
    │
    │   ├── <ChatMessages />    // Scrollable message list
    │   │   - Auto-scroll to bottom on new messages
    │   │   - User messages: right-aligned, accent color bg
    │   │   - AI messages: left-aligned, card bg
    │   │   - Typing indicator (three bouncing dots)
    │   │   - Markdown rendering for AI responses
    │   │   - Fade-in animation per message
    │   │
    │   ├── <SuggestedQuestions /> // Starter prompts (shown when empty)
    │   │   - Grid of clickable question chips
    │   │   - Disappears after first message
    │   │
    │   └── <ChatInput />       // Input area
    │       - Textarea (auto-resize)
    │       - Send button (arrow icon)
    │       - Enter to send, Shift+Enter for newline
    │       - Disabled state while AI is responding
    │
    └── State Management
        - useChat() hook from AI SDK (or custom hook)
        - isOpen: boolean (toggle chat panel)
        - messages: Message[] (chat history)
        - isLoading: boolean (AI responding)
        - Persist open/closed state in sessionStorage

Positioning Strategy:
  - NavIsland is bottom-center
  - ChatWidget is bottom-right
  - On mobile: ChatPanel goes full-screen overlay
  - Z-index: above content, same level as NavIsland
```

#### 4. `components/chat/chat-messages.tsx` — Message display
```
Purpose: Renders the chat message list with proper styling.

Features:
  - Markdown rendering for AI responses (use remark/rehype you already have)
  - Code block syntax highlighting (reuse your existing rehype-prism setup)
  - Link detection and styling
  - "Sources" section at bottom of AI messages showing which projects/experience were referenced
  - Smooth scroll to bottom with useEffect
  - Empty state with Shashwat's avatar and greeting
```

#### 5. `components/chat/chat-input.tsx` — Input component
```
Purpose: Chat input with auto-resize and keyboard handling.

Features:
  - Auto-growing textarea (min 1 row, max 4 rows)
  - Send on Enter, newline on Shift+Enter
  - Send button with arrow icon
  - Disabled + loading state while AI responds
  - Character limit indicator (optional)
  - Focus trap when chat panel is open
```

### Files to Modify

#### `components/providers.tsx`
```
Add: Import and render <ChatWidget /> alongside <NavIsland />
Position: After NavIsland in the JSX tree
```

#### `package.json`
```
Add dependencies:
  - "ai": "latest"              // AI SDK core
  - "@ai-sdk/openai": "latest"  // Or @ai-sdk/anthropic
  - "@ai-sdk/react": "latest"   // React hooks (useChat)
  - "react-markdown": "latest"  // Markdown rendering in chat
```

### Styling Details
```
Color palette (matching your existing design tokens):
  - Chat bubble: bg-lime-400/90 (your accent color)
  - Panel background: bg-[#0d0d0f]/95 backdrop-blur-xl (matches NavIsland)
  - User message: bg-lime-400/10 border-lime-400/20
  - AI message: bg-card/50 border-border/30
  - Input: bg-background/50 border-border/50
  - Send button: bg-lime-400 text-black (active), bg-muted (disabled)

Animations:
  - Panel open: scale(0.95, 1) + opacity(0, 1) + y(20, 0), spring
  - Messages: fadeInUp with stagger (0.05s per message)
  - Typing dots: 3 circles with staggered bounce animation
  - Chat bubble: pulse-glow animation (you already have this in globals.css)
```

### Data Flow
```
1. User opens chat → ChatWidget renders ChatPanel
2. Suggested questions shown → User clicks one or types
3. Message sent → POST /api/chat with message history
4. Route handler → loads portfolio context → calls AI model
5. AI streams response → useChat() receives chunks
6. Each chunk rendered in real-time → auto-scroll
7. Response complete → user can ask follow-up
```

---

## Feature 1.2: Interactive Particle/Flow Field Hero

### Concept
Replace the current static blurred gradient circles in the hero with a WebGL canvas showing particles flowing in a neural-network-inspired pattern. Particles respond to mouse movement — creating ripples, attraction, and repulsion. The effect should feel like watching data flow through a neural network.

### Architecture

```
┌──────────────────────────────────────────────┐
│  Hero Section (components/home-client.tsx)     │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │ <ParticleHero />                       │   │
│  │  ├── <Canvas> (react-three-fiber)      │   │
│  │  │   ├── <ParticleField />             │   │
│  │  │   │   - 2000-5000 particles         │   │
│  │  │   │   - Flow field movement         │   │
│  │  │   │   - Mouse interaction           │   │
│  │  │   │   - Color: lime-400 → cyan-400  │   │
│  │  │   │                                 │   │
│  │  │   ├── <ConnectionLines />           │   │
│  │  │   │   - Lines between nearby        │   │
│  │  │   │     particles (neural net look) │   │
│  │  │   │   - Opacity based on distance   │   │
│  │  │   │                                 │   │
│  │  │   └── <MouseFollower />             │   │
│  │  │       - Glow effect at cursor       │   │
│  │  │       - Particles attracted/repelled│   │
│  │  │                                     │   │
│  │  └── <HeroContent /> (overlaid text)   │   │
│  │      - Name, tagline, links            │   │
│  │      - Positioned with pointer-events  │   │
│  └───────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Files to Create

#### 1. `components/hero/particle-hero.tsx` — Main wrapper
```
Purpose: Wraps the Three.js canvas and overlays hero text content.

Structure:
  - Full viewport height section (h-screen or min-h-[90vh])
  - Canvas as absolute background (z-0)
  - Hero text content on top (z-10, pointer-events-auto)
  - Lazy-loads Three.js canvas (React.lazy + Suspense)
  - Fallback: your current gradient blobs while loading
  - Detects low-power devices (navigator.hardwareConcurrency < 4)
    and falls back to a simpler CSS animation

Props:
  - className?: string
  - reducedMotion?: boolean (from prefers-reduced-motion)
```

#### 2. `components/hero/particle-field.tsx` — The WebGL particles
```
Purpose: Three.js component rendering the particle system.

Implementation:
  - Uses THREE.Points with BufferGeometry
  - Particle count: 2000 (desktop), 800 (mobile)
  - Each particle has: position (x, y, z), velocity, color, size

Flow Field Algorithm:
  - 3D simplex noise field (use simplex-noise library)
  - Each particle's velocity influenced by noise at its position
  - Noise field scrolls slowly over time (creates flow movement)
  - Parameters:
    - noiseScale: 0.003 (how zoomed in the noise is)
    - noiseSpeed: 0.0003 (how fast the field evolves)
    - particleSpeed: 0.5 (base movement speed)
    - fieldStrength: 0.02 (how much noise affects velocity)

Mouse Interaction:
  - Track mouse position via raycaster on invisible plane
  - Within radius 150px: particles are attracted toward cursor
  - Within radius 50px: particles are repelled (creates a void)
  - Attraction/repulsion strength falls off with distance squared
  - Creates a "magnetic" feel around the cursor

Colors:
  - Base: rgba(163, 230, 53, 0.6) — your lime-400
  - Near mouse: rgba(34, 211, 238, 0.8) — your cyan-400
  - Transition: lerp based on distance to mouse
  - Size: 1.5-3px, slightly larger near mouse

Connection Lines:
  - For each particle, check neighbors within radius 80px
  - Draw line with opacity = 1 - (distance / 80)
  - Max 3 connections per particle (performance)
  - Color: same as particle, 30% opacity
  - Creates the "neural network" visual

Performance:
  - Use BufferAttribute for all particle data
  - Update positions in useFrame() (per-frame callback)
  - Set needsUpdate = true on position attribute only
  - Use instanced geometry for connection lines
  - Target: 60fps on mid-range devices

Animation Loop (in useFrame):
  1. Update noise field time parameter
  2. For each particle:
     a. Sample noise at particle position → get force vector
     b. Apply mouse attraction/repulsion
     c. Add force to velocity (with damping 0.98)
     d. Add velocity to position
     e. Wrap around boundaries (if particle exits view, wrap to other side)
     f. Update color based on mouse distance
  3. Update buffer attribute
  4. Update connection lines geometry
```

#### 3. `components/hero/hero-content.tsx` — Overlaid text
```
Purpose: The hero text that sits on top of the particle canvas.

Content (extracted from current home-client.tsx intro section):
  - Name: "Shashwat Jain" with split-flap/decode animation
  - Tagline/description
  - Social links (GitHub, X, LinkedIn)
  - Location badge
  - "Open to collaborate" status
  - Resume link

New Animations:
  - Name text: Split-flap decode effect
    - Each character starts as random char
    - "Decodes" to correct character one at a time
    - Left-to-right reveal, 50ms stagger per character
    - Characters cycle through: A-Z, 0-9, symbols
    - 3-5 cycles before landing on correct character

  - Tagline: Typewriter effect
    - Appears after name finishes decoding
    - Types character by character, 30ms per char
    - Blinking cursor at the end

  - Social links: Stagger fade-in from bottom
    - 200ms delay after tagline completes
    - Each link fades up with 100ms stagger
```

#### 4. `lib/hooks/use-reduced-motion.ts` — Accessibility hook
```
Purpose: Detects prefers-reduced-motion and low-power devices.

Returns:
  - reducedMotion: boolean (true if user prefers reduced motion)
  - lowPower: boolean (true if hardwareConcurrency < 4)
  - shouldReduceEffects: boolean (either of above)
```

### Files to Modify

#### `components/home-client.tsx`
```
Changes:
  1. Remove the static gradient blob divs:
     - Remove: <div className="pointer-events-none fixed inset-0 opacity-30">
       and its children (the 3 gradient circles)

  2. Replace intro section with <ParticleHero>:
     - Extract the intro section JSX
     - Move it into <HeroContent /> component
     - Wrap with <ParticleHero> which provides canvas background

  3. Keep all other sections (Now, Journey, Builds, Notes, Connect) unchanged
```

#### `package.json`
```
Add dependencies:
  - "@react-three/fiber": "^9.x"    // React renderer for Three.js
  - "@react-three/drei": "^10.x"    // Helpers (OrbitControls, etc.)
  - "three": "^0.170.x"             // Three.js core
  - "simplex-noise": "^4.x"         // Noise generation for flow field
  - "@types/three": "^0.170.x"      // TypeScript types (devDep)
```

### Visual Reference
```
What the hero looks like:

  ┌────────────────────────────────────────────────────┐
  │ ·  ·    ·  ·  ·    ·  ·  ·    ·  ·    ·  ·  ·   │
  │   ·  ╱─·  ·  ·──·  ·  ·  ·  ·  ·──·  ·  ·      │
  │ ·  ·╱ ·  ·  ·  ╲·  ·  ·  ·  ·  ·  ╲·  ·  ·     │
  │   · ·  ·  ·     ·  ·  ·  ·  ·  ·    ·  ·  ·     │
  │ ·  · ·  ·  ·  ·  ·  ·        ·  ·  ·  ·  ·      │
  │        ┌──────────────────────────┐                │
  │ ·  ·   │  SHASHWAT JAIN           │  ·  ·  ·      │
  │   ·  · │  AI & Backend Engineer   │ ·  ·  ·       │
  │ ·  ·  ·│  [GH] [X] [LI]          │  ·  ·  ·      │
  │        └──────────────────────────┘                │
  │ ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·    │
  │   ·  ·  ·  ·──·  ·  ·──·  ·  ·  ·  ·  ·  ·      │
  │ ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·    │
  └────────────────────────────────────────────────────┘

  · = particles (lime-400 to cyan-400)
  ─╱╲ = connection lines (faint)
  Cursor creates a glowing void that attracts nearby particles
```

---

## Feature 1.3: Public API + Interactive Playground

### Concept
Expose your portfolio data as a real, documented REST API. Include an interactive playground on your site where visitors can make live API requests and see responses. This transforms your portfolio from a website into an engineering artifact.

### Architecture

```
┌──────────────────────────────────────────────────────┐
│  API Routes (app/api/v1/)                             │
│                                                       │
│  GET /api/v1/profile          → Your bio + links      │
│  GET /api/v1/experience       → All experiences       │
│  GET /api/v1/experience/:slug → Single experience     │
│  GET /api/v1/projects         → All projects          │
│  GET /api/v1/projects/:slug   → Single project        │
│  GET /api/v1/research         → All publications      │
│  GET /api/v1/research/:slug   → Single publication    │
│  GET /api/v1/thoughts         → All blog posts        │
│  GET /api/v1/thoughts/:slug   → Single blog post      │
│  GET /api/v1/skills           → Aggregated skills     │
│  GET /api/v1/stats            → Portfolio statistics   │
│                                                       │
│  Headers returned on every response:                  │
│    X-Powered-By: shashwat.dev                         │
│    X-API-Version: 1.0                                 │
│    X-Total-Count: {count} (on list endpoints)         │
│    Cache-Control: public, max-age=3600                │
│                                                       │
│  Query Parameters (list endpoints):                   │
│    ?featured=true     → Filter featured items         │
│    ?category=AI       → Filter by category            │
│    ?year=2025         → Filter by year                │
│    ?limit=10          → Limit results                 │
│    ?fields=name,tech  → Sparse fieldsets              │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Playground Page (app/api-playground/page.tsx)         │
│                                                       │
│  ┌─────────────────────┬────────────────────────┐    │
│  │  Endpoint Sidebar    │  Request/Response Pane  │    │
│  │                      │                         │    │
│  │  ▸ /profile          │  GET /api/v1/projects   │    │
│  │  ▸ /experience       │                         │    │
│  │  ▾ /projects ←active │  [Send Request]         │    │
│  │    └ /:slug          │                         │    │
│  │  ▸ /research         │  Status: 200 OK         │    │
│  │  ▸ /thoughts         │  Time: 23ms             │    │
│  │  ▸ /skills           │                         │    │
│  │  ▸ /stats            │  {                      │    │
│  │                      │    "data": [...],       │    │
│  │  Query Params:       │    "meta": {            │    │
│  │  ┌──────────────┐   │      "total": 3,        │    │
│  │  │featured: true│   │      "version": "1.0"   │    │
│  │  │year: ____    │   │    }                     │    │
│  │  │limit: ____   │   │  }                      │    │
│  │  └──────────────┘   │                         │    │
│  └─────────────────────┴────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Files to Create

#### API Route Files

##### 1. `lib/api/response.ts` — Shared API response helpers
```
Purpose: Standardized JSON response format for all endpoints.

Functions:
  - apiResponse(data, meta?): NextResponse
    - Wraps data in { data, meta: { total, version, timestamp } }
    - Adds custom headers (X-Powered-By, X-API-Version, Cache-Control)

  - apiError(message, status): NextResponse
    - Returns { error: { message, status, timestamp } }

  - parseQueryParams(searchParams): { featured, category, year, limit, fields }
    - Extracts and validates common query parameters

  - sparseFields(obj, fields): object
    - Returns only requested fields from an object
```

##### 2. `app/api/v1/profile/route.ts`
```
GET handler:
  Returns:
    {
      name: "Shashwat Jain",
      title: "AI & Backend Engineer",
      location: "...",
      bio: "...",
      links: {
        github: "...",
        twitter: "...",
        linkedin: "...",
        email: "...",
        resume: "..."
      },
      currentRole: { company, role, since },
      available: true
    }
```

##### 3. `app/api/v1/experience/route.ts`
```
GET handler:
  - Calls getAllExperiences()
  - Applies query filters (featured, type, year)
  - Returns array with metadata
```

##### 4. `app/api/v1/experience/[slug]/route.ts`
```
GET handler:
  - Calls getExperienceBySlug(slug)
  - Returns single experience or 404
```

##### 5. `app/api/v1/projects/route.ts`
```
GET handler:
  - Calls getAllProjects()
  - Applies query filters (featured, category, year, limit)
  - Returns array with metadata
```

##### 6. `app/api/v1/projects/[slug]/route.ts`
```
GET handler:
  - Calls getProjectBySlug(slug)
  - Returns single project or 404
```

##### 7. `app/api/v1/research/route.ts`
```
GET handler:
  - Calls getAllWork()
  - Applies query filters (year, featured)
  - Returns array with metadata
```

##### 8. `app/api/v1/research/[slug]/route.ts`
```
GET handler:
  - Calls getWorkBySlug(slug)
  - Returns single publication or 404
```

##### 9. `app/api/v1/thoughts/route.ts`
```
GET handler:
  - Calls getAllThoughts()
  - Applies query filters (category, year, limit)
  - Returns array (without full content, just metadata + excerpt)
```

##### 10. `app/api/v1/thoughts/[slug]/route.ts`
```
GET handler:
  - Calls getThoughtBySlug(slug)
  - Returns full thought with content
```

##### 11. `app/api/v1/skills/route.ts`
```
GET handler:
  - Aggregates ALL skills from:
    - Experience highlights/skills arrays
    - Project tech arrays
    - Research tags
  - Deduplicates and counts occurrences
  - Returns sorted by frequency:
    { skills: [{ name: "Python", count: 8, categories: ["AI", "Backend"] }, ...] }
```

##### 12. `app/api/v1/stats/route.ts`
```
GET handler:
  - Aggregates portfolio-wide statistics:
    {
      totalProjects: 3,
      totalExperiences: 2,
      totalPublications: 3,
      totalThoughts: 2,
      uniqueSkills: 25,
      yearsActive: 3,
      uniqueVenues: 3,
      categoriesCount: 5,
      lastUpdated: "2025-..."
    }
```

#### Playground Page Files

##### 13. `app/api-playground/page.tsx` — Server component
```
Purpose: Renders the playground page.

Features:
  - Page metadata (title: "API Playground | Shashwat Jain")
  - Renders <PlaygroundClient /> component
```

##### 14. `components/playground/playground-client.tsx` — Main playground
```
Purpose: Interactive API explorer.

State:
  - selectedEndpoint: string (current endpoint path)
  - queryParams: Record<string, string> (active query params)
  - response: { status, time, data, headers } | null
  - isLoading: boolean
  - history: { endpoint, params, status, time }[] (last 10 requests)

Layout:
  - Left sidebar (30% width):
    - Endpoint tree (collapsible groups)
    - Query parameter form (dynamic based on endpoint)
    - Request history list

  - Right pane (70% width):
    - Request URL display (copyable)
    - "Send Request" button
    - Response metadata (status code, response time, headers)
    - JSON response viewer with syntax highlighting
    - Copy response button

Endpoint Configuration:
  Define an array of endpoint configs:
  [
    {
      path: "/api/v1/profile",
      method: "GET",
      description: "Get profile information",
      params: []
    },
    {
      path: "/api/v1/projects",
      method: "GET",
      description: "List all projects",
      params: [
        { name: "featured", type: "boolean", description: "Filter featured" },
        { name: "category", type: "string", description: "Filter by category" },
        { name: "limit", type: "number", description: "Limit results" }
      ]
    },
    ...
  ]
```

##### 15. `components/playground/json-viewer.tsx` — JSON display
```
Purpose: Syntax-highlighted, collapsible JSON viewer.

Features:
  - Color-coded JSON (strings, numbers, booleans, nulls, keys)
  - Collapsible objects/arrays (click to toggle)
  - Line numbers
  - Copy button per section
  - Matches your dark theme color palette
  - Uses monospace font (same as code blocks)
```

##### 16. `components/playground/endpoint-tree.tsx` — Sidebar navigation
```
Purpose: Tree view of all API endpoints.

Features:
  - Grouped by resource (experience, projects, research, etc.)
  - Collapsible groups
  - Active endpoint highlighted
  - Method badge (GET in green)
  - Click to select and auto-populate
```

### Files to Modify

#### `lib/nav-context.tsx`
```
Add: API Playground to navigation items
  - Add to DEFAULT_NAV_ITEMS or create a new nav preset
  - Icon: Terminal or Code from lucide-react
  - Label: "API"
  - href: "/api-playground"
```

#### `components/home-client.tsx`
```
Add: A small "Explore the API" link in the Connect section
  - Or: Add as a nav item in the footer
```

### API Response Format Example
```json
// GET /api/v1/projects?featured=true

{
  "data": [
    {
      "slug": "neural-canvas",
      "name": "Neural Canvas",
      "shortDescription": "AI-powered design tool",
      "tech": ["Python", "PyTorch", "React", "FastAPI"],
      "category": "AI/ML",
      "date": "2025-01-15",
      "featured": true,
      "links": {
        "live": "https://...",
        "github": "https://...",
        "details": "/projects/neural-canvas"
      }
    }
  ],
  "meta": {
    "total": 1,
    "filtered": true,
    "filters": { "featured": true },
    "version": "1.0",
    "timestamp": "2025-07-20T10:30:00Z",
    "docs": "/api-playground"
  }
}
```

---

## Tier 1 Dependencies & Build Order

```
Step 1: Install all Tier 1 packages
  npm install ai @ai-sdk/openai @ai-sdk/react react-markdown \
    @react-three/fiber @react-three/drei three simplex-noise
  npm install -D @types/three

Step 2: Build API routes first (Feature 1.3)
  - Create lib/api/response.ts
  - Create all 12 API route files
  - Test each endpoint with curl
  → These are independent and can be built in parallel

Step 3: Build Particle Hero (Feature 1.2)
  - Create lib/hooks/use-reduced-motion.ts
  - Create components/hero/particle-field.tsx
  - Create components/hero/hero-content.tsx
  - Create components/hero/particle-hero.tsx
  - Modify components/home-client.tsx to use new hero
  → Can be built in parallel with API routes

Step 4: Build Chat Widget (Feature 1.1)
  - Create lib/ai/portfolio-rag.ts (uses the same utils as API routes)
  - Create app/api/chat/route.ts
  - Create components/chat/ files
  - Modify components/providers.tsx to include ChatWidget
  → Depends on API route utilities being in place

Step 5: Build API Playground (Feature 1.3 cont.)
  - Create app/api-playground/page.tsx
  - Create components/playground/ files
  - Add to navigation
  → Depends on API routes being complete

Step 6: Integration testing
  - Test chat widget with real questions
  - Test particle hero on mobile/low-power devices
  - Test API playground with all endpoints
  - Performance profiling (Lighthouse)
```

### Estimated New Files: 20-25
### Estimated Modified Files: 4-5
### New Dependencies: 7
