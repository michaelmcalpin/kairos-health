"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * "My Health" — lets a coach who is also a client (e.g. coached by Walid) open
 * their OWN client chart. A coach is always allowed to view their own record
 * (see verifyCoachClientRelationship self-view), so we just look up the current
 * user's id and forward to the standard client-detail page.
 */
export default function CoachMyHealthPage() {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();

  useEffect(() => {
    if (me.data?.id) {
      router.replace(`/trainer/clients/${me.data.id}`);
    }
  }, [me.data?.id, router]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Heart size={28} className="text-kairos-gold mb-3" />
      {me.isError ? (
        <p className="text-sm text-red-400">Couldn&apos;t load your profile. Please try again.</p>
      ) : (
        <>
          <Loader2 size={22} className="animate-spin text-kairos-gold mb-2" />
          <p className="text-sm text-gray-400">Opening your own health record…</p>
        </>
      )}
    </div>
  );
}
