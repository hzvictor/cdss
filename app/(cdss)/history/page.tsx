import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/client";
import { assessment } from "@/lib/db/schema";

const RISK_META = {
  high: {
    label: "高",
    chip: "bg-[color:var(--cdss-risk-high-bg)] text-[color:var(--cdss-risk-high-fg)] border-[color:var(--cdss-risk-high-border)]",
  },
  medium: {
    label: "中",
    chip: "bg-[color:var(--cdss-risk-medium-bg)] text-[color:var(--cdss-risk-medium-fg)] border-[color:var(--cdss-risk-medium-border)]",
  },
  low: {
    label: "低",
    chip: "bg-[color:var(--cdss-risk-low-bg)] text-[color:var(--cdss-risk-low-fg)] border-[color:var(--cdss-risk-low-border)]",
  },
} as const;

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rows = await db
    .select()
    .from(assessment)
    .where(eq(assessment.userId, session.user.id))
    .orderBy(desc(assessment.createdAt))
    .limit(100);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="cdss-reveal flex items-baseline justify-between border-[var(--cdss-line)] border-b pb-4">
        <h1 className="font-display font-medium text-[color:var(--foreground)] text-3xl tracking-tight">
          历史记录
        </h1>
        <span className="font-mono text-[11px] text-[color:var(--muted-foreground)] uppercase tracking-[0.18em]">
          共 {rows.length} 条
        </span>
      </header>

      {rows.length === 0 ? (
        <div className="cdss-reveal cdss-paper-card rounded-2xl p-10 text-center">
          <p className="font-zh-serif text-[15px] text-[color:var(--muted-foreground)]">
            还没有评估记录。
          </p>
          <Link
            href="/assess"
            className="mt-4 inline-block font-mono text-[color:var(--primary)] text-[12px] uppercase tracking-[0.2em] hover:underline"
          >
            开始第一次评估 →
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="cdss-reveal"
              style={{ animationDelay: `${0.05 + i * 0.03}s` }}
            >
              <Link
                href={`/assess/${row.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-[var(--cdss-line)] bg-[var(--cdss-paper)] p-5 transition-all hover:border-[color:var(--primary)]/30 hover:shadow-sm"
              >
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${RISK_META[row.riskLevel].chip}`}
                >
                  {RISK_META[row.riskLevel].label} 风险
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-zh-serif text-[15px] text-[color:var(--foreground)] leading-[1.5]">
                    {row.summary}
                  </p>
                  <p className="mt-1.5 font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.14em]">
                    {new Date(row.createdAt).toLocaleString("zh-CN", {
                      hour12: false,
                    })}
                    <span className="mx-2">·</span>规则 {row.ruleVersion}
                    <span className="mx-2">·</span>
                    {row.shouldContactTeam ? "建议联系团队" : "无需联系"}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="self-center font-mono text-[color:var(--muted-foreground)] text-base opacity-0 transition-opacity group-hover:opacity-100"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
