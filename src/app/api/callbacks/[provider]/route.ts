import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const { provider } = params;
  // Handle OAuth callbacks from device integrations (Oura, Whoop, Dexcom, etc.)
  return NextResponse.json({ provider, status: "callback_received" });
}
