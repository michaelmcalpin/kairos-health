/**
 * AuthGuard — DEV MODE bypass.
 *
 * Clerk is not yet configured, so this passes all children through
 * without auth checks. Swap back to the Clerk version when ready.
 */

import React from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  // DEV: skip auth — render all screens directly
  return <>{children}</>;
}
