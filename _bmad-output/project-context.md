---
project_name: 'ActionItemTranslator'
user_name: 'Kevin Johnson'
date: '2026-07-21'
sections_completed: ['technology_stack', 'language_specific', 'framework_specific', 'testing', 'code_quality', 'workflow', 'critical_rules']
status: 'complete'
rule_count: 29
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Next.js 14.2 (App Router), React 18.3, TypeScript 5.0 (`strict: true`)
- Dev server runs on port 3002 (`next dev -p 3002`), not the Next.js default 3000
- Tailwind CSS 3.4
- `openai` SDK 4.52 — used as a generic client pointed at OpenRouter (`baseURL: https://openrouter.ai/api/v1`), not OpenAI directly
- `@ducanh2912/next-pwa` 10.2.9 — PWA/service worker, disabled in development (`disable: process.env.NODE_ENV === 'development'`)
- Google Identity Services (loaded dynamically via `<script src="https://accounts.google.com/gsi/client">`) + Google Tasks REST API — no npm package, raw `fetch` + OAuth2 token client

## Critical Implementation Rules

### Language-Specific Rules

- `strict: true` TypeScript — no `any` escape hatches; keep types precise
- The `@/*` path alias exists in `tsconfig.json` but is **not used** anywhere — all imports are relative (`../lib/types`, `./types`). Keep using relative imports unless explicitly asked to migrate.
- Named exports for `lib/` functions; default export for React components
- Standard error-handling idiom, used consistently in client and server code: `e instanceof Error ? e.message : 'fallback message'` — reuse this, don't introduce a different error-normalization pattern
- `'use client'` at the top of any interactive component ([ActionItemCard.tsx](components/ActionItemCard.tsx), [app/page.tsx](app/page.tsx), etc.)
- Anything in `lib/` that touches `localStorage` must guard with `if (typeof window === 'undefined') return ...` since these modules are imported into client components but must not throw during SSR

### Framework-Specific Rules (Next.js / React)

- No global state library — top-level state lives in `useState` in [app/page.tsx](app/page.tsx), passed down as props (`ActionItem[]`, `onChange`/`onDelete` callbacks)
- Persistence is manual (load-on-mount, save-on-change via `lib/storage.ts`), not React Query/SWR
- Only one Next.js API route exists: [app/api/analyze/route.ts](app/api/analyze/route.ts) (POST only). Google Tasks/Calendar integrations call Google's APIs directly from the client via `fetch` — do not add a Next.js proxy route for those unless asked
- Icon components are small inline SVG functions defined locally in the file that uses them (e.g. `PencilIcon`) — there is no shared icon library; follow this pattern for new icons rather than introducing one
- Styling uses Tailwind arbitrary-value hex classes (`bg-[#7c3aed]`) rather than a theme config; `#7c3aed` (purple) is the app's consistent accent color

### Testing Rules

> No automated test suite exists. Do not assume a test run will catch regressions. When editing `app/api/analyze/route.ts`, `lib/googleTasks.ts`, or `lib/storage.ts`, manually re-verify against: truncated/malformed LLM JSON, an expired Google token, and pre-migration localStorage data — these are the app's only fragile, silently-failing paths. If adding automated tests, start with these three.

### Code Quality & Style Rules

- No ESLint/Prettier config exists — style consistency is informal, not tool-enforced
- Flat structure: `app/`, `components/`, `lib/` — no nested feature folders, no barrel/`index.ts` re-exports
- One component per file; file name matches the default export
- `lib/` modules and functions use camelCase (`googleTasks.ts`, `loadItems`)
- Component prop types are locally named `Props` per file, not exported/shared
- Observed style: 2-space indent, single quotes, semicolons, trailing commas in multiline literals — match this even though nothing enforces it
- Comments are sparse and reserved for non-obvious business rules or workarounds only (e.g. explaining why time is stashed in Google Tasks notes) — do not add JSDoc or per-function doc comments

### Development Workflow Rules

- Single-branch workflow: commits go directly to `main`, no feature branches or PR-based flow observed
- Commit messages: short imperative-mood summaries, no conventional-commit prefixes (`feat:`/`fix:`)
- Deployed via Vercel (`.vercel/` present); no CI config — nothing automated gates a deploy

### Critical Don't-Miss Rules

- The OpenRouter API key can arrive per-request via the `x-openrouter-key` header (client-supplied) or fall back to `OPENROUTER_API_KEY` env var — never log this value, and don't assume the env var is always the source
- No server-side auth/session — this is a single-user, client-trust-only app by design; don't add user accounts/auth without being asked
- Google auth uses the implicit OAuth2 token-client flow, token held only in an in-memory module variable — intentionally not persisted to localStorage/cookies
- Photos are downscaled client-side before upload (`maxDim: 1600, quality: 0.85` in [app/page.tsx](app/page.tsx)) — don't remove this or the vision API payload will bloat
- PWA config uses aggressive front-end-nav caching (`aggressiveFrontEndNavCaching: true`) — static asset changes may not show for returning users without a cache-busting deploy
- Don't introduce a server-side database — persistence is deliberately localStorage-only for this single-user app
- Don't add a global state library (Redux/Zustand/Context) — prop-drilling from `page.tsx` is the established, sufficient pattern at this scale
- Don't hardcode a different LLM provider/model — always respect the env-var-with-fallback pattern (`QWEN_MODEL`, `VISION_MODEL`)

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-07-21
