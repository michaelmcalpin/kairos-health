"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy /messages route — redirect to the unified Chat page (coach tab).
 * All messaging now happens through /chat with AI + Coach tabs.
 */
export default function MessagesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/chat?tab=coach");
  }, [router]);
  return null;
}
