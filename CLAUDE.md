# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Architecture

This is a Next.js 15 portfolio/journal website using the App Router (`app/` directory).

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `components/` - React components (UI primitives in `components/ui/`)
- `lib/` - Utilities including `mdx-utils.ts` for blog post handling
- `content/thoughts/` - MDX blog posts with frontmatter

### Content System

Blog posts are MDX files in `content/thoughts/`. Each post requires frontmatter:

```yaml
---
title: "Post Title"
excerpt: "Description"
date: "YYYY-MM-DD"
readTime: "X min"
category: "Category"
---
```

`lib/mdx-utils.ts` handles reading, parsing, and listing posts. Posts are rendered via `next-mdx-remote` with custom MDX components defined in `app/thoughts/[slug]/page.tsx`.

### Styling

Uses Tailwind CSS 4 with CSS variables for theming (`--foreground`, `--background`, `--muted-foreground`, etc.). Dark mode is the default.

### Path Aliases

`@/*` maps to the root directory (e.g., `@/components`, `@/lib`).

### External Backend

The `/api/ingest` route proxies to a local Python backend at `http://127.0.0.1:8000` for URL ingestion.
