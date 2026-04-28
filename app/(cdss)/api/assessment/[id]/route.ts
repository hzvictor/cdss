import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/client";
import { advice, assessment, evidence } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [row] = await db
    .select()
    .from(assessment)
    .where(eq(assessment.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (row.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [adviceRows, evidenceRows] = await Promise.all([
    db.select().from(advice).where(eq(advice.assessmentId, id)),
    db.select().from(evidence).where(eq(evidence.assessmentId, id)),
  ]);

  return NextResponse.json({
    assessment: row,
    advice: adviceRows.sort((a, b) => a.priority - b.priority),
    evidence: evidenceRows,
  });
}
