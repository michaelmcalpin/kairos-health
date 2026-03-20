import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "client" | "trainer" | "company_admin" | "super_admin";

export type Context = {
  db: typeof db;
  userId: string | null;
  userRole: UserRole | null;
  dbUserId: string | null;
  companyId: string | null;
};

export async function createContext(): Promise<Context> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return { db, userId: null, userRole: null, dbUserId: null, companyId: null };
  }

  // Look up the user in our database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  return {
    db,
    userId: clerkId,
    userRole: (dbUser?.role as UserRole) ?? null,
    dbUserId: dbUser?.id ?? null,
    companyId: dbUser?.companyId ?? null,
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware: requires authentication
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.dbUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in." });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId, dbUserId: ctx.dbUserId, userRole: ctx.userRole! },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Middleware: requires specific role (super_admin can access everything)
const requireRole = (...roles: UserRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.userId || !ctx.dbUserId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (!roles.includes(ctx.userRole as UserRole) && ctx.userRole !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: `This action requires one of: ${roles.join(", ")}.` });
    }
    return next({
      ctx: { ...ctx, userId: ctx.userId, dbUserId: ctx.dbUserId, userRole: ctx.userRole!, companyId: ctx.companyId },
    });
  });

export const clientProcedure = t.procedure.use(requireRole("client"));
export const trainerProcedure = t.procedure.use(requireRole("trainer"));
export const companyAdminProcedure = t.procedure.use(requireRole("company_admin"));
export const superAdminProcedure = t.procedure.use(requireRole("super_admin"));

// Legacy aliases (for gradual migration)
export const coachProcedure = trainerProcedure;
export const adminProcedure = superAdminProcedure;
