/**
 * Coach Program Templates Router
 *
 * Reusable EXERCISE and DIET templates a coach builds once — manually, by CSV
 * import, or by AI reading a document — and applies to any client. Applying a
 * template OVERWRITES the selected client's live exercise or diet.
 *
 * Templates reuse the exact same grid shape (protocol-bulk COLUMNS) and the same
 * overwrite writers (applyReplace) as the per-client bulk editor, so a template
 * is built and applied identically to editing an individual client. The only
 * differences: a template isn't bound to a client (rows live in the
 * program_templates table), and "apply" fans the same overwrite out to one or
 * many clients and notifies each of them.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import { programTemplates } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCoachAccess, hasCategoryAccess } from "@/lib/access/coach-access";
import {
  COLUMNS,
  applyReplace,
  readGrid,
  notifyClientProtocolChange,
  type ProtocolType,
} from "./protocol-bulk";

type Database = typeof import("@/server/db").db;
type GridRow = Record<string, string | number | null>;
type PlanMeta = {
  planType: string | null;
  startDate: string | null;
  endDate: string | null;
  cyclePattern: string | null;
};

// Templates are one of the two applyable protocol dimensions.
const templateType = z.enum(["workouts", "diet"]);
const rowsInput = z.array(z.record(z.string(), z.unknown()));
const planInput = z
  .object({
    planType: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    cyclePattern: z.string().nullish(),
  })
  .nullish();

function accessCategoryFor(type: ProtocolType): "diet" | "exercise" {
  return type === "workouts" ? "exercise" : "diet";
}

/** Coerce stored/incoming plan metadata into a stable PlanMeta (diet only). */
function toPlanMeta(input: unknown): PlanMeta {
  const p = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (v: unknown) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  };
  return {
    planType: str(p.planType),
    startDate: str(p.startDate),
    endDate: str(p.endDate),
    cyclePattern: str(p.cyclePattern),
  };
}

/** Load a template the caller is allowed to touch (owner coach or super-admin). */
async function loadOwned(db: Database, coachId: string, id: string, role?: string) {
  const tpl = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.id, id),
  });
  if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
  if (role !== "super_admin" && tpl.trainerId !== coachId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your template" });
  }
  return tpl;
}

/** Count distinct workout days (first grid column "day") for the card meta. */
function dayCount(rows: GridRow[]): number {
  const days = new Set<string>();
  for (const r of rows) {
    const d = r.day;
    if (typeof d === "string" && d.trim()) days.add(d.trim());
  }
  return days.size;
}

