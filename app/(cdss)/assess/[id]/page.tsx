import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { AssessmentCard } from "@/components/cdss/assessment-card";
import { db } from "@/lib/db/client";
import { advice, assessment, evidence } from "@/lib/db/schema";
import { getActiveRules } from "@/lib/risk/engine";

export default async function AssessResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const [a] = await db.select().from(assessment).where(eq(assessment.id, id));
  if (!a) notFound();
  if (a.userId !== session.user.id) redirect("/history");

  const [adviceRows, evidenceRows] = await Promise.all([
    db.select().from(advice).where(eq(advice.assessmentId, id)),
    db.select().from(evidence).where(eq(evidence.assessmentId, id)),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <AssessmentCard
        bundle={{
          assessment: a,
          advice: adviceRows.sort((x, y) => x.priority - y.priority),
          evidence: evidenceRows,
          totalRulesChecked: getActiveRules().length,
        }}
      />
    </div>
  );
}
