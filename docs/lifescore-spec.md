# Everist LifeScore™ — Design Spec

*Whole-person wellbeing tracking for the Everist mobile app (web parity to follow).*
*Status: approved design, pre-implementation. Author: Michael McAlpin.*

## Product construct

> Your health is more than your body. Everist LifeScore measures the five dimensions that shape how well you're actually living.

A single composite **LifeScore** (0–100) sits on top of five dimensions:

| Dimension | Scope | Source |
|---|---|---|
| **Body** | Physical health, fitness, sleep, nutrition | Auto-derived from health data (+ optional self-rating) |
| **Mind** | Mental and emotional health | Self-reported rating + journal |
| **Purpose** | Spiritual health, meaning, values | Self-reported rating + journal |
| **Relationships** | Family, friendships, intimacy, social connection | Self-reported rating + journal |
| **Work** | Career, fulfillment, stress, financial/work stability | Self-reported rating + journal |

Body is the bridge between the objective health tracking already in the app and the subjective life picture the other four dimensions capture.

## Scoring

- **Composite = weighted average of the five dimension scores**, each normalized to 0–100.
- **Coach-adjustable weights.** Default: equal (20% each) so the score is meaningful out of the box. A coach can retune weights per client (e.g. emphasize Work during a stressful season). Weights stored per client; sum normalized to 100%.
- **Body** is computed from existing data — sleep, activity/steps, HRV, readiness, adherence, nutrition — reusing the same signals as `getHealthScore` and `computeAdherence`. A daily self-rating is optional and lightly blended, never required.
- **Mind / Purpose / Relationships / Work** derive from the daily 1–5 dimension rating, nudged by journal sentiment/theme signals over the window.
- **Cadence: daily recompute, shown as a 7-day rolling average.** One rough day never crashes the headline number; the score reads as a trend, not a verdict.
- **Missing data is skipped, not zeroed.** A skipped dimension drops out of that day's average rather than scoring 0 — a low score must mean "reported low," never "didn't log."

### Current model (Nov 2026)

- **Core = 60% Physical + 40% Mental.**
- **Physical** = Health data 55%, Labs 20%, Medications 15%, Genetics follow-through 10% (`src/lib/lifescore/physical.ts`). Health data blends:
  - 30 target-bearing device measures from `src/lib/health/metrics.ts`;
  - **Workouts** (weight 2): 80% sessions a week over 4 weeks (4+ = full) + 20% variety (3+ kinds = full); sessions under 10 min don't count; only scored if the client recorded a workout in the last 60 days;
  - **Body goals** (weight 2 each): active weight / body-fat goals, using the latest device reading (90 days) or the goal's own value. With a target date: 30 at start → 100 on pace. Without: 50 at start → 100 reached. Maintain: 100 within 2%, 0 at 8%. Wrong direction drops toward 0;
  - **Nutrition** (protein 1.5, calories 1): vs the active meal plan's `macroTargets`, last 7 days, only days with food logged (in-app meal logs first, else Apple Health), needs 3+ logged days. Protein 100 at ≥90% of target, 0 at 50%; calories 100 within ±10%, 0 at ±35%.
  - All extras live in `src/lib/lifescore/extras.ts`.
- **Mental**: Mind / Purpose / Relationships / Work ratings. **Mindful minutes** add a bonus to Mind only (10+ min/day over 7 days = +6), never a penalty, and are excluded from the trend calculation.
- **AI context** gets every device measure (7- vs 30-day), recorded workouts (30 days), and the Core / Physical (parts, focus, strengths) / Mental / mindfulness lines.

## Data model

New tables / columns (Drizzle + a hand-authored idempotent migration, next in sequence after 0010):

