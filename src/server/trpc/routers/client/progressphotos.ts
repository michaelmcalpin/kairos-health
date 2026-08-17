import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { progressPhotos } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Rewrite each stored photo URL to point at the authorized /api/phi-file proxy.
 * Body photos are PHI — the raw storage URL must never reach the browser. The
 * page's <img src> keeps working because it receives a proxy path per index.
 */
function proxyPhotoUrls<T extends { id: string; photoUrls: string[] | null }>(
  row: T,
): T {
  return {
    ...row,
    photoUrls:
      row.photoUrls?.map(
        (_url, idx) => `/api/phi-file?type=photo&id=${row.id}&i=${idx}`,
      ) ?? row.photoUrls,
  };
}

export const clientProgressPhotosRouter = router({
  // Get photos for a specific date
  getByDate: clientProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.progressPhotos.findMany({
        where: and(
          eq(progressPhotos.clientId, ctx.dbUserId),
          eq(progressPhotos.date, input.date)
        ),
      });
      return rows.map(proxyPhotoUrls);
    }),

  // Get recent progress photos (last N entries)
  getRecent: clientProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.progressPhotos.findMany({
        where: eq(progressPhotos.clientId, ctx.dbUserId),
        orderBy: desc(progressPhotos.date),
        limit: input.limit,
      });
      return rows.map(proxyPhotoUrls);
    }),

  // Add a progress photo
  add: clientProcedure
    .input(
      z.object({
        date: z.string(),
        photoUrls: z.array(z.string()),
        poseType: z.enum(["front", "side", "back"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [photo] = await ctx.db.insert(progressPhotos).values({
        clientId: ctx.dbUserId,
        date: input.date,
        photoUrls: input.photoUrls,
        poseType: input.poseType,
      }).returning();

      return proxyPhotoUrls(photo);
    }),

  // Delete a progress photo
  delete: clientProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(progressPhotos)
        .where(and(
          eq(progressPhotos.id, input.id),
          eq(progressPhotos.clientId, ctx.dbUserId)
        ));
    }),
});
