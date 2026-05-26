"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy /ai-reports route — redirect to Insight Sherpa which has
 * the full AI report generation and saved reports features.
 */
export default function AIReportsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/insights");
  }, [router]);
  return null;
}
