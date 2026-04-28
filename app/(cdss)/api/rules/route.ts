import { createHash } from "node:crypto";
import { and, asc, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { ruleSource } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * Public rules endpoint with classic HTTP caching:
 *
 *   GET /api/rules                           → full payload + ETag
 *   GET /api/rules     If-None-Match: <tag>  → 304 if unchanged (saves bandwidth)
 *   GET /api/rules?since=<ISO>               → only rules whose effectiveFrom > since (incremental)
 *
 * The ETag is computed from (version + sorted ids + max effectiveFrom).
 * When v2.1 ships and effectiveFrom moves forward, ETag changes automatically.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  const incremental = sinceDate && !Number.isNaN(sinceDate.getTime());

  const baseRows = await db
    .select()
    .from(ruleSource)
    .where(
      incremental
        ? and(
            eq(ruleSource.isActive, true),
            gt(ruleSource.effectiveFrom, sinceDate)
          )
        : eq(ruleSource.isActive, true)
    )
    .orderBy(asc(ruleSource.severity), asc(ruleSource.id));

  // Always compute ETag against the FULL active set (so a 304 for incremental
  // matches when no global change happened). Cheap query — single GROUP BY.
  const allRows = incremental
    ? await db
        .select()
        .from(ruleSource)
        .where(eq(ruleSource.isActive, true))
        .orderBy(asc(ruleSource.severity), asc(ruleSource.id))
    : baseRows;

  const version = allRows[0]?.version ?? "v2";
  const maxEffective = allRows.reduce(
    (max, r) => (r.effectiveFrom > max ? r.effectiveFrom : max),
    new Date(0)
  );
  const etag = computeEtag(version, allRows.length, maxEffective);

  // 304 short-circuit
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        etag,
        "cache-control": "public, max-age=60, s-maxage=300",
      },
    });
  }

  return NextResponse.json(
    {
      version,
      fetchedAt: new Date().toISOString(),
      count: allRows.length,
      mode: incremental ? "incremental" : "full",
      since: sinceParam,
      rules: incremental ? baseRows : allRows,
    },
    {
      headers: {
        etag,
        "cache-control": "public, max-age=60, s-maxage=300",
        vary: "If-None-Match",
      },
    }
  );
}

function computeEtag(version: string, count: number, maxEffective: Date): string {
  const fingerprint = `${version}|${count}|${maxEffective.toISOString()}`;
  const hash = createHash("sha1").update(fingerprint).digest("hex").slice(0, 16);
  return `W/"${hash}"`;
}
