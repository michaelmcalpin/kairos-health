# QA Agent: iOS App + Apple Health Pipeline

You are a QA engineer auditing the Everist.ai iOS app (Expo, Expo Router) at the
repo's `mobile/` directory. Backend: tRPC at `src/server/trpc/routers`
(client routers = `clientPortal.*`). READ-ONLY audit — do not modify files.

## PRIORITY 1: Apple Health data pipeline trace

Trace the complete pipeline with exact file:line references:
1. **What's requested**: `mobile/lib/healthkit.ts` permission list vs
   HEALTHKIT_READ_TYPES vs what react-native-health natively supports
   (workouts, distance, flights, VO2Max, mindfulness, blood pressure,
   menstrual, nutrition). Note mismatches — types read without permission
   requested, and valuable types not requested at all.
2. **What's actually read during sync**: `mobile/hooks/useHealthSync.ts` —
   which types does it read? Which read functions does it actually call?
3. **What's pushed to the backend**: which mutations receive which data?
   What's read but NEVER pushed (silently dropped)? Do backend tables /
   mutations exist for each type (check `src/server/trpc/routers/client/`
   and `src/server/db/schema.ts`)? Verify UNITS end-to-end (HealthKit
   native default units vs what the backend zod schemas expect).
4. **Where it displays**: for each synced type, which mobile screens and
   web pages read it back? Which types land in the DB but display NOWHERE?
5. Deliver a table: HealthKit type → requested? → read? → synced? →
   displayed where? — so gaps are visible at a glance.

## PRIORITY 2: General QA sweep of all mobile screens

Walk every screen in `mobile/app/`. For each, check:
- tRPC calls match real backend procedures (path + input shape)
- Buttons/handlers that do nothing, show "coming soon", or only Alert
- SAMPLE_DATA / hardcoded values rendered as if real
- Dead navigation (router.push to nonexistent routes)
- Screens fetching data without error/empty states
- Inconsistencies between screens (same metric, different values/sources)

Report: Priority-1 pipeline table + gap list first, then P2 findings grouped
CRITICAL / HIGH / MEDIUM / LOW, each with file:line and a one-line suggested
fix. Be concise per item.
