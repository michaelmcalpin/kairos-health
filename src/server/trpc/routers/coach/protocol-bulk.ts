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
  peptideCycles,
  mealPlans,
  workoutPrograms,
  workoutSessions,
  clientWorkoutAssignments,
  users,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCoachAccess, hasCategoryAccess } from "@/lib/access/coach-access";
import {
  summarizeProtocolChange,
  computeDiffBullets,
} from "@/lib/ai/protocol-summary";
import { dispatchNotification } from "@/lib/notifications/service";

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
  return cycles.map((c): GridRow => ({
    name: c.name,
    dosage: c.dosage ?? null,
    unit: c.unit ?? null,
    frequency: c.frequency ?? null,
    route: c.route ?? null,
    notes: c.notes ?? null,
  }));
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
  return {
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

async function findActiveWorkoutProgram(db: Database, clientId: string) {
  const assignment = await db.query.clientWorkoutAssignments.findFirst({
    where: and(
      eq(clientWorkoutAssignments.clientId, clientId),
      eq(clientWorkoutAssignments.status, "active"),
    ),
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
      name,
      category: "supplement" as const,
      dosage: toStr(r.dosage),
      unit: toStr(r.unit),
      frequency: toStr(r.frequency),
      route: null,
      timeOfDay: toStr(r.timeOfDay),
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
      name,
      peptideName: name,
      dosage: toStr(r.dosage),
      unit: toStr(r.unit),
      frequency: toStr(r.frequency),
      route: toStr(r.route),
      startDate: today,
      status: "active" as const,
      notes: toStr(r.notes),
    }));

  if (insertable.length > 0) {
    await db.insert(peptideCycles).values(insertable);
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
        category: mealCategoryFor(meal),
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

  const library = {
    libraryName: "Coach Nutrition Plan",
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

  const programId = active.programId;

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
): Promise<GridRow[]> {
  switch (type) {
    case "supplements":
      return applySupplements(db, coachId, clientId, rows);
    case "peptides":
      return applyPeptideCycles(db, coachId, clientId, rows);
    case "diet":
      return applyDiet(db, coachId, clientId, rows);
    case "workouts":
      return applyWorkouts(db, coachId, clientId, rows);
  }
}

// ─── Input schemas ──────────────────────────────────────────
const typeEnum = z.enum(["diet", "supplements", "peptides", "workouts"]);
const rowsInput = z.array(z.record(z.string(), z.unknown()));

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

      // b. Apply the replace; AFTER = the new stored rows.
      const after = await applyReplace(
        ctx.db,
        ctx.dbUserId,
        input.type,
        input.clientId,
        input.rows,
      );

      // c. Summarize the change (never throws; deterministic fallback).
      const client = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.clientId),
        columns: { firstName: true },
      });
      const { summary, bullets } = await summarizeProtocolChange({
        type: input.type,
        clientFirstName: client?.firstName ?? undefined,
        before,
        after,
      });

      // d. Alert the client — best-effort so a delivery hiccup can't fail publish.
      const label = NOTIF_LABELS[input.type];
      try {
        await dispatchNotification(ctx.db, {
          userId: input.clientId,
          category: "protocol_update",
          priority: "normal",
          title: `Your coach updated your ${label}`,
          body: summary,
          actionUrl: CLIENT_ROUTES[input.type],
          actionLabel: "View",
          metadata: { type: input.type, bullets, note: input.note ?? undefined },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Protocol Bulk Publish] notification dispatch failed", msg);
      }

      // e. Result.
      return { summary, bullets, itemCount: after.length };
    }),
});
