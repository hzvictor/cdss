import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db/client";
import { assessment } from "@/lib/db/schema";

const RISK_BADGE = {
  high: { label: "高", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  medium: { label: "中", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  low: { label: "低", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
} as const;

export default async function AdminAssessmentsPage() {
  const safeRows = await db
    .select()
    .from(assessment)
    .orderBy(desc(assessment.createdAt))
    .limit(200);

  const counts = safeRows.reduce(
    (acc, r) => {
      acc[r.riskLevel] = (acc[r.riskLevel] ?? 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 } as Record<string, number>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="高风险" value={counts.high ?? 0} className="text-red-600" />
        <Stat label="中风险" value={counts.medium ?? 0} className="text-amber-700" />
        <Stat label="低风险" value={counts.low ?? 0} className="text-emerald-700" />
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left">时间</th>
              <th className="px-3 py-2 text-left">风险</th>
              <th className="px-3 py-2 text-left">摘要</th>
              <th className="px-3 py-2 text-left">规则版本</th>
              <th className="px-3 py-2 text-left">模型</th>
              <th className="px-3 py-2 text-left">联系</th>
            </tr>
          </thead>
          <tbody data-testid="admin-assessments-tbody">
            {safeRows.map((row) => (
              <tr
                key={row.id}
                className="border-t"
                data-testid="admin-assessment-row"
                data-assessment-id={row.id}
                data-risk={row.riskLevel}
              >
                <td className="px-3 py-2 font-mono text-xs">
                  {new Date(row.createdAt).toLocaleString("zh-CN", {
                    hour12: false,
                  })}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={RISK_BADGE[row.riskLevel].className}
                    data-testid="admin-risk-badge"
                  >
                    {RISK_BADGE[row.riskLevel].label}
                  </Badge>
                </td>
                <td className="max-w-md truncate px-3 py-2">
                  <Link
                    href={`/admin/assessments/${row.id}`}
                    className="hover:underline"
                  >
                    {row.summary}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.ruleVersion}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.modelId}</td>
                <td className="px-3 py-2">
                  {row.shouldContactTeam ? "是" : "—"}
                </td>
              </tr>
            ))}
            {safeRows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  暂无评估记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`mt-1 font-semibold text-2xl ${className ?? ""}`}>{value}</p>
    </div>
  );
}
