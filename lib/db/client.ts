import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForDb = globalThis as unknown as {
  __cdssClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__cdssClient ?? postgres(process.env.POSTGRES_URL ?? "");

if (process.env.NODE_ENV !== "production") {
  globalForDb.__cdssClient = client;
}

export const db = drizzle(client);
