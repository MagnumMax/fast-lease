# Fast Lease — Next.js Migration

This repository migrates the `/beta` HTML prototype to a modern stack built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example` and provide Supabase credentials once they are issued.
3. (Optional) Start the local Supabase stack:
   ```bash
   npm run supabase:start
   ```
4. Run the app in development mode:
   ```bash
   npm run dev
   ```

## Tech Stack

- Next.js 15 (App Router, React Server Components)
- TypeScript with strict settings
- Tailwind CSS 3 + custom Linear-inspired design tokens
- shadcn/ui component library (initialised via custom configuration)
- Supabase client SDK + Supabase CLI (Postgres, Auth, Storage)

## Project Structure Highlights

- `app/(public|auth|dashboard)/*` — route groups aligned with product areas. Every page currently renders a `RouteScaffold` placeholder referencing the source HTML in `/beta`.
- `components/placeholders/route-scaffold.tsx` — temporary helper to keep scaffolding consistent while features are migrated.
- `components/providers/theme-provider.tsx` — wraps the app with `next-themes` for automatic light/dark theme switching (dark by default).
- `lib/supabase/*` — typed helpers for browser/server/service Supabase clients.
- `lib/legacy/shared.ts` — original prototype logic, kept as a reference for the migration (excluded from lint/type checks).
- `public/assets/` — static assets copied from `beta/assets/images` for reuse in the React implementation.
- `supabase/config.toml` — Supabase CLI configuration with environment-driven URLs.

## Worklog & Next Steps

- Track roadmap progress in [`TODO.md`](./TODO.md). Stage 2 is complete: Linear design tokens are ported, shadcn/ui primitives are ready, and shared layouts (public/auth/dashboard) mirror the `/beta` structure.
- Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional service keys) already live in `.env.local`. Connection sanity checks succeed.
- Use `npm run lint` and `npm run typecheck` before committing feature work.
- Upcoming focus: Stage 3 — translate the prototype data layer into Supabase migrations, schemas, and seed data.

Refer to `.trae/documents/*` for architecture, design, and product specifications. The `/beta` directory remains the functional specification and must be mirrored exactly during implementation.
