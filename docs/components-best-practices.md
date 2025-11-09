# Component modernisation plan (2025-11-08)

## Source guidance
- Next.js App Router navigation patterns emphasise deriving active state via `usePathname` inside dedicated client components to avoid duplicating router logic.
- Client Components should be limited to code that actually depends on browser-only APIs, while Server Components stay the default for structural wrappers.
- Third-party UI libraries without their own directive (Radix, Chart.js, `next-themes`) must be wrapped inside targeted client boundaries so that Server Components can consume them safely.

## Principles to enforce
1. **Isolate client-only logic.** Files that only render layout scaffolding stay as Server Components; hooks such as `usePathname`, `useTheme`, or Chart.js bindings live in dedicated client wrappers. (Sources: Next.js docs on Server vs Client Components; `use-client` directive best practices.)
2. **Single navigation hook.** All layouts and navigation widgets consume the same helper that normalises pathnames and exposes `isActive(href)` so that behaviour remains consistent across sidebar, public header, and mobile tabs. (Source: Next.js navigation best practices for `usePathname`.)
3. **Composable theming + metrics.** Providers such as `ThemeProvider` (next-themes) and future telemetry widgets (Web Vitals) remain thin client components injected into Server layouts.

## This iteration
- Create a `useActivePathname` helper under `components/navigation/` and migrate sidebar, public header, and mobile nav to it.
- Convert `RouteScaffold` into a Server Component because it only renders static scaffolding.
- Keep UI primitives (`Button`, `Card`, etc.) as Client Components to remain consumable inside other client-only widgets.
- Audit layout files to ensure type-safe props (`readonly` data bags) and consistent aria labelling as we touch them.
- Расширить библиотеку `components/ui` шадовскими примитивами (`Select`, `RadioGroup`, `Checkbox`) и в формах, отправляемых через Server Actions, синхронизировать их значения с нативными `<input type="hidden">`.
