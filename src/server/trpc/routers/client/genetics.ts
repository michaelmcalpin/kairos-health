import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import { geneticProfiles, geneticMarkers, geneticPathwayScores } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const clientGeneticsRouter = router({
  // Get the client's genetic profile with markers
  getProfile: clientProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.geneticProfiles.findFirst({
      where: eq(geneticProfiles.clientId, ctx.dbUserId),
      orderBy: desc(geneticProfiles.createdAt),
    });

    if (!profile) return null;

    const markers = await ctx.db.query.geneticMarkers.findMany({
      where: eq(geneticMarkers.profileId, profile.id),
    });

    return {
      id: profile.id,
      uploadType: profile.uploadType,
      sourceUrl: profile.sourceUrl,
      sourceFileName: profile.sourceFileName,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      markers: markers.map((marker) => ({
        id: marker.id,
        section: marker.section,
        gene: marker.gene,
        rsId: marker.rsId,
        pathway: marker.pathway,
        function: marker.function,
        mutation: marker.mutation,
        symptoms: marker.symptoms,
        supplementProtocol: marker.supplementProtocol,
        peptideSupport: marker.peptideSupport,
        dietStrategy: marker.dietStrategy,
        lifestyleStrategy: marker.lifestyleStrategy,
        labTests: marker.labTests,
        clinicalPriority: marker.clinicalPriority,
        createdAt: marker.createdAt,
      })),
    };
  }),

  // Get pathway scoring data
  getPathwayScores: clientProcedure
    .input(z.object({ profileId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // If no profileId provided, use the latest profile
      let profileId = input?.profileId;
      if (!profileId) {
        const profile = await ctx.db.query.geneticProfiles.findFirst({
          where: eq(geneticProfiles.clientId, ctx.dbUserId),
          orderBy: desc(geneticProfiles.createdAt),
        });
        if (!profile) return [];
        profileId = profile.id;
      }

      return ctx.db.query.geneticPathwayScores.findMany({
        where: eq(geneticPathwayScores.profileId, profileId),
      });
    }),

  // Create a new genetic profile
  uploadProfile: clientProcedure
    .input(
      z.object({
        uploadType: z.enum(["pdf", "url", "manual"]),
        sourceUrl: z.string().optional(),
        sourceFileName: z.string().optional(),
        rawData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.insert(geneticProfiles).values({
        clientId: ctx.dbUserId,
        uploadType: input.uploadType,
        sourceUrl: input.sourceUrl,
        sourceFileName: input.sourceFileName,
        rawData: input.rawData,
        status: "pending",
      }).returning();

      return profile[0];
    }),

  // Add a genetic marker manually
  addMarker: clientProcedure
    .input(
      z.object({
        profileId: z.string(),
        section: z.string().optional(),
        gene: z.string(),
        rsId: z.string().optional(),
        pathway: z.string().optional(),
        function: z.string().optional(),
        mutation: z.string().optional(),
        symptoms: z.string().optional(),
        supplementProtocol: z.string().optional(),
        peptideSupport: z.string().optional(),
        dietStrategy: z.string().optional(),
        lifestyleStrategy: z.string().optional(),
        labTests: z.string().optional(),
        clinicalPriority: z.enum(["high", "medium", "low"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the profile belongs to this client
      const profile = await ctx.db.query.geneticProfiles.findFirst({
        where: and(
          eq(geneticProfiles.id, input.profileId),
          eq(geneticProfiles.clientId, ctx.dbUserId)
        ),
      });

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found or unauthorized" });
      }

      const marker = await ctx.db.insert(geneticMarkers).values({
        profileId: input.profileId,
        clientId: ctx.dbUserId,
        section: input.section,
        gene: input.gene,
        rsId: input.rsId,
        pathway: input.pathway,
        function: input.function,
        mutation: input.mutation,
        symptoms: input.symptoms,
        supplementProtocol: input.supplementProtocol,
        peptideSupport: input.peptideSupport,
        dietStrategy: input.dietStrategy,
        lifestyleStrategy: input.lifestyleStrategy,
        labTests: input.labTests,
        clinicalPriority: input.clinicalPriority,
      }).returning();

      return marker[0];
    }),

  // Get all markers for a client, optionally filtered by section
  getMarkers: clientProcedure
    .input(
      z.object({
        profileId: z.string().optional(),
        section: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // If no profileId provided, use the latest profile
      let profileId = input?.profileId;
      if (!profileId) {
        const profile = await ctx.db.query.geneticProfiles.findFirst({
          where: eq(geneticProfiles.clientId, ctx.dbUserId),
          orderBy: desc(geneticProfiles.createdAt),
        });
        if (!profile) return [];
        profileId = profile.id;
      }

      const conditions = [eq(geneticMarkers.profileId, profileId)];
      if (input?.section) {
        conditions.push(eq(geneticMarkers.section, input.section));
      }

      return ctx.db.query.geneticMarkers.findMany({
        where: and(...conditions),
      });
    }),
});
