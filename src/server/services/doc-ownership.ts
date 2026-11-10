/**
 * Guards against filing one person's medical document under another person.
 *
 * Before a clinical document is saved for a client, look for another known
 * person's full name in the file name, title, or the patient name the parser
 * read off the report. If one is found (and it isn't the client's own name),
 * refuse the upload with a clear message. Every accepted upload is written to
 * the audit log with who uploaded it, for whom, and the file name.
 */
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, ne } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import { users, trainerClientRelationships, auditLogs } from "@/server/db/schema";

type Database = typeof DB;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

/** True when `text` contains first and last name as whole words (either order). */
export function mentionsName(text: string, first: string | null, last: string | null): boolean {
  if (!first || !last || first.trim().length < 2 || last.trim().length < 2) return false;
  const t = ` ${norm(text)} `;
  const f = norm(first), l = norm(last);
  return (t.includes(` ${f} `) && t.includes(` ${l} `));
}

export interface DocCandidate {
  sourceFileName?: string | null;
  title?: string | null;
  parsedData?: Record<string, unknown> | null;
}

function textOf(doc: DocCandidate): string {
  const pd = doc.parsedData ?? {};
  const patient = [pd.patientName, pd.patient_name, (pd.patient as Record<string, unknown> | undefined)?.name]
    .filter((v): v is string => typeof v === "string");
  return [doc.sourceFileName ?? "", doc.title ?? "", ...patient].join(" ");
}

/** Prefix on the error so the UI can offer "Upload anyway". */
export const OTHER_PERSON_MARKER = "[confirm-other-person]";

/**
 * Throw if the document names another person, unless the uploader has
 * confirmed it's intentional (e.g. demo data). Returns the other person's
 * name when an override was used, so it can be audited. `peerIds` limits the check to
 * people the uploader could plausibly mix up (a coach's other clients); when
 * omitted, every other user is checked.
 */
export async function assertDocBelongsToClient(
  db: Database,
  clientId: string,
  doc: DocCandidate,
  peerIds?: string[],
  confirmed = false,
): Promise<string | null> {
  const text = textOf(doc);
  if (!text.trim()) return null;
  const client = await db.query.users.findFirst({ where: eq(users.id, clientId) });
  if (client && mentionsName(text, client.firstName, client.lastName)) return null; // names the right person

  const others = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(peerIds ? and(inArray(users.id, peerIds.length ? peerIds : ["00000000-0000-0000-0000-000000000000"]), ne(users.id, clientId)) : ne(users.id, clientId))
    .catch(() => [] as Array<{ id: string; firstName: string | null; lastName: string | null }>);

  const match = others.find((o) => mentionsName(text, o.firstName, o.lastName));
  if (match && confirmed) return `${match.firstName} ${match.lastName}`;
  if (match) {
    const who = client ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() : "this client";
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${OTHER_PERSON_MARKER} This file appears to belong to ${match.firstName} ${match.lastName}, not ${who}. Upload it to the right person's record, or confirm if this is intentional (for example, demo data).`,
    });
  }
  return null;
}

/** A coach's active clients (for the peer check). */
export async function coachClientIds(db: Database, coachId: string): Promise<string[]> {
  const rows = await db.select({ id: trainerClientRelationships.clientId }).from(trainerClientRelationships)
    .where(and(eq(trainerClientRelationships.trainerId, coachId), eq(trainerClientRelationships.status, "active")))
    .catch(() => [] as Array<{ id: string }>);
  return rows.map((r) => r.id);
}

export async function auditDocUpload(
  db: Database,
  uploaderId: string,
  clientId: string,
  docId: string,
  meta: { docType: string; sourceFileName?: string | null; title?: string | null; confirmedOtherPerson?: string | null },
): Promise<void> {
  await db.insert(auditLogs).values({
    userId: uploaderId,
    action: "clinical_doc.uploaded",
    resourceType: "clinical_document",
    resourceId: docId,
    metadata: { clientId, ...meta },
  }).catch(() => {});
}
