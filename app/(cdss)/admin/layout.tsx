import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin/assessments", label: "评估" },
  { href: "/admin/events", label: "事件流" },
  { href: "/admin/rules", label: "规则库" },
  { href: "/admin/contact-requests", label: "协同请求" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-xl tracking-tight">管理后台</h1>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-700 uppercase tracking-[0.16em]">
            Public · Demo
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          只读视图，用于审计与可观测性。所有数据来自 Postgres。
          面试 demo 已暂时关闭鉴权，方便面试官直接查看。
        </p>
      </div>
      <nav className="flex gap-1 border-b">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border-transparent border-b-2 px-3 py-2 text-muted-foreground text-sm hover:border-border hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
