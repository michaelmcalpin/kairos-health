import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextResponse } from "next/server";
import { appRouter } from "@/server/trpc/routers/_app";
import { createContext } from "@/server/trpc";
import { checkBodySize, MAX_BODY_BYTES } from "@/lib/middleware/sanitize";
import { applyRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";

const handler = async (req: Request) => {
  // Reject oversized request bodies (1 MB)
  const sizeErr = checkBodySize(req.headers.get("content-length"), MAX_BODY_BYTES);
  if (sizeErr) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Apply rate limiting
  const rl = await applyRateLimit(req, RATE_LIMITS.standard);
  if (!rl.allowed && rl.response) return rl.response;

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

  // Attach rate-limit headers to the response
  const res = new Response(response.body, response);
  for (const [key, value] of Object.entries(rl.headers)) {
    res.headers.set(key, value);
  }
  return res;
};

export { handler as GET, handler as POST };
