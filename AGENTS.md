# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js 15 + TypeScript app using the App Router.

- `app/`: Route segments and API handlers (`app/api/**/route.ts`).
- `components/`: UI primitives in `components/ui/` and feature modules (for example `components/transactions/`, `components/dashboard/`).
- `contexts/`: Global state providers (notably `contexts/AppContext.tsx`).
- `lib/`: Shared server/client helpers (`auth`, `session`, Prisma client, utilities).
- `prisma/`: Database schema in `prisma/schema.prisma`.
- `public/`: Static assets.
- `docs/`: Architecture and API documentation.

Use the `@/*` path alias from `tsconfig.json` instead of deep relative imports.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server at `http://localhost:3000`.
- `npm run dev:turbo`: Start dev server with Turbopack.
- `npm run build`: Build production bundle.
- `npm run start`: Serve the production build.
- `npm run lint`: Run ESLint (`next/core-web-vitals` + TypeScript rules).
- `npm run db:generate`: Regenerate Prisma client.
- `npm run db:push`: Push schema changes to the database.
- `npm run db:studio`: Open Prisma Studio.

Use Node `>=20.18 <23` (`.nvmrc` is `22`).

## Coding Style & Naming Conventions
- TypeScript in strict mode; keep types explicit at API boundaries.
- Follow existing style: 2-space indentation, double quotes, no semicolons.
- Components: PascalCase (`TransactionsList.tsx`).
- Hooks/utilities: camelCase; hooks start with `use` (`use-form-close-guard.ts`).
- API route files are `route.ts` in lowercase folders.

Run `npm run lint` before opening a PR.

## Testing Guidelines
No automated test runner is currently configured in `package.json`.

- Minimum validation before PR: `npm run lint` and `npm run build`.
- For data/API changes, verify key flows manually (auth, CRUD, dashboard calculations).
- When adding tests, prefer colocated `*.test.ts(x)` files near the feature they cover.

## Commit & Pull Request Guidelines
Git history follows mostly Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `chore:` (sometimes scoped, e.g. `feat(transactions): ...`).

- Keep commit messages imperative and focused.
- PRs should include: concise summary, linked issue/task, verification steps, and screenshots/GIFs for UI changes.
- Call out schema or env var changes explicitly so reviewers can run `db:generate`/`db:push`.

## Security & Configuration Tips
- Never commit real secrets. Use `.env.local` for local credentials and keep `.env.example` updated.
- Required secrets include `DATABASE_URL`, `NEXTAUTH_SECRET`, OAuth keys, and `GEMINI_API_KEY`.
