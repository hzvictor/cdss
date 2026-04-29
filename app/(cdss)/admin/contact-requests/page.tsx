import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { contactRequest } from "@/lib/db/schema";

const STATUS_LABEL = {
  suggested: "系统建议",
  created: "用户已提交",
  accepted: "团队已接收",
  closed: "已关闭",
} as const;

export default async function AdminContactRequestsPage() {
  const rows = await db
    .select()
    .from(contactRequest)
    .orderBy(desc(contactRequest.createdAt))
    .limit(200);

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-xs">
          <tr>
            <th className="px-3 py-2 text-left">时间</th>
            <th className="px-3 py-2 text-left">渠道</th>
            <th className="px-3 py-2 text-left">状态</th>
            <th className="px-3 py-2 text-left">评估</th>
            <th className="px-3 py-2 text-left">备注</th>
          </tr>
        </thead>
        <tbody data-testid="admin-contact-requests-tbody">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t"
              data-testid="admin-contact-row"
              data-channel={row.channel}
              data-status={row.status}
              data-assessment-id={row.assessmentId}
            >
              <td className="px-3 py-2 font-mono text-xs">
                {new Date(row.createdAt).toLocaleString("zh-CN")}
              </td>
              <td className="px-3 py-2">
                {row.channel === "team" ? "医疗团队" : "急诊"}
              </td>
              <td className="px-3 py-2">{STATUS_LABEL[row.status]}</td>
              <td className="px-3 py-2 font-mono text-xs">
                <Link
                  href={`/admin/assessments/${row.assessmentId}`}
                  className="hover:underline"
                >
                  {row.assessmentId.slice(0, 8)}
                </Link>
              </td>
              <td className="max-w-md truncate px-3 py-2 text-muted-foreground">
                {row.note ?? "—"}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                暂无协同请求
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
