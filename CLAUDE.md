# Everist.ai — Project Memory

Longevity/health-coaching platform. Clients track health data (wearables, labs,
protocols); coaches manage clients, protocols, and scheduling. Owner: Michael
McAlpin (michael.mcalpin@gmail.com). Repo dir name is `kairos-app` (legacy name —
product is **Everist.ai**; "kairos-*" persists in Tailwind tokens and the Vercel
project). "Trainer" and "Coach" are the same role (UI says Coach; code/DB/routes
often say trainer).

## Architecture

**Web** (`/` repo root): Next.js 14.2.21, App Router, TypeScript, Tailwind
(dark theme, `kairos-*` design tokens), Clerk auth, tRPC, Drizzle ORM + Neon
Postgres. Deployed on Vercel (project `kairos-health`,
team_00eQYKMuvOsjYg31Kq0ri5HA, prj_YqKc3suFHvz9LgJRfNCpSfhPMbQX,
https://kairos-health.vercel.app). Auto-deploys from GitHub
`michaelmcalpin/kairos-health` main.

**Mobile** (`mobile/`): Expo SDK 54, React Native 0.81.5, Expo Router, Clerk
(clerk-expo), same tRPC backend. Bundle id `ai.everist.app`, scheme `everist://`.
Built via EAS (owner is on the FREE plan — monthly build limit; has hit it).
New Architecture is ON (required by Reanimated 4).

## Portals / roles
Roles: `client`, `trainer` (=coach), `company_admin`, `super_admin`.
Route groups: `src/app/(client)`, `(trainer)`, `(company)`, `(admin)`,
`(super-admin)`, `(auth)`. tRPC namespaces: `clientPortal.*`, `coach.*`,
`company.*`, `admin.*`, plus root `auth.*` and `feedback.*`.

## Key conventions & gotchas (LEARN THESE — repeatedly bit us)
- **tRPC is UNTYPED on mobile**: `createTRPCReact<any>()`. `as any` casts are
  normal in mobile screens. Web is typed.
- **getSettings returns NESTED shape**: `{ user, clientProfile, contactInfo,
  notificationPreferences }`. Reading flat fields (`data.firstName`) silently
  yields undefined → this caused "Demo User" and empty profile bugs MANY times.
- **Zod strips unknown input keys silently** → data-loss bugs that "succeed".
  Always match procedure input shapes exactly (bit us on check-in tabs, HRV
  `hrvScore` vs `hrv`, adherence `protocolItemId`/`skipped`).
- **Drizzle push, not migrate**: `drizzle-kit push --force` runs in the Vercel
  `build` script. Schema changes deploy automatically; no manual migration.
  (One latent drift: supplement_protocols migration says `coach_id`, schema says
  `trainer_id` — harmless under push, would break a migrate-based env.)
- **safeQ wrappers** swallow DB errors as empty results — masks outages as
  "no data". Present in several client/coach routers.
- **Alert priority enum** is `urgent | action | info` (NOT high/medium/low).
- **UTC "today" bug**: `new Date().toISOString().split('T')[0]` is wrong near
  midnight in western timezones. Use `T12:00:00` when parsing dates for
  day-of-week, and prefer local-date formatting.
- **TS target**: use `Array.from(new Set(...))` not `[...new Set()]`
  (downlevelIteration).
- **Anthropic model**: centralized in `src/lib/ai/model.ts`
  (`ANTHROPIC_MODEL`, override via env). The old `claude-sonnet-4-20250514` was
  retired and 404'd — never hardcode model strings again.
- **Middleware**: `src/middleware.ts` — API routes that do their own auth
  (`/api/trpc`, `/api/chat`, `/api/upload`, `/api/callbacks`, `/api/reports`,
  `/api/exercise`, `/api/meals`, `/api/clinical`) MUST be in `isPublicRoute` or
  Clerk redirects mobile Bearer requests to an HTML sign-in page.

## Apple Health / HealthKit (fully working as of commit 3bda98e)
- `mobile/lib/healthkit.ts` accesses `NativeModules.AppleHealthKit` DIRECTLY
  (the react-native-health JS wrapper's Constants are `undefined` under New Arch
  → "undefined is not an object"). Permission names are plain string literals.
- Native default units matter: BodyMass→pounds, BloodGlucose→mmol/L,
  HRV(SDNN)→seconds. Request explicit units; convert HRV s→ms.
- Sync: `mobile/hooks/useHealthSync.ts` → single bulk mutation
  `clientPortal.devices.healthkitSync` (7 categories, delete-then-insert dedup
  by source `apple_health`, 7-day window).
- Display tables: glucoseReadings, sleepSessions, heartRateReadings,
  hrvReadings, bloodPressureReadings, bodyMeasurements, activitySummaries.
- NOT yet captured (no backend tables): SpO2, temperature, respiratory rate,
  workouts, distance, VO2Max, mindfulness, cycle, nutrition.
- **Open request**: add opt-in AUTOMATIC daily Apple Health sync (currently
  manual "Sync Now" only). Needs `expo-background-task`/BGTaskScheduler +
  a HealthKit background-delivery observer + a settings toggle.

## Integrations (device OAuth)
Apple Health = native (no OAuth). OAuth 2.0 providers: Oura, Dexcom, WHOOP,
Fitbit, Withings, Hume — each needs `*_CLIENT_ID`/`*_CLIENT_SECRET` in Vercel +
redirect `https://kairos-health.vercel.app/api/callbacks/{provider}`. Garmin =
"Coming Soon" (OAuth 1.0a, not implemented). Setup steps documented in
`../Everist_Integration_Setup_Guide.docx`. As of last session, third-party OAuth
apps were NOT yet registered by the owner (still working on them).

## Feedback system (commit 30200db)
Floating "Send feedback" button on all web portals + mobile Settings screen.
Types: bug/feature/redesign. Logs user/role/page/time/platform, AI-summarizes
each. SuperAdmin → Feedback page (list, filters, status workflow, "AI
Consolidate"). Daily digest email cron `0 12 * * *` →
`src/app/api/cron/daily-feedback` (set `FEEDBACK_DIGEST_EMAIL` or defaults to
all super_admins). Shared AI logic in `src/lib/feedback/consolidate.ts`.

## Coach access sharing (commit ec7a739)
Clients grant coaches per-category access (diet/exercise/labs/healthData ×
none/read/write) via Care Team page (web + mobile). Primary coach = full access.
Coach-to-coach discussion threads per client (clients CANNOT read them —
enforced in tRPC). Access logic: `src/lib/access/coach-access.ts`.
NOTE (open): shared exercise/labs/healthData grants only surface diet/protocol +
discussion in the coach UI so far — the other shared categories still need
data views built.

## Scheduling
Coach availability: weekly hours + buffer + blocked dates + **per-day overrides**
+ **timezone** (`src/lib/timezone.ts`, DST-correct). Clients see slots in THEIR
local timezone. First-run trap fixed (must click Save to activate booking).
`src/components/scheduling/AvailabilityEditor.tsx` + `BookingForm.tsx`.

## Env vars needed (Vercel)
Set: `TOKEN_ENCRYPTION_KEY`, `RESEND_API_KEY` (regenerated), Clerk, Neon,
`ANTHROPIC_API_KEY`, `CRON_SECRET`. Optional: `FEEDBACK_DIGEST_EMAIL`,
`ANTHROPIC_MODEL`, device OAuth creds. Mobile Clerk key + API URL are baked into
`mobile/eas.json` build profiles (mobile/.env is gitignored).

## Working style with this owner
- Owner deploys via Vercel + Neon (no local dev/testing). Claude cannot push
  to GitHub from the sandbox (no creds) — owner runs `git push`.
- NEVER enter credentials/API keys into forms (security policy). Owner has
  pasted keys in chat before — warn + advise regeneration.
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Verify with `npx tsc --noEmit` both root and `mobile/` before committing;
  `next build` won't run in-sandbox (no SWC binary / no network) — that's fine.
  Ignore the 2 pre-existing `src/lib/storage.ts` @azure/storage-blob errors.
- Big multi-file work → parallel subagents with explicit FILE OWNERSHIP to avoid
  collisions. Watch for session-limit interruptions leaving partial state.

## QA
`qa-agents/` holds 3 reusable audit prompts (ios / client-web / coach-web) +
README. Re-run after each sprint and diff against `../QA_Findings_July2026.md`
(last full audit 2026-07-21). ~100 findings; sprint 30200db fixed the top tier.
Remaining backlog lives in that findings file (mediums/lows across all three
surfaces).

## Current state (end of last session)
All work pushed & deployed. Latest EAS iOS build submitted to TestFlight
(includes Apple Health pipeline, sample-data purge, real booking, Care Team,
feedback). Open threads: (1) automatic daily Apple Health sync — requested, not
built; (2) register third-party OAuth apps; (3) build shared-access data views
for exercise/labs/health; (4) remaining QA mediums/lows.
