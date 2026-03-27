import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { progressPhotos } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const clientProgressPhotosRouter = router({
  // Get photos for a specific date
  getByDate: clientProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.progressPhotos.findMany({
        where: and(
          eq(progressPhotos.clientId, ctx.dbUserId),
          eq(progressPhotos.date, input.date)
        ),
      });
    }),

  // Get recent progress photos (last N entries)
  getRecent: clientProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.progressPhotos.findMany({
        where: eq(progressPhotos.clientId, ctx.dbUserId),
        orderBy: desc(progressPhotos.date),
        limit: input.limit,
      });
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

      return photo;
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
