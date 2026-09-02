// Deterministic database migration runner (replaces `drizzle-kit push --force`).
//
// Why: `push --force` diffs the live schema and, on ambiguous adds, silently
// guesses (rename vs create) — which repeatedly dropped/skipped new columns and
// caused production drift. Applying committed migration files in order is
// deterministic and reviewable.
//
// One-time baseline: this project historically deployed with `push`, so the
// live database has the tables but no drizzle migration ledger. On the first
// run against an already-provisioned DB we mark the pre-existing migrations
// (0000–0006) as applied so the migrator does not try to recreate existing
// tables; it then applies 0007+ (which are written idempotently).
//
// Safe to run repeatedly. No-ops when DATABASE_URL is unset (e.g. local build).

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const MIGRATIONS_FOLDER = "./drizzle";
// Number of migrations that predate the move to this runner. These were already
// applied to production via `drizzle-kit push`, so they get baselined, not run.
const BASELINE_COUNT = 7; // 0000 … 0006

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[db-migrate] DATABASE_URL not set — skipping migrations.");
  process.exit(0);
}

const sql = postgres(url, { ssl: "require", max: 1 });

try {
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });

  // Is the app schema already present (provisioned earlier via push)?
  const [{ provisioned }] = await sql`
    select (to_regclass('public.users') is not null) as provisioned
  `;

  // drizzle's ledger lives in schema "drizzle", table "__drizzle_migrations".
  await sql`create schema if not exists "drizzle"`;
  await sql`
    create table if not exists "drizzle"."__drizzle_migrations" (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;
  const [{ count }] = await sql`
    select count(*)::int as count from "drizzle"."__drizzle_migrations"
  `;

  if (provisioned && count === 0) {
    // First run on a push-provisioned DB → baseline the historical migrations.
    const baseline = migrations.slice(0, Math.min(BASELINE_COUNT, migrations.length));
    for (const m of baseline) {
      await sql`
        insert into "drizzle"."__drizzle_migrations" (hash, created_at)
        values (${m.hash}, ${m.folderMillis ?? Date.now()})
      `;
    }
    console.log(`[db-migrate] Baselined ${baseline.length} pre-existing migrations.`);
  } else if (!provisioned) {
    console.log("[db-migrate] Fresh database — applying full migration history.");
  }
} catch (err) {
  console.error("[db-migrate] Baseline step failed:", err);
  await sql.end();
  process.exit(1);
} finally {
  // migrate() opens its own session below; close this one.
}

await sql.end();

// Apply any not-yet-applied migrations (0007+ on an existing DB, or everything
// on a fresh one). Idempotent 0007 makes this safe regardless of drift state.
const migrateClient = postgres(url, { ssl: "require", max: 1 });
try {
  const db = drizzle(migrateClient);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("[db-migrate] Migrations applied.");
} catch (err) {
  console.error("[db-migrate] Migration failed:", err);
  await migrateClient.end();
  process.exit(1);
}
await migrateClient.end();
process.exit(0);