```
lifescore_dimension_checkins
  id, clientId, date, dimension enum(body|mind|purpose|relationships|work),
  rating int (1..5, nullable = skipped), note text (nullable), createdAt

lifescore_journal_entries
  id, clientId, date, text, themes jsonb (AI-tagged [{dimension, theme, valence}]),
  createdAt
  -- raw text is client-private; see Privacy

lifescore_weights
  id, clientId, coachId (nullable), body int, mind int, purpose int,
  relationships int, work int, updatedAt
  -- default 20/20/20/20/20 if no row
```

Reused as-is: `dailyCheckins` (mood/energy/stress/sleepQuality/readiness feed Mind + Body), `dailyChecklistCompletions` + `computeAdherence` (Body + task reflection), `symptomAssessments`.

Task-miss reflection (from the earlier design) folds in: `taskMissReasons(clientId, date, itemKey, reason enum, note)` reading off `dailyChecklistCompletions`.

Baseline: rolling 30-day mean + stddev **per dimension**, computed on the fly. No stored baseline. Patterns compare each dimension to its own norm — a naturally low-key dimension isn't flagged; only a drop from that person's baseline is.

## Prompts (hybrid, wellbeing-coaching tone)

- Curated bank of ~30–40 questions, each tagged by dimension and trigger (low rating, high stress, missed tasks, positive streak, neutral).
- A rule selects the base prompt from today's ratings + adherence, weighting toward the dimension showing the clearest signal.
- Only when a clear data signal exists (e.g. Body sleep >1 stddev below baseline, or a dimension dropped sharply, or the same task missed 3+ times) does one server-side LLM call generate a tailored follow-up. Otherwise no AI call — most days are instant and free.
- **Tone: supportive, non-clinical, non-diagnostic.** No symptom scoring language, no "you may have X." A sustained very-low streak surfaces only a gentle, optional support-resources card — no crisis flow. All escalation copy lives in the reviewed curated bank, never model-generated.

## Placement (both entry points)

- **Quick check-in inside the existing daily flow**: five skippable dimension ratings + one adaptive follow-up. Low friction, tied to the habit that exists.
- **Fuller Journal section** as a sub-screen under Insight Sherpa (not a sixth bottom tab — the tab bar is full): LifeScore ring + dimension breakdown, entry history, life-balance view vs baseline, and the task-miss summary.

## Coach view + AI integration

- Coach client detail gets a **LifeScore snapshot**: composite, five dimension scores + trends, AI-derived dimension themes, and cross-dimension flags ("Work stress spilling into sleep and adherence").
- **Privacy: coach sees ratings, trends, and AI-derived themes — never the raw journal text.** Optional future toggle for a client to share full entries; default is themes-only. Relationships/Purpose entries are personal by design.
- `getClientContext` extends to include all five dimension trends vs baseline, recent journal themes, and top task-miss reasons — so both the AI chat and the AI reports reason about the *why* behind the numbers, not just the numbers.

## Branding

- **Everist LifeScore™** — ship with the ™ symbol now (no registration required to assert the mark). Pursue USPTO ® registration in parallel; not a launch blocker.
- Dimension names are the product vocabulary everywhere: Body, Mind, Purpose, Relationships, Work.

## Suggested build phasing

1. Schema + migration; `lifescore_weights` defaults; Body auto-derivation reusing existing health signals.
2. Daily check-in step (five ratings + skip) wired into the existing flow; write path.
3. Composite + per-dimension scoring service (7-day smoothed) + baseline computation.
4. Journal entry + AI theme-tagging; `taskMissReasons`.
5. Journal section under Insight Sherpa (ring, breakdown, balance-vs-baseline, history).
6. Curated prompt bank + rule selection; conditional LLM follow-up.
7. Coach LifeScore snapshot + `getClientContext` extension.
8. Web parity.

## Verification

- `npx tsc --noEmit` at web root and in `mobile/` after each phase.
- Scoring math unit-tested (weighting, smoothing, skip-not-zero, baseline).
- Manual check that a skipped dimension never lowers the score.
- Confirm coach surfaces expose themes only, never raw journal text.
