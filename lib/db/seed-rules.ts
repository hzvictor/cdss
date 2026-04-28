import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { CURRENT_RULES, RULE_VERSION } from "../risk/rules";
import { RULES_V1, RULE_VERSION as RULE_VERSION_V1 } from "../risk/rules/v1";
import { ruleSource } from "./schema";

config({ path: ".env.local" });

async function seed() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL not set");

  const client = postgres(url);
  const db = drizzle(client);

  // v1 rows are kept for audit on historical assessments.
  const v1Rows = RULES_V1.map((r) => ({
    id: r.id,
    version: RULE_VERSION_V1,
    name: r.name,
    description: r.description,
    keywords: r.keywords,
    severity: r.severity,
    adviceTemplate: r.adviceTemplate,
    isActive: false, // superseded by v2
  }));

  const currentRows = CURRENT_RULES.map((r) => ({
    id: r.id,
    version: RULE_VERSION,
    name: r.name,
    description: r.description,
    keywords: r.keywords,
    severity: r.severity,
    adviceTemplate: r.adviceTemplate,
    isActive: true,
  }));

  await db.insert(ruleSource).values(v1Rows).onConflictDoUpdate({
    target: [ruleSource.id, ruleSource.version],
    set: { isActive: false },
  });
  await db.insert(ruleSource).values(currentRows).onConflictDoUpdate({
    target: [ruleSource.id, ruleSource.version],
    set: { isActive: true },
  });

  // biome-ignore lint/suspicious/noConsole: seed script output
  console.log(
    `Seeded ${v1Rows.length} v1 (inactive) + ${currentRows.length} ${RULE_VERSION} (active) rules`
  );
  await client.end();
}

seed().catch((e) => {
  // biome-ignore lint/suspicious/noConsole: seed script error
  console.error(e);
  process.exit(1);
});
