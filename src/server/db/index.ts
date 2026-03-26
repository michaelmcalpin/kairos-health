import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[DB] DATABASE_URL is not set — DB queries will fail");
}

const isProduction = process.env.NODE_ENV === "production";

const client = postgres(connectionString ?? "", {
  max: isProduction ? 5 : 10,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  prepare: false,          // required for Neon connection pooler (pgBouncer)
  ssl: isProduction ? "require" : false,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
