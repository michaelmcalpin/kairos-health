import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/dev(.*)",
]);

// Portal route matchers for role-based server-side blocking
const isSuperAdminRoute = createRouteMatcher(["/super-admin(.*)"]);
const isCompanyAdminRoute = createRouteMatcher(["/company(.*)"]);
const isTrainerRoute = createRouteMatcher(["/trainer(.*)"]);

/**
 * Role hierarchy — which roles can access which portal routes?
 * Checked server-side before the page even renders.
 */
type UserRole = "super_admin" | "company_admin" | "trainer" | "client";

const PORTAL_ACCESS: Record<string, UserRole[]> = {
  super_admin: ["super_admin"],
  company: ["super_admin", "company_admin"],
  trainer: ["super_admin", "company_admin", "trainer"],
  // client routes (/dashboard, /workouts, etc.) → everyone can access
};

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  // Require auth for all non-public routes
  const session = await auth.protect();

  // Server-side portal access check using Clerk publicMetadata.role
  // This blocks unauthorized portal access before the page renders,
  // even if someone tampers with localStorage on the client.
  const metadata = session.sessionClaims?.publicMetadata as
    | { role?: string }
    | undefined;
  const userRole = metadata?.role as UserRole | undefined;

  // If we don't have a role in metadata yet (e.g. brand-new user before
  // ensureUser runs), let them through — the client-side RoleGuard
  // will redirect them to /select-role.
  if (!userRole) return;

  // Check portal route access
  if (isSuperAdminRoute(req)) {
    if (!PORTAL_ACCESS.super_admin.includes(userRole)) {
      const url = new URL("/select-role", req.url);
      url.searchParams.set("denied", "true");
      return NextResponse.redirect(url);
    }
  } else if (isCompanyAdminRoute(req)) {
    if (!PORTAL_ACCESS.company.includes(userRole)) {
      const url = new URL("/select-role", req.url);
      url.searchParams.set("denied", "true");
      return NextResponse.redirect(url);
    }
  } else if (isTrainerRoute(req)) {
    if (!PORTAL_ACCESS.trainer.includes(userRole)) {
      const url = new URL("/select-role", req.url);
      url.searchParams.set("denied", "true");
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
