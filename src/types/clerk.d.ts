/**
 * Clerk type augmentations.
 *
 * Tells Clerk to include `publicMetadata` in session claims so the
 * Next.js middleware can read the user's role without a DB query.
 *
 * For this to work, the Clerk Dashboard must have the "Session token"
 * customization set to include `{{user.public_metadata}}`.
 *
 * @see https://clerk.com/docs/references/nextjs/auth-object#custom-claims
 */

export {};

declare global {
  interface CustomJwtSessionClaims {
    publicMetadata?: {
      role?: "client" | "trainer" | "company_admin" | "super_admin";
      companyId?: string;
    };
  }
}