export const coachProgramTemplatesRouter = router({
  /** List the coach's templates of a given type, newest-edited first. */
  list: trainerProcedure
    .input(z.object({ type: templateType }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.programTemplates.findMany({
        where: and(
          eq(programTemplates.trainerId, ctx.dbUserId),
          eq(programTemplates.type, input.type),
        ),
        orderBy: desc(programTemplates.updatedAt),
      });
      return rows.map((t) => {
        const gridRows = (t.rows ?? []) as GridRow[];
        const meta = t.type === "diet" ? toPlanMeta(t.planMeta) : null;
        return {
          id: t.id,
          type: t.type as ProtocolType,
          name: t.name,
          description: t.description,
          rowCount: gridRows.length,
          dayCount: t.type === "workouts" ? dayCount(gridRows) : null,
          planType: meta?.planType ?? null,
          updatedAt: t.updatedAt,
        };
      });
    }),

  /** Full template for the editor: columns + rows + (diet) plan metadata. */
  get: trainerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tpl = await loadOwned(ctx.db, ctx.dbUserId, input.id, ctx.userRole);
      const type = tpl.type as ProtocolType;
      return {
        id: tpl.id,
        type,
        name: tpl.name,
        description: tpl.description,
        columns: COLUMNS[type],
        rows: (tpl.rows ?? []) as GridRow[],
        planMeta: type === "diet" ? toPlanMeta(tpl.planMeta) : null,
      };
    }),

  /** Create an empty template; the editor opens on it and fills the grid. */
  create: trainerProcedure
    .input(
      z.object({
        type: templateType,
        name: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(programTemplates)
        .values({
          trainerId: ctx.dbUserId,
          type: input.type,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          rows: [],
          planMeta: input.type === "diet" ? {} : null,
        })
        .returning();
      return { id: created.id };
    }),

  /** Save the editor's rows (+ diet plan metadata) back onto the template. */
  saveRows: trainerProcedure
    .input(
      z.object({
        id: z.string(),
        rows: rowsInput,
        plan: planInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tpl = await loadOwned(ctx.db, ctx.dbUserId, input.id, ctx.userRole);
      const type = tpl.type as ProtocolType;
      await ctx.db
        .update(programTemplates)
        .set({
          rows: input.rows as GridRow[],
          planMeta: type === "diet" ? toPlanMeta(input.plan) : null,
          updatedAt: new Date(),
        })
        .where(eq(programTemplates.id, tpl.id));
      return { rowCount: input.rows.length };
    }),

  /** Rename / re-describe a template. */
  rename: trainerProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadOwned(ctx.db, ctx.dbUserId, input.id, ctx.userRole);
      await ctx.db
        .update(programTemplates)
        .set({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(programTemplates.id, input.id));
      return { ok: true };
    }),

  /** Delete a template. Clients already applied keep their copy (they were
   *  overwritten into their own plan — the template is just the source). */
  delete: trainerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await loadOwned(ctx.db, ctx.dbUserId, input.id, ctx.userRole);
      await ctx.db.delete(programTemplates).where(eq(programTemplates.id, input.id));
      return { ok: true };
    }),

  /**
   * Apply the template to one or many clients, OVERWRITING each client's live
   * exercise or diet with the template's rows, then notifying each client.
   * Per-client access is enforced; clients the coach can't write to are skipped.
   */
  apply: trainerProcedure
    .input(
      z.object({
        id: z.string(),
        clientIds: z.array(z.string()).min(1),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tpl = await loadOwned(ctx.db, ctx.dbUserId, input.id, ctx.userRole);
      const type = tpl.type as ProtocolType;
      const rows = (tpl.rows ?? []) as Array<Record<string, unknown>>;
      const planMeta = type === "diet" ? toPlanMeta(tpl.planMeta) : undefined;
      const category = accessCategoryFor(type);

      if (rows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This template is empty — add rows before applying it.",
        });
      }

      // De-dupe client IDs so a repeated selection can't double-apply.
      const clientIds = Array.from(new Set(input.clientIds));
      let applied = 0;
      const skipped: Array<{ clientId: string; reason: string }> = [];

      for (const clientId of clientIds) {
        // Access: coach must have WRITE on the relevant category (super-admin
        // bypasses, mirroring the per-client bulk editor).
        if (ctx.userRole !== "super_admin") {
          const access = await getCoachAccess(ctx.db, ctx.dbUserId, clientId);
          if (!access.hasAnyAccess || !hasCategoryAccess(access, category, "write")) {
            skipped.push({ clientId, reason: "no_access" });
            continue;
          }
        }

        try {
          // Overwrite the client's live plan (delete+replace, in a txn), reading
          // BEFORE so the notification can summarize the change.
          const { before, after } = await ctx.db.transaction(async (tx) => {
            const db = tx as unknown as Database;
            const before = await readGrid(db, type, clientId);
            const after = await applyReplace(db, ctx.dbUserId, type, clientId, rows, planMeta);
            return { before, after };
          });
          // Notify (best-effort; never throws).
          await notifyClientProtocolChange(
            ctx.db,
            ctx.dbUserId,
            clientId,
            type,
            before,
            after,
            input.note,
          );
          applied++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[Program Template apply] failed for client", clientId, msg);
          skipped.push({ clientId, reason: "error" });
        }
      }

      return { applied, skipped, rowCount: rows.length, type };
    }),
});
