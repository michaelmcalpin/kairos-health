import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[DB] DATABASE_URL is not set — DB queries will fail");
}

const client = postgres(connectionString ?? "", {
  max: 10,
  connect_timeout: 10,      // 10s connection timeout (prevents infinite hang)
  idle_timeout: 20,          // close idle connections after 20s
  max_lifetime: 60 * 5,     // recycle connections every 5 minutes
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
