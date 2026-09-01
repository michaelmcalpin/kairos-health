/**
 * Coach Protocol Bulk-Edit Router
 *
 * Powers the trainer's "bulk-edit protocol" grid: a coach edits a client's
 * protocol as a grid of rows and publishes. On publish the stored protocol is
 * fully replaced, the change is AI-summarized for the client, and the client is
 * alerted through the notification system (all their enabled channels).
 *
 * Four protocol types, each mapped onto the storage the CLIENT app reads:
 *   - supplements → protocolItems (category "supplement") under the client's
 *                   ACTIVE supplementProtocols row.
 *   - peptides    → peptideCycles rows (status "active") — the shape the client
 *                   peptides page reads (client/peptides.ts).
 *   - diet        → mealPlans.meals (jsonb) shaped as the MealLibrary object the
 *                   client nutrition plan view reads (client/nutrition.ts
 *                   getActivePlan → { libraryName, dailyTargets, meals: [...] }).
 *   - workouts    → workoutSessions of the client's ACTIVE assigned program.
 *
 * Access is guarded by the shared coach-access model (primary relationship =
 * full write, mirroring coach/plans.ts verifyCoachClientAccess). diet /
 * supplements / peptides require "diet" access; workouts require "exercise".
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  supplementProtocols,
  protocolItems,
  adherenceLogs,
  peptideCycles,
  mealPlans,
  workoutPrograms,
  workoutSessions,
  clientWorkoutAssignments,
  users,
} from "@/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getCoachAccess, hasCategoryAccess } from "@/lib/access/coach-access";
import {
  summarizeProtocolChange,
  computeDiffBullets,
} from "@/lib/ai/protocol-summary";
import {
  dispatchNotification,
  getUserPreferences,
  getEnabledChannels,
} from "@/lib/notifications/service";
import { sendCoachEmail } from "@/lib/integrations/coach-email";

type Database = typeof import("@/server/db").db;

// ─── Types ──────────────────────────────────────────────────
type ProtocolType = "diet" | "supplements" | "peptides" | "workouts";
type GridRow = Record<string, string | number | null>;
type ColumnType = "text" | "number";
interface Column {
  key: string;
  label: string;
  type: ColumnType;
}

// ─── Access guard ───────────────────────────────────────────
// Mirrors coach/plans.ts: allow when the coach is the client's primary coach OR
// the client has granted the relevant category at the required level. diet /
// supplements / peptides map to the "diet" category; workouts map to "exercise".
async function verifyCoachClientAccess(
  db: Database,
  coachId: string,
  clientId: string,
  category: "diet" | "exercise",
  minLevel: "read" | "write",
  userRole?: string,
) {
  if (userRole === "super_admin") return;
  const access = await getCoachAccess(db, coachId, clientId);
  if (!access.hasAnyAccess || !hasCategoryAccess(access, category, minLevel)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active relationship or granted access to this client",
    });
  }
}

function accessCategoryFor(type: ProtocolType): "diet" | "exercise" {
  return type === "workouts" ? "exercise" : "diet";
}

// ─── Column definitions (stable per type, for the grid headers) ──────────────
const COLUMNS: Record<ProtocolType, Column[]> = {
  supplements: [
    { key: "name", label: "Name", type: "text" },
    { key: "dosage", label: "Dosage", type: "text" },
    { key: "unit", label: "Unit", type: "text" },
    { key: "frequency", label: "Frequency", type: "text" },
    { key: "timeOfDay", label: "Time of Day", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  // peptideCycles has no timeOfDay column — columns mirror that table's fields.
  peptides: [
    { key: "name", label: "Name", type: "text" },
    { key: "dosage", label: "Dosage", type: "text" },
    { key: "unit", label: "Unit", type: "text" },
    { key: "frequency", label: "Frequency", type: "text" },
    { key: "route", label: "Route", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  diet: [
    { key: "day", label: "Day", type: "text" },
    { key: "mealType", label: "Meal Type", type: "text" },
    { key: "meal", label: "Meal", type: "text" },
    { key: "items", label: "Items", type: "text" },
    { key: "calories", label: "Calories", type: "number" },
    { key: "protein", label: "Protein (g)", type: "number" },
    { key: "carbs", label: "Carbs (g)", type: "number" },
    { key: "fat", label: "Fat (g)", type: "number" },
  ],
  workouts: [
    { key: "day", label: "Day", type: "text" },
    { key: "exercise", label: "Exercise", type: "text" },
    { key: "muscleGroup", label: "Muscle Group", type: "text" },
    { key: "sets", label: "Sets", type: "number" },
    { key: "reps", label: "Reps", type: "text" },
    { key: "rest", label: "Rest (sec)", type: "number" },
    { key: "notes", label: "Notes", type: "text" },
  ],
};

// Human-friendly noun for notification titles, per type.
const NOTIF_LABELS: Record<ProtocolType, string> = {
  diet: "nutrition plan",
  supplements: "supplement protocol",
  peptides: "peptide protocol",
  workouts: "workout plan",
};

// Client-facing route per type.
const CLIENT_ROUTES: Record<ProtocolType, string> = {
  diet: "/nutrition",
  supplements: "/supplements",
  peptides: "/peptides",
  workouts: "/workouts",
};

// ─── Row-value coercion helpers ──────────────────────────────
function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

// Same as toStr but hard-caps the length so a long AI/pasted value can't overflow
// a narrow varchar column and 500 the whole publish. Trailing "…" signals a cut.
function toStrMax(v: unknown, max: number): string | null {
  const s = toStr(v);
  if (s === null) return null;
  return s.length > max ? s.slice(0, Math.max(1, max - 1)) + "…" : s;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// ─── Current-state readers (shared by getGrid and publish's BEFORE) ─────────

async function findActiveSupplementProtocol(db: Database, clientId: string) {
  return db.query.supplementProtocols.findFirst({
    where: and(
      eq(supplementProtocols.clientId, clientId),
      eq(supplementProtocols.status, "active"),
    ),
    orderBy: desc(supplementProtocols.createdAt),
  });
}

async function readSupplementRows(
  db: Database,
  clientId: string,
): Promise<GridRow[]> {
  const protocol = await findActiveSupplementProtocol(db, clientId);
  if (!protocol) return [];
  const items = await db.query.protocolItems.findMany({
    where: and(
      eq(protocolItems.protocolId, protocol.id),
      eq(protocolItems.category, "supplement"),
    ),
  });
  return items.map((it): GridRow => ({
    name: it.name,
    dosage: it.dosage ?? null,
    unit: it.unit ?? null,
    frequency: it.frequency ?? null,
    timeOfDay: it.timeOfDay ?? null,
    notes: it.coachNotes ?? null,
  }));
}

// Peptides live in the peptideCycles table (what the client peptides page reads),
// NOT in protocolItems. We surface the client's ACTIVE cycles as grid rows.
async function readPeptideRows(db: Database, clientId: string): Promise<GridRow[]> {
  const cycles = await db.query.peptideCycles.findMany({
    where: and(
      eq(peptideCycles.clientId, clientId),
      eq(peptideCycles.status, "active"),
    ),
    orderBy: desc(peptideCycles.startDate),
  });
  const rows: GridRow[] = cycles.map((c): GridRow => ({
    name: c.name,
    dosage: c.dosage ?? null,
    unit: c.unit ?? null,
    frequency: c.frequency ?? null,
    route: c.route ?? null,
    notes: c.notes ?? null,
  }));

  // Legacy peptides may still live in protocolItems (category peptide/injection)
  // from the older editor. Surface them here so the coach sees ALL peptides in
  // the grid; on publish they get consolidated into peptideCycles (see below).
  const legacy = await readLegacyPeptideItems(db, clientId);
  const have = new Set(rows.map((r) => String(r.name ?? "").trim().toLowerCase()));
  for (const it of legacy) {
    const nm = (it.name ?? "").trim().toLowerCase();
    if (nm && !have.has(nm)) {
      rows.push({
        name: it.name,
        dosage: it.dosage ?? null,
        unit: it.unit ?? null,
        frequency: it.frequency ?? null,
        route: it.route ?? null,
        notes: it.coachNotes ?? null,
      });
      have.add(nm);
    }
  }
  return rows;
}

// Active protocolItems of peptide/injection category under the client's active
// supplement protocol — the legacy peptide storage the bulk grid consolidates.
async function readLegacyPeptideItems(db: Database, clientId: string) {
  const protocol = await findActiveSupplementProtocol(db, clientId);
  if (!protocol) return [] as Array<typeof protocolItems.$inferSelect>;
  return db.query.protocolItems.findMany({
    where: and(
      eq(protocolItems.protocolId, protocol.id),
      inArray(protocolItems.category, ["peptide", "injection"]),
    ),
  });
}

async function findActiveMealPlan(db: Database, clientId: string) {
  return db.query.mealPlans.findFirst({
    where: and(eq(mealPlans.clientId, clientId), eq(mealPlans.status, "active")),
    orderBy: desc(mealPlans.createdAt),
  });
}

// Read a grid row out of one PlanMeal object (the shape the client nutrition
// plan view renders — client/nutrition.ts getActivePlan → MealLibrary.meals[]).
function planMealToRow(m: Record<string, unknown>): GridRow {
  const ingredients = Array.isArray(m.ingredients)
    ? (m.ingredients as Array<Record<string, unknown>>)
    : [];
  const items =
    ingredients.length > 0
      ? ingredients.map((ing) => toStr(ing.name)).filter(Boolean).join(", ")
      : toStr(m.items);
  // Meal type stored as the MealCategory enum; surface it title-cased.
  const cat = toStr(m.mealType) ?? toStr(m.category);
  const mealType = cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : null;
  return {
    day: toStr(m.day),
    mealType,
    // Preserve the coach's free-text meal label (stored as the meal `name`).
    meal: toStr(m.name) ?? toStr(m.meal),
    items: items && items.length > 0 ? items : null,
    calories: toNum(m.calories),
    protein: toNum(m.proteinG ?? m.protein),
    carbs: toNum(m.carbsG ?? m.carbs),
    fat: toNum(m.fatG ?? m.fat),
  };
}

async function readDietRows(db: Database, clientId: string): Promise<GridRow[]> {
  const plan = await findActiveMealPlan(db, clientId);
  if (!plan) return [];
  const stored = plan.meals as unknown;
  // Current shape: a MealLibrary object with a `meals` array. Legacy plans may
  // have stored a bare array — support both so the round-trip stays stable.
  const meals: unknown[] = Array.isArray(stored)
    ? stored
    : Array.isArray((stored as Record<string, unknown> | null)?.meals)
      ? ((stored as Record<string, unknown>).meals as unknown[])
      : [];
  return meals.map((m): GridRow => planMealToRow((m ?? {}) as Record<string, unknown>));
}

// Plan-level metadata for a DIET plan. Fasts, flushes, no-carb, high-protein,
// pulses, etc. are all just dietary plans with a TYPE and a start/stop window
// (and optionally a cycling pattern like "3 days on / 2 days off"). We store
// these on the meal-plan library object (the `meals` jsonb) so no migration is
// needed and the client nutrition view can read them alongside the meals.
export interface PlanMeta {
  planType: string | null;
  startDate: string | null;
  endDate: string | null;
  cyclePattern: string | null;
}

const EMPTY_PLAN_META: PlanMeta = {
  planType: null,
  startDate: null,
  endDate: null,
  cyclePattern: null,
};

function readLibraryMeta(stored: unknown): PlanMeta {
  const lib =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  return {
    planType: toStrMax(lib.planType, 80),
    startDate: toStrMax(lib.startDate, 40),
    endDate: toStrMax(lib.endDate, 40),
    cyclePattern: toStrMax(lib.cyclePattern, 120),
  };
}

async function readDietMeta(db: Database, clientId: string): Promise<PlanMeta> {
  const plan = await findActiveMealPlan(db, clientId);
  if (!plan) return { ...EMPTY_PLAN_META };
  return readLibraryMeta(plan.meals as unknown);
}

async function findActiveWorkoutProgram(db: Database, clientId: string) {
  const assignment = await db.query.clientWorkoutAssignments.findFirst({
    where: and(
      eq(clientWorkoutAssignments.clientId, clientId),
      eq(clientWorkoutAssignments.status, "active"),
    ),
    // Deterministic: newest assignment wins when more than one is active, so
    // the coach editor and the client reader always resolve the SAME program.
    orderBy: desc(clientWorkoutAssignments.startDate),
  });
  if (!assignment) return null;
  return { assignment, programId: assignment.programId };
}

async function readWorkoutRows(db: Database, clientId: string): Promise<GridRow[]> {
  const active = await findActiveWorkoutProgram(db, clientId);
  if (!active) return [];
  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.programId, active.programId),
    orderBy: workoutSessions.dayNumber,
  });
  const rows: GridRow[] = [];
  for (const s of sessions) {
    const day = s.name ?? `Day ${s.dayNumber}`;
    const exercises = (s.exercises ?? []) as Array<Record<string, unknown>>;
    for (const e of exercises) {
      rows.push({
        day,
        exercise: toStr(e.name),
        muscleGroup: toStr(e.muscleGroup),
        sets: toNum(e.sets),
        reps: toStr(e.reps),
        rest: toNum(e.restSeconds),
        notes: toStr(e.notes),
      });
    }
  }
  return rows;
}

async function readGrid(
  db: Database,
  type: ProtocolType,
  clientId: string,
): Promise<GridRow[]> {
  switch (type) {
    case "supplements":
      return readSupplementRows(db, clientId);
    case "peptides":
      return readPeptideRows(db, clientId);
    case "diet":
      return readDietRows(db, clientId);
    case "workouts":
      return readWorkoutRows(db, clientId);
  }
}

// ─── Replace (apply) writers ─────────────────────────────────
// No transactions are used elsewhere in this codebase (see coach/plans.ts), so
// each replace is a sequential delete-then-insert, matching that convention.

async function applySupplements(
  db: Database,
  coachId: string,
  clientId: string,
  rows: Array<Record<string, unknown>>,
): Promise<GridRow[]> {
  let protocol = await findActiveSupplementProtocol(db, clientId);
  if (!protocol) {
    const [created] = await db
      .insert(supplementProtocols)
      .values({ clientId, trainerId: coachId, status: "active", isAiGenerated: false })
      .returning();
    protocol = created;
  }

  // Only replace supplement items — leave any other-category items untouched.
  await db
    .delete(protocolItems)
    .where(
      and(
        eq(protocolItems.protocolId, protocol.id),
        eq(protocolItems.category, "supplement"),
      ),
    );

  const insertable = rows
    .map((r) => ({ r, name: toStr(r.name) }))
    .filter((x): x is { r: Record<string, unknown>; name: string } => x.name !== null)
    .map(({ r, name }) => ({
      protocolId: protocol!.id,
      name: toStrMax(name, 255) ?? name,
      category: "supplement" as const,
      dosage: toStrMax(r.dosage, 100),
      unit: toStrMax(r.unit, 50),
      frequency: toStrMax(r.frequency, 50),
      route: null,
      timeOfDay: toStrMax(r.timeOfDay, 50),
      coachNotes: toStr(r.notes),
    }));

  if (insertable.length > 0) {
    await db.insert(protocolItems).values(insertable);
  }

  return readSupplementRows(db, clientId);
}

// Peptides replace the client's ACTIVE peptideCycles rows (the client peptides
// page reads peptideCycles, not protocolItems). Delete active cycles, then
// insert one active cycle per named row starting today.
async function applyPeptideCycles(
  db: Database,
  coachId: string,
  clientId: string,
  rows: Array<Record<string, unknown>>,
): Promise<GridRow[]> {
  void coachId; // peptideCycles is keyed by clientId only.
  await db
    .delete(peptideCycles)
    .where(
      and(
        eq(peptideCycles.clientId, clientId),
        eq(peptideCycles.status, "active"),
      ),
    );

  const today = new Date().toISOString().slice(0, 10);
  const insertable = rows
    .map((r) => ({ r, name: toStr(r.name) }))
    .filter((x): x is { r: Record<string, unknown>; name: string } => x.name !== null)
    .map(({ r, name }) => ({
      clientId,
      name: toStrMax(name, 255) ?? name,
      peptideName: toStrMax(name, 255) ?? name,
      dosage: toStrMax(r.dosage, 100),
      unit: toStrMax(r.unit, 50),
      frequency: toStrMax(r.frequency, 100),
      route: toStrMax(r.route, 50),
      startDate: today,
      status: "active" as const,
      notes: toStr(r.notes),
    }));

  if (insertable.length > 0) {
    await db.insert(peptideCycles).values(insertable);
  }

  // Consolidate: legacy protocolItems peptides were surfaced in the grid (see
  // readPeptideRows), so they're now represented in peptideCycles. Remove them
  // from protocolItems (and their adherence logs) so peptideCycles is the single
  // source and protocolItems-based views stop showing stale/duplicate peptides.
  const legacy = await readLegacyPeptideItems(db, clientId);
  if (legacy.length > 0) {
    const ids = legacy.map((l) => l.id);
    await db.delete(adherenceLogs).where(inArray(adherenceLogs.protocolItemId, ids));
    await db.delete(protocolItems).where(inArray(protocolItems.id, ids));
  }

  return readPeptideRows(db, clientId);
}

// Map a free-text meal label to the MealCategory enum the client plan view
// groups by. Best-effort contains-match; default "snack" so nothing is dropped.
function mealCategoryFor(label: string): "breakfast" | "lunch" | "dinner" | "snack" {
  const l = label.toLowerCase();
  if (l.includes("breakfast")) return "breakfast";
  if (l.includes("lunch")) return "lunch";
  if (l.includes("dinner")) return "dinner";
  return "snack";
}

async function applyDiet(
  db: Database,
  coachId: string,
  clientId: string,
  rows: Array<Record<string, unknown>>,
  planMeta?: PlanMeta,
): Promise<GridRow[]> {
  // Build PlanMeal objects in the exact shape the client nutrition plan view
  // reads (MealLibrary.meals[] — see client/nutrition.ts getActivePlan). The
  // coach's free-text meal label is preserved as the meal `name`; the grid's
  // free-text `items` becomes the ingredient list.
  const planMeals = rows
    .map((r) => ({ r, meal: toStr(r.meal) }))
    .filter((x): x is { r: Record<string, unknown>; meal: string } => x.meal !== null)
    .map(({ r, meal }) => {
      const items = toStr(r.items);
      const ingredients = items
        ? items
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((name) => ({ name, amount: "", category: "other" }))
        : [];
      return {
        id: crypto.randomUUID(),
        name: meal,
        // Meal type comes from the explicit column when set, else inferred from
        // the meal label. `day` schedules the meal (e.g. "Monday", "Day 1").
        category: mealCategoryFor(toStr(r.mealType) ?? meal),
        day: toStr(r.day),
        prepTimeMinutes: 0,
        calories: toNum(r.calories) ?? 0,
        proteinG: toNum(r.protein) ?? 0,
        carbsG: toNum(r.carbs) ?? 0,
        fatG: toNum(r.fat) ?? 0,
        ingredients,
        instructions: "",
        tags: [] as string[],
        rationale: "",
      };
    });

  const meta = planMeta ?? EMPTY_PLAN_META;
  const library = {
    libraryName: toStr(meta.planType) ?? "Coach Nutrition Plan",
    planType: meta.planType,
    startDate: meta.startDate,
    endDate: meta.endDate,
    cyclePattern: meta.cyclePattern,
    description: "",
    dailyTargets: {
      calories: planMeals.reduce((s, m) => s + m.calories, 0),
      proteinG: planMeals.reduce((s, m) => s + m.proteinG, 0),
      carbsG: planMeals.reduce((s, m) => s + m.carbsG, 0),
      fatG: planMeals.reduce((s, m) => s + m.fatG, 0),
      fiberG: 0,
    },
    meals: planMeals,
  };

  const plan = await findActiveMealPlan(db, clientId);
  if (plan) {
    await db
      .update(mealPlans)
      .set({ meals: library as unknown as Record<string, unknown> })
      .where(eq(mealPlans.id, plan.id));
  } else {
    await db.insert(mealPlans).values({
      trainerId: coachId,
      clientId,
      name: "Nutrition Plan",
      meals: library as unknown as Record<string, unknown>,
      isAiGenerated: false,
      status: "active",
    });
  }

  return readDietRows(db, clientId);
}

async function applyWorkouts(
  db: Database,
  coachId: string,
  clientId: string,
  rows: Array<Record<string, unknown>>,
): Promise<GridRow[]> {
  let active = await findActiveWorkoutProgram(db, clientId);
  if (!active) {
    const [program] = await db
      .insert(workoutPrograms)
      .values({ trainerId: coachId, name: "Training Program", isAiGenerated: false })
      .returning();
    const today = new Date().toISOString().slice(0, 10);
    const [assignment] = await db
      .insert(clientWorkoutAssignments)
      .values({ clientId, programId: program.id, startDate: today, status: "active" })
      .returning();
    active = { assignment, programId: program.id };
  }

  let programId = active.programId;

  // Workout programs can be shared templates (one program assigned to many
  // clients via clientWorkoutAssignments). Editing sessions in place would
  // overwrite every other client on that template. If this program is assigned
  // to more than one client, fork it into a fresh per-client copy and repoint
  // THIS client's active assignment to the copy before rewriting sessions.
  const assignmentsForProgram = await db.query.clientWorkoutAssignments.findMany({
    where: eq(clientWorkoutAssignments.programId, programId),
  });
  if (assignmentsForProgram.length > 1) {
    const src = await db.query.workoutPrograms.findFirst({
      where: eq(workoutPrograms.id, programId),
    });
    const [copy] = await db
      .insert(workoutPrograms)
      .values({
        trainerId: coachId,
        name: src?.name ?? "Training Program",
        description: src?.description ?? null,
        durationWeeks: src?.durationWeeks ?? null,
        isAiGenerated: false,
      })
      .returning();
    await db
      .update(clientWorkoutAssignments)
      .set({ programId: copy.id })
      .where(eq(clientWorkoutAssignments.id, active.assignment.id));
    programId = copy.id;
  }

  // Group rows by day (preserving first-seen order); one session per distinct day.
  const dayOrder: string[] = [];
  const byDay = new Map<string, Array<Record<string, unknown>>>();
  for (const r of rows) {
    const day = toStr(r.day);
    const exercise = toStr(r.exercise);
    if (day === null || exercise === null) continue; // day + exercise required
    if (!byDay.has(day)) {
      byDay.set(day, []);
      dayOrder.push(day);
    }
    byDay.get(day)!.push(r);
  }

  // Replace all sessions for this program.
  await db.delete(workoutSessions).where(eq(workoutSessions.programId, programId));

  if (dayOrder.length > 0) {
    await db.insert(workoutSessions).values(
      dayOrder.map((day, i) => ({
        programId,
        dayNumber: i + 1,
        name: day,
        exercises: byDay.get(day)!.map((e) => ({
          exerciseId: "",
          name: toStr(e.exercise) ?? "",
          muscleGroup: toStr(e.muscleGroup) ?? "",
          sets: toNum(e.sets) ?? 0,
          reps: toStr(e.reps) ?? "",
          tempo: "",
          restSeconds: toNum(e.rest) ?? 0,
          notes: toStr(e.notes) ?? "",
        })),
      })) as unknown as (typeof workoutSessions.$inferInsert)[],
    );
  }

  return readWorkoutRows(db, clientId);
}

async function applyReplace(
  db: Database,
  coachId: string,
  type: ProtocolType,
  clientId: string,
  rows: Array<Record<string, unknown>>,
  planMeta?: PlanMeta,
): Promise<GridRow[]> {
  switch (type) {
    case "supplements":
      return applySupplements(db, coachId, clientId, rows);
    case "peptides":
      return applyPeptideCycles(db, coachId, clientId, rows);
    case "diet":
      return applyDiet(db, coachId, clientId, rows, planMeta);
    case "workouts":
      return applyWorkouts(db, coachId, clientId, rows);
  }
}

// ─── Input schemas ──────────────────────────────────────────
const typeEnum = z.enum(["diet", "supplements", "peptides", "workouts"]);
const rowsInput = z.array(z.record(z.string(), z.unknown()));
// Diet plan-level metadata (fast / flush / no-carb / high-protein / pulse etc.
// are dietary plans distinguished by type + a start/stop window + cycle pattern).
const planInput = z
  .object({
    planType: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    cyclePattern: z.string().nullish(),
  })
  .optional();

function normalizePlanMeta(input: z.infer<typeof planInput>): PlanMeta | undefined {
  if (!input) return undefined;
  return {
    planType: toStrMax(input.planType, 80),
    startDate: toStrMax(input.startDate, 40),
    endDate: toStrMax(input.endDate, 40),
    cyclePattern: toStrMax(input.cyclePattern, 120),
  };
}

// ─── Router ─────────────────────────────────────────────────
export const coachProtocolBulkRouter = router({
  /**
   * Return the stable column headers + the CURRENT rows for a protocol type,
   * so the trainer's grid can render. Requires read access.
   */
  getGrid: trainerProcedure
    .input(z.object({ clientId: z.string(), type: typeEnum }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientAccess(
        ctx.db,
        ctx.dbUserId,
        input.clientId,
        accessCategoryFor(input.type),
        "read",
        ctx.userRole,
      );

      const rows = await readGrid(ctx.db, input.type, input.clientId);
      return {
        type: input.type,
        columns: COLUMNS[input.type],
        rows,
        // Diet plans carry plan-level metadata (type + timeframe + cycle); other
        // types have none.
        planMeta:
          input.type === "diet"
            ? await readDietMeta(ctx.db, input.clientId)
            : null,
      };
    }),

  /**
   * Deterministic (no AI) diff of the CURRENT stored rows vs the trainer's
   * proposed rows, for a pre-publish preview. Requires write access.
   */
  previewDiff: trainerProcedure
    .input(z.object({ clientId: z.string(), type: typeEnum, rows: rowsInput }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(
        ctx.db,
        ctx.dbUserId,
        input.clientId,
        accessCategoryFor(input.type),
        "write",
        ctx.userRole,
      );

      const before = await readGrid(ctx.db, input.type, input.clientId);
      const bullets = computeDiffBullets(before, input.rows);
      return { bullets };
    }),

  /**
   * Replace the stored protocol with the trainer's rows, AI-summarize the
   * change for the client, and alert the client through the notification
   * system. Requires write access.
   */
  publish: trainerProcedure
    .input(
      z.object({
        clientId: z.string(),
        type: typeEnum,
        rows: rowsInput,
        note: z.string().optional(),
        plan: planInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(
        ctx.db,
        ctx.dbUserId,
        input.clientId,
        accessCategoryFor(input.type),
        "write",
        ctx.userRole,
      );

      // a. BEFORE — current stored rows (same shape getGrid returns).
      const before = await readGrid(ctx.db, input.type, input.clientId);

      // b. Apply the replace inside a transaction so a mid-write failure rolls
      // back instead of leaving the client's protocol partially wiped.
      // AFTER = the new stored rows.
      const after = await ctx.db.transaction(async (tx) =>
        applyReplace(
          tx as unknown as Database,
          ctx.dbUserId,
          input.type,
          input.clientId,
          input.rows,
          normalizePlanMeta(input.plan),
        ),
      );

      // c. Summarize the change (never throws; deterministic fallback).
      const client = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.clientId),
        columns: { firstName: true, email: true },
      });
      const { summary, bullets } = await summarizeProtocolChange({
        type: input.type,
        clientFirstName: client?.firstName ?? undefined,
        before,
        after,
      });

      // d. Alert the client — best-effort so a delivery hiccup can't fail publish.
      // The EMAIL channel is handled separately below via sendCoachEmail (so the
      // update lands in the client's inbox FROM the coach's own Gmail when
      // connected). We therefore EXCLUDE "email" from the dispatch channels here
      // — in-app / push / sms still fire per the client's prefs — to avoid a
      // duplicate system email.
      const label = NOTIF_LABELS[input.type];
      try {
        const clientPrefs = await getUserPreferences(ctx.db, input.clientId);
        const nonEmailChannels = getEnabledChannels(
          clientPrefs,
          "protocol_update",
          "high",
        ).filter((c) => c !== "email");
        await dispatchNotification(ctx.db, {
          userId: input.clientId,
          category: "protocol_update",
          // "high" so SMS is reachable for clients who opt in (SMS only fires
          // at high/urgent); in-app/push still respect their prefs.
          priority: "high",
          title: `Your coach updated your ${label}`,
          body: summary,
          actionUrl: CLIENT_ROUTES[input.type],
          actionLabel: "View",
          metadata: { type: input.type, bullets, note: input.note ?? undefined },
          channelOverride: nonEmailChannels.length > 0 ? nonEmailChannels : ["in_app"],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Protocol Bulk Publish] notification dispatch failed", msg);
      }

      // d.2 Client email — sent AS THE COACH (from their Gmail when connected +
      // scoped), else via the system sender. Best-effort; publish must succeed.
      if (client?.email) {
        try {
          const coach = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.dbUserId),
            columns: { firstName: true, lastName: true },
          });
          const coachName =
            [coach?.firstName, coach?.lastName].filter(Boolean).join(" ") || "Your coach";
          const esc = (s: string) =>
            s
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
          const bulletsHtml =
            bullets.length > 0
              ? `<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
              : "";
          const html = `<p>${esc(summary)}</p>${bulletsHtml}`;
          await sendCoachEmail(ctx.db, ctx.dbUserId, {
            to: client.email,
            subject: `Your coach updated your ${label}`,
            html,
            fromName: coachName,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[Protocol Bulk Publish] client send-as-coach email failed", msg);
        }
      }

      // e. Result.
      return { summary, bullets, itemCount: after.length };
    }),
});
