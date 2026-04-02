import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/trainer/login(.*)",
  "/company/login(.*)",
  "/admin/login(.*)",
  "/api/webhooks(.*)",
  "/api/cron(.*)",
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

// ─── Security Headers ─────────────────────────────────────────────────────

const securityHeaders: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "X-DNS-Prefetch-Control": "on",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.dev https://challenges.cloudflare.com https://cdnjs.cloudflare.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.dev https://*.stripe.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.clerk.dev https://*.clerk.dev https://api.stripe.com wss:",
    "frame-src 'self' https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    // Still apply security headers to public routes
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
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
  if (!userRole) {
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Check portal route access
  let redirectUrl: URL | null = null;

  if (isSuperAdminRoute(req)) {
    if (!PORTAL_ACCESS.super_admin.includes(userRole)) {
      redirectUrl = new URL("/select-role", req.url);
      redirectUrl.searchParams.set("denied", "true");
    }
  } else if (isCompanyAdminRoute(req)) {
    if (!PORTAL_ACCESS.company.includes(userRole)) {
      redirectUrl = new URL("/select-role", req.url);
      redirectUrl.searchParams.set("denied", "true");
    }
  } else if (isTrainerRoute(req)) {
    if (!PORTAL_ACCESS.trainer.includes(userRole)) {
      redirectUrl = new URL("/select-role", req.url);
      redirectUrl.searchParams.set("denied", "true");
    }
  }

  if (redirectUrl) {
    const response = NextResponse.redirect(redirectUrl);
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
