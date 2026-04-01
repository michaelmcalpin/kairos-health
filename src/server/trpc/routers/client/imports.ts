import { z } from "zod";
import crypto from "crypto";
import { router, clientProcedure } from "@/server/trpc";

// In-memory import history (production would use DB)
const importRecords = new Map<string, {
  id: string;
  userId: string;
  category: string;
  fileName: string;
  rowCount: number;
  importedRows: number;
  status: string;
  createdAt: string;
}>();

export const clientImportsRouter = router({
  // Log an import
  logImport: clientProcedure
    .input(
      z.object({
        category: z.string(),
        fileName: z.string(),
        rowCount: z.number(),
        importedRows: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = `imp_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
      const record = {
        id,
        userId: ctx.dbUserId,
        category: input.category,
        fileName: input.fileName,
        rowCount: input.rowCount,
        importedRows: input.importedRows,
        status: "complete",
        createdAt: new Date().toISOString(),
      };
      importRecords.set(id, record);
      return record;
    }),

  // Get import history
  getHistory: clientProcedure.query(async ({ ctx }) => {
    const records = Array.from(importRecords.values())
      .filter((r) => r.userId === ctx.dbUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return records;
  }),

  // Get supported categories
  getCategories: clientProcedure.query(async () => {
    return [
      { id: "glucose", label: "Glucose Readings", requiredFields: ["timestamp", "value"] },
      { id: "sleep", label: "Sleep Sessions", requiredFields: ["date", "duration_hours"] },
      { id: "workouts", label: "Workouts", requiredFields: ["date", "type", "duration_minutes"] },
      { id: "nutrition", label: "Nutrition Logs", requiredFields: ["date", "meal_type", "calories"] },
      { id: "measurements", label: "Body Measurements", requiredFields: ["date", "type", "value"] },
      { id: "supplements", label: "Supplement Logs", requiredFields: ["date", "name"] },
      { id: "labs", label: "Lab Results", requiredFields: ["date", "biomarker", "value"] },
    ];
  }),
});
