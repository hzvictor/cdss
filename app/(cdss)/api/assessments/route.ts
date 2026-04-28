import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/client";
import { assessment } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: assessment.id,
      riskLevel: assessment.riskLevel,
      summary: assessment.summary,
      shouldContactTeam: assessment.shouldContactTeam,
      ruleVersion: assessment.ruleVersion,
      modelId: assessment.modelId,
      status: assessment.status,
      createdAt: assessment.createdAt,
      closedAt: assessment.closedAt,
    })
    .from(assessment)
    .where(eq(assessment.userId, session.user.id))
    .orderBy(desc(assessment.createdAt))
    .limit(100);

  return NextResponse.json({ assessments: rows });
}
