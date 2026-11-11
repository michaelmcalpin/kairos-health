/**
 * The client's own peptide and protocol entries, as a dose allowlist for the
 * AI output filter (see lib/ai/clinical-guardrails.ts). These are reference
 * records the client and coach keep; the AI may repeat them, never change them.
 */
import { and, eq, inArray } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import { peptideCycles, supplementProtocols, protocolItems } from "@/server/db/schema";
import { buildDoseAllowlist, type ClientDose, type DoseAllowlist } from "@/lib/ai/clinical-guardrails";

export async function loadClientDoseAllowlist(db: typeof DB, clientId: string): Promise<DoseAllowlist> {
  const doses: ClientDose[] = [];
  try {
    const cycles = await db.select({
      name: peptideCycles.peptideName, dosage: peptideCycles.dosage, unit: peptideCycles.unit,
      frequency: peptideCycles.frequency, durationWeeks: peptideCycles.durationWeeks,
    }).from(peptideCycles)
      .where(eq(peptideCycles.clientId, clientId));
    doses.push(...cycles);
  } catch { /* table/enum mismatch: skip */ }
  try {
    const protocols = await db.select({ id: supplementProtocols.id }).from(supplementProtocols)
      .where(and(eq(supplementProtocols.clientId, clientId), eq(supplementProtocols.status, "active")));
    if (protocols.length) {
      const items = await db.select({ name: protocolItems.name, dosage: protocolItems.dosage, unit: protocolItems.unit, frequency: protocolItems.frequency })
        .from(protocolItems).where(inArray(protocolItems.protocolId, protocols.map((p) => p.id)));
      doses.push(...items);
    }
  } catch { /* skip */ }
  return buildDoseAllowlist(doses);
}
