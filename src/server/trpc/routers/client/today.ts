/**
 * Client "Today" aggregator — powers the mobile Guided/Full home checklist.
 *
 * getToday returns one directive advice line plus today's action items grouped
 * by kind (appointments, peptides, supplements, medications, meals, workout,
 * fasting). Each item carries a `done` flag and enough to toggle it:
 *   - protocol items (supplements/medications) complete via adherence_logs
 *     (so the coach adherence dashboard stays accurate);
 *   - everything else (peptides/meals/workout/appointments) completes via the
 *     daily_checklist_completions table, keyed by a stable itemKey.
 *
 * "Today" is the client's local date, passed from the app (falls back to UTC).
 */

import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import {
  supplementProtocols,
  protocolItems,
  adherenceLogs,
  peptideCycles,
  mealPlans,
  clientWorkoutAssignments,
  workoutPrograms,
  workoutSessions,
  fastingProtocols,
  appointments,
  dailyChecklistCompletions,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

type TodayItem = {
  key: string;
  kind: "appointment" | "peptide" | "supplement" | "medication" | "meal" | "workout" | "fasting";
  title: string;
  subtitle: string | null;
  time: string | null;
  completable: boolean;
  done: boolean;
  protocolItemId: string | null;
};

type TodaySection = { key: string; label: string; items: TodayItem[] };

function joinParts(parts: Array<string | null | undefined>): string | null {
  const s = parts.map((p) => (p ?? "").toString().trim()).filter((p) => p.length > 0).join(" · ");
  return s.length > 0 ? s : null;
}

function readLibrary(stored: unknown): {
  planType: string | null;
  cyclePattern: string | null;
  meals: Array<Record<string, unknown>>;
} {
  if (Array.isArray(stored)) {
    return { planType: null, cyclePattern: null, meals: stored as Array<Record<string, unknown>> };
  }
  const lib = (stored ?? {}) as Record<string, unknown>;
  const meals = Array.isArray(lib.meals) ? (lib.meals as Array<Record<string, unknown>>) : [];
  return {
    planType: typeof lib.planType === "string" ? lib.planType : null,
    cyclePattern: typeof lib.cyclePattern === "string" ? lib.cyclePattern : null,
    meals,
  };
}

export const clientTodayRouter = router({
  getToday: clientProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const date = input?.date ?? new Date().toISOString().slice(0, 10);
      const dow = new Date(`${date}T00:00:00`).getDay(); // 0=Sun

      // Completion state ------------------------------------------------------
      const adherence = await safeQ(
        () =>
          ctx.db.query.adherenceLogs.findMany({
            where: and(eq(adherenceLogs.clientId, ctx.dbUserId), eq(adherenceLogs.date, date)),
          }),
        [] as Array<{ protocolItemId: string; takenAt: Date | null }>,
      );
      const takenItemIds = new Set(
        adherence.filter((a) => a.takenAt !== null).map((a) => a.protocolItemId),
      );
      const completions = await safeQ(
        () =>
          ctx.db.query.dailyChecklistCompletions.findMany({
            where: and(
              eq(dailyChecklistCompletions.clientId, ctx.dbUserId),
              eq(dailyChecklistCompletions.date, date),
            ),
          }),
        [] as Array<{ itemKey: string }>,
      );
      const doneKeys = new Set(completions.map((c) => c.itemKey));

      const sections: TodaySection[] = [];

      // Appointments (meetings) ----------------------------------------------
      const appts = await safeQ(
        () =>
          ctx.db.query.appointments.findMany({
            where: and(eq(appointments.clientId, ctx.dbUserId), eq(appointments.date, date)),
          }),
        [] as Array<Record<string, unknown>>,
      );
      const apptItems: TodayItem[] = appts
        .filter((a) => a.status !== "cancelled")
        .map((a) => {
          const key = `appt:${String(a.id)}`;
          return {
            key,
            kind: "appointment" as const,
            title: (a.sessionType as string) || "Appointment",
            subtitle: joinParts([
              a.coachName as string,
              a.meetingType as string,
            ]),
            time: (a.startTime as string) ?? null,
            completable: true,
            done: doneKeys.has(key),
            protocolItemId: null,
          };
        });
      if (apptItems.length > 0) sections.push({ key: "appointments", label: "Meetings", items: apptItems });

      // Peptides (peptideCycles) ---------------------------------------------
      const cycles = await safeQ(
        () =>
          ctx.db.query.peptideCycles.findMany({
            where: and(eq(peptideCycles.clientId, ctx.dbUserId), eq(peptideCycles.status, "active")),
            orderBy: desc(peptideCycles.startDate),
          }),
        [] as Array<Record<string, unknown>>,
      );
      const peptideItems: TodayItem[] = cycles.map((c) => {
        const key = `peptide:${String(c.id)}`;
        return {
          key,
          kind: "peptide" as const,
          title: (c.name as string) || (c.peptideName as string) || "Peptide",
          subtitle: joinParts([c.dosage as string, c.unit as string, c.frequency as string, c.route as string]),
          time: null,
          completable: true,
          done: doneKeys.has(key),
          protocolItemId: null,
        };
      });
      if (peptideItems.length > 0) sections.push({ key: "peptides", label: "Peptides", items: peptideItems });

      // Supplements + medications (protocolItems via adherence) --------------
      const protocol = await safeQ(
        () =>
          ctx.db.query.supplementProtocols.findFirst({
            where: and(
              eq(supplementProtocols.clientId, ctx.dbUserId),
              eq(supplementProtocols.status, "active"),
            ),
            orderBy: desc(supplementProtocols.createdAt),
          }),
        undefined,
      );
      let items: Array<Record<string, unknown>> = [];
      if (protocol) {
        items = await safeQ(
          () => ctx.db.query.protocolItems.findMany({ where: eq(protocolItems.protocolId, protocol.id) }),
          [] as Array<Record<string, unknown>>,
        );
      }
      const mkProtocolItem = (it: Record<string, unknown>, kind: "supplement" | "medication"): TodayItem => ({
        key: `pitem:${String(it.id)}`,
        kind,
        title: (it.name as string) || "Item",
        subtitle: joinParts([it.dosage as string, it.unit as string, it.frequency as string, it.timeOfDay as string]),
        time: (it.timeOfDay as string) ?? null,
        completable: true,
        done: takenItemIds.has(String(it.id)),
        protocolItemId: String(it.id),
      });
      const supplements = items.filter((it) => it.category === "supplement").map((it) => mkProtocolItem(it, "supplement"));
      const medications = items.filter((it) => it.category === "medication").map((it) => mkProtocolItem(it, "medication"));
      if (supplements.length > 0) sections.push({ key: "supplements", label: "Supplements", items: supplements });
      if (medications.length > 0) sections.push({ key: "medications", label: "Medications", items: medications });

      // Meals (active meal plan library) -------------------------------------
      const plan = await safeQ(
        () =>
          ctx.db.query.mealPlans.findFirst({
            where: and(eq(mealPlans.clientId, ctx.dbUserId), eq(mealPlans.status, "active")),
            orderBy: desc(mealPlans.createdAt),
          }),
        undefined,
      );
      const library = plan ? readLibrary(plan.meals as unknown) : { planType: null, cyclePattern: null, meals: [] };
      const mealItems: TodayItem[] = library.meals.map((m, i) => {
        const id = (m.id as string) ?? String(i);
        const key = `meal:${id}`;
        const kcal = m.calories != null ? `${m.calories} kcal` : null;
        return {
          key,
          kind: "meal" as const,
          title: (m.name as string) || (m.meal as string) || `Meal ${i + 1}`,
          subtitle: kcal,
          time: null,
          completable: true,
          done: doneKeys.has(key),
          protocolItemId: null,
        };
      });
      if (mealItems.length > 0) sections.push({ key: "meals", label: "Meals", items: mealItems });

      // Workout (today's session in the active program) ----------------------
      const assignment = await safeQ(
        () =>
          ctx.db.query.clientWorkoutAssignments.findFirst({
            where: and(
              eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
              eq(clientWorkoutAssignments.status, "active"),
            ),
          }),
        undefined,
      );
      if (assignment) {
        const sessionsList = await safeQ(
          () =>
            ctx.db.query.workoutSessions.findMany({
              where: eq(workoutSessions.programId, assignment.programId),
              orderBy: workoutSessions.dayNumber,
            }),
          [] as Array<Record<string, unknown>>,
        );
        if (sessionsList.length > 0) {
          let idx = 0;
          if (assignment.startDate) {
            const start = new Date(`${assignment.startDate}T00:00:00`).getTime();
            const days = Math.floor((new Date(`${date}T00:00:00`).getTime() - start) / 86400000);
            idx = ((days % sessionsList.length) + sessionsList.length) % sessionsList.length;
          }
          const session = sessionsList[idx];
          const exCount = Array.isArray(session.exercises) ? (session.exercises as unknown[]).length : 0;
          const key = `workout:${date}`;
          sections.push({
            key: "workout",
            label: "Workout",
            items: [
              {
                key,
                kind: "workout",
                title: (session.name as string) || `Day ${session.dayNumber ?? idx + 1}`,
                subtitle: exCount > 0 ? `${exCount} exercise${exCount === 1 ? "" : "s"}` : null,
                time: null,
                completable: true,
                done: doneKeys.has(key),
                protocolItemId: null,
              },
            ],
          });
        }
      }

      // Fasting window (informational) ---------------------------------------
      const fastingProto = await safeQ(
        () =>
          ctx.db.query.fastingProtocols.findFirst({
            where: and(
              eq(fastingProtocols.clientId, ctx.dbUserId),
              eq(fastingProtocols.status, "active"),
            ),
            orderBy: desc(fastingProtocols.createdAt),
          }),
        undefined,
      );
      let fastingWindow: string | null = null;
      if (fastingProto) {
        const activeDays = (fastingProto.activeDays as number[]) ?? [0, 1, 2, 3, 4, 5, 6];
        if (activeDays.includes(dow)) {
          const fs = fastingProto.feedingStartHour ?? 12;
          const fe = fastingProto.feedingEndHour ?? 20;
          const fmt = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
          fastingWindow = `${fmt(fs)}–${fmt(fe)}`;
          sections.push({
            key: "fasting",
            label: "Fasting",
            items: [
              {
                key: `fasting:${date}`,
                kind: "fasting",
                title: "Eating window",
                subtitle: fastingWindow,
                time: null,
                completable: false,
                done: false,
                protocolItemId: null,
              },
            ],
          });
        }
      }

      // Advice line (rule-based; coach override can be layered later) ---------
      const adviceParts: string[] = [];
      if (library.planType) adviceParts.push(`${library.planType} day.`);
      if (library.cyclePattern) adviceParts.push(library.cyclePattern + ".");
      if (assignment) adviceParts.push("Training day — bring intensity.");
      if (fastingWindow) adviceParts.push(`Eat between ${fastingWindow}.`);
      const advice =
        adviceParts.join(" ") ||
        (sections.length > 0
          ? "Here's your plan for today. Check things off as you go."
          : "Nothing scheduled yet today. Your coach will add to your plan.");

      const totalItems = sections.reduce((n, s) => n + s.items.filter((i) => i.completable).length, 0);
      const doneCount = sections.reduce(
        (n, s) => n + s.items.filter((i) => i.completable && i.done).length,
        0,
      );

      return { date, advice, sections, progress: { done: doneCount, total: totalItems } };
    }),

  toggleComplete: clientProcedure
    .input(
      z.object({
        date: z.string(),
        key: z.string(),
        done: z.boolean(),
        protocolItemId: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Protocol items → adherence_logs (keeps coach adherence accurate).
      if (input.protocolItemId) {
        const existing = await ctx.db.query.adherenceLogs.findFirst({
          where: and(
            eq(adherenceLogs.clientId, ctx.dbUserId),
            eq(adherenceLogs.protocolItemId, input.protocolItemId),
            eq(adherenceLogs.date, input.date),
          ),
        });
        if (existing) {
          await ctx.db
            .update(adherenceLogs)
            .set({ takenAt: input.done ? new Date() : null, skipped: false })
            .where(eq(adherenceLogs.id, existing.id));
        } else if (input.done) {
          await ctx.db.insert(adherenceLogs).values({
            clientId: ctx.dbUserId,
            protocolItemId: input.protocolItemId,
            date: input.date,
            takenAt: new Date(),
            skipped: false,
          });
        }
        return { ok: true };
      }

      // Everything else → daily_checklist_completions.
      const existing = await ctx.db.query.dailyChecklistCompletions.findFirst({
        where: and(
          eq(dailyChecklistCompletions.clientId, ctx.dbUserId),
          eq(dailyChecklistCompletions.date, input.date),
          eq(dailyChecklistCompletions.itemKey, input.key),
        ),
      });
      if (input.done && !existing) {
        await ctx.db.insert(dailyChecklistCompletions).values({
          clientId: ctx.dbUserId,
          date: input.date,
          itemKey: input.key,
        });
      } else if (!input.done && existing) {
        await ctx.db.delete(dailyChecklistCompletions).where(eq(dailyChecklistCompletions.id, existing.id));
      }
      return { ok: true };
    }),
});
