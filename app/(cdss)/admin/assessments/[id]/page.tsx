import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db/client";
import {
  advice,
  assessment,
  contactRequest,
  evidence,
  eventLog,
} from "@/lib/db/schema";

const RISK_BADGE = {
  high: { label: "高", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  medium: { label: "中", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  low: { label: "低", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
} as const;

export default async function AdminAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [a] = await db.select().from(assessment).where(eq(assessment.id, id));
  if (!a) notFound();

  const [adviceRows, evidenceRows, contactRows, eventRows] = await Promise.all([
    db.select().from(advice).where(eq(advice.assessmentId, id)),
    db.select().from(evidence).where(eq(evidence.assessmentId, id)),
    db.select().from(contactRequest).where(eq(contactRequest.assessmentId, id)),
    db.select().from(eventLog).where(eq(eventLog.assessmentId, id)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={RISK_BADGE[a.riskLevel].className}
        >
          {RISK_BADGE[a.riskLevel].label}风险
        </Badge>
        <code className="font-mono text-muted-foreground text-xs">{a.id}</code>
      </div>

      <Section title="原始输入">
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
          {a.inputText}
        </pre>
      </Section>

      <Section title="建议">
        <ul className="space-y-1 text-sm">
          {adviceRows.map((row) => (
            <li key={row.id} className="rounded border p-2">
              <span className="font-medium">{row.title}</span>
              <span className="ml-2 text-muted-foreground">
                — {row.description}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`命中规则 (${evidenceRows.length})`}>
        <ul className="space-y-1 font-mono text-xs">
          {evidenceRows.map((ev) => (
            <li key={ev.id} className="rounded border p-2">
              {ev.ruleId}@{ev.ruleVersion} · {ev.severity} · 关键词:{" "}
              {(ev.matchedKeywords as string[]).join(", ")}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`协同请求 (${contactRows.length})`}>
        <ul className="space-y-1 text-sm">
          {contactRows.map((c) => (
            <li key={c.id} className="rounded border p-2">
              {c.channel} · {c.status} ·{" "}
              {new Date(c.createdAt).toLocaleString("zh-CN")}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`事件日志 (${eventRows.length})`}>
        <ul className="space-y-1 font-mono text-xs">
          {eventRows
            .sort(
              (x, y) =>
                new Date(x.createdAt).getTime() -
                new Date(y.createdAt).getTime()
            )
            .map((e) => (
              <li key={e.id} className="rounded border p-2">
                {new Date(e.createdAt).toLocaleString("zh-CN")} ·{" "}
                <strong>{e.eventName}</strong> · {JSON.stringify(e.payload)}
              </li>
            ))}
        </ul>
      </Section>

      <Section title="审计">
        <dl className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div>规则版本: {a.ruleVersion}</div>
          <div>模型: {a.modelId}</div>
          <div>模型版本: {a.modelVersion}</div>
          <div>生成时间: {new Date(a.createdAt).toLocaleString("zh-CN")}</div>
        </dl>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium text-sm">{title}</h2>
      {children}
    </section>
  );
}
