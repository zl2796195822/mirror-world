import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(connectionString);
  return { client, db: drizzle(client) };
}
