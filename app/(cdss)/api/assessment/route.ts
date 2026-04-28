import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { runAssessment } from "@/lib/agent/orchestrator";
import { db } from "@/lib/db/client";
import { advice, assessment, evidence } from "@/lib/db/schema";
import { getActiveRules } from "@/lib/risk/engine";

export const runtime = "nodejs";

const Body = z.object({
  inputText: z.string().min(2).max(4000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const { assessmentId } = await runAssessment({
      userId: session.user.id,
      inputText: parsed.inputText,
    });

    const [a] = await db
      .select()
      .from(assessment)
      .where(eq(assessment.id, assessmentId));

    const [adviceRows, evidenceRows] = await Promise.all([
      db.select().from(advice).where(eq(advice.assessmentId, assessmentId)),
      db.select().from(evidence).where(eq(evidence.assessmentId, assessmentId)),
    ]);

    return NextResponse.json(
      {
        assessmentId,
        assessment: a,
        advice: adviceRows.sort((x, y) => x.priority - y.priority),
        evidence: evidenceRows,
        totalRulesChecked: getActiveRules().length,
      },
      { status: 201 }
    );
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: api error
    console.error("[assessment] failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
