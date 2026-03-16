import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type Context = {
  db: typeof db;
  userId: string | null;
  userRole: "client" | "coach" | "admin" | null;
  dbUserId: string | null;
};

export async function createContext(): Promise<Context> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return { db, userId: null, userRole: null, dbUserId: null };
  }

  // Look up the user in our database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  return {
    db,
    userId: clerkId,
    userRole: (dbUser?.role as Context["userRole"]) ?? null,
    dbUserId: dbUser?.id ?? null,
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

// Middleware: requires specific role
const requireRole = (role: "client" | "coach" | "admin") =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.userId || !ctx.dbUserId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (ctx.userRole !== role && ctx.userRole !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: `This action requires ${role} role.` });
    }
    return next({
      ctx: { ...ctx, userId: ctx.userId, dbUserId: ctx.dbUserId, userRole: ctx.userRole! },
    });
  });

export const clientProcedure = t.procedure.use(requireRole("client"));
export const coachProcedure = t.procedure.use(requireRole("coach"));
export const adminProcedure = t.procedure.use(requireRole("admin"));
