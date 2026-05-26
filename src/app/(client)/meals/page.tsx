"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /meals redirects to /nutrition which contains the meal log
export default function MealsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/nutrition");
  }, [router]);
  return null;
}
