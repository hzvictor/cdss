import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { eventLog } from "@/lib/db/schema";

export default async function AdminEventsPage() {
  const [rows, counts] = await Promise.all([
    db.select().from(eventLog).orderBy(desc(eventLog.createdAt)).limit(200),
    db
      .select({
        eventName: eventLog.eventName,
        n: sql<number>`count(*)::int`,
      })
      .from(eventLog)
      .groupBy(eventLog.eventName),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {counts.map((c) => (
          <div
            key={c.eventName}
            className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
          >
            <span className="font-mono text-muted-foreground text-xs">
              {c.eventName}
            </span>
            <span className="ml-2 font-semibold">{c.n}</span>
          </div>
        ))}
        {counts.length === 0 && (
          <p className="text-muted-foreground text-sm">暂无事件</p>
        )}
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left">时间</th>
              <th className="px-3 py-2 text-left">事件</th>
              <th className="px-3 py-2 text-left">评估 ID</th>
              <th className="px-3 py-2 text-left">用户 ID</th>
              <th className="px-3 py-2 text-left">Payload</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">
                  {new Date(row.createdAt).toLocaleString("zh-CN")}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.eventName}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.assessmentId?.slice(0, 8) ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.userId?.slice(0, 8) ?? "—"}
                </td>
                <td className="max-w-md truncate px-3 py-2 font-mono text-xs">
                  {JSON.stringify(row.payload)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  暂无事件
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
