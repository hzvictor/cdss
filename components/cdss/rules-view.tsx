"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useRules } from "@/hooks/use-rules";
import { clearCache } from "@/lib/cache/rules-cache";

const SEV_BADGE = {
  high: {
    label: "高",
    className:
      "bg-red-500/10 text-red-600 border-red-500/30",
  },
  medium: {
    label: "中",
    className:
      "bg-amber-500/10 text-amber-700 border-amber-500/30",
  },
  low: {
    label: "低",
    className:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  },
} as const;

const SOURCE_LABEL = {
  idle: "等待加载",
  cache: "IndexedDB 缓存命中",
  "not-modified": "服务器 304 · 缓存仍有效",
  incremental: "增量同步 · 仅拉取变更",
  network: "全量从服务器加载",
} as const;

export function RulesView() {
  const {
    payload,
    source,
    lastOutcome,
    changedCount,
    error,
    refreshing,
    refresh,
  } = useRules();
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all"
  );

  const rules = useMemo(() => {
    if (!payload) return [];
    if (filter === "all") return payload.rules;
    return payload.rules.filter((r) => r.severity === filter);
  }, [payload, filter]);

  const counts = useMemo(() => {
    if (!payload) return { high: 0, medium: 0, low: 0 };
    return payload.rules.reduce(
      (acc, r) => {
        acc[r.severity] = (acc[r.severity] ?? 0) + 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 } as Record<string, number>
    );
  }, [payload]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border bg-muted/20 p-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
            数据源
          </span>
          <span className="rounded-none border bg-background px-2 py-0.5 font-mono text-[10px]">
            {SOURCE_LABEL[source as keyof typeof SOURCE_LABEL] ?? source}
          </span>
          {lastOutcome === "incremental" && changedCount > 0 && (
            <span className="rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-700">
              +{changedCount} 条变更
            </span>
          )}
          {payload && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                version <strong>{payload.version}</strong> · {payload.count} 条
                · 同步于{" "}
                {new Date(payload.fetchedAt).toLocaleTimeString("zh-CN", {
                  hour12: false,
                })}
              </span>
            </>
          )}
          {refreshing && (
            <span className="font-mono text-[10px] text-amber-600">
              正在同步…
            </span>
          )}
          {error && (
            <span className="font-mono text-[10px] text-red-600">
              错误：{error}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-none border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:bg-muted"
          >
            强制刷新
          </button>
          <button
            type="button"
            onClick={async () => {
              await clearCache();
              refresh();
            }}
            className="rounded-none border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:bg-muted"
          >
            清空 IndexedDB
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`全部 ${payload?.count ?? 0}`}
        />
        <FilterChip
          active={filter === "high"}
          onClick={() => setFilter("high")}
          label={`高 ${counts.high ?? 0}`}
          variant="high"
        />
        <FilterChip
          active={filter === "medium"}
          onClick={() => setFilter("medium")}
          label={`中 ${counts.medium ?? 0}`}
          variant="medium"
        />
        <FilterChip
          active={filter === "low"}
          onClick={() => setFilter("low")}
          label={`低 ${counts.low ?? 0}`}
          variant="low"
        />
      </div>

      <div className="rounded-none border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">版本</th>
              <th className="px-3 py-2 text-left">名称</th>
              <th className="px-3 py-2 text-left">等级</th>
              <th className="px-3 py-2 text-left">关键词</th>
              <th className="px-3 py-2 text-left">建议模板</th>
              <th className="px-3 py-2 text-left">启用</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((row) => (
              <tr key={`${row.id}-${row.version}`} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.version}</td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={SEV_BADGE[row.severity].className}
                  >
                    {SEV_BADGE[row.severity].label}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {(row.keywords as string[]).join("、")}
                </td>
                <td className="max-w-sm truncate px-3 py-2 text-muted-foreground text-xs">
                  {row.adviceTemplate}
                </td>
                <td className="px-3 py-2">{row.isActive ? "✓" : "—"}</td>
              </tr>
            ))}
            {!payload && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-muted-foreground text-xs"
                >
                  正在从 IndexedDB / 服务器加载…
                </td>
              </tr>
            )}
            {payload && rules.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-muted-foreground text-xs"
                >
                  当前过滤无匹配规则
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        IndexedDB DB <code className="rounded bg-muted px-1 py-0.5">cdss-rules</code>{" "}
        · stores <code className="rounded bg-muted px-1 py-0.5">rules</code>{" "}
        和 <code className="rounded bg-muted px-1 py-0.5">meta</code>{" "}
        · 缓存 5 分钟过期，过期后后台拉一次 <code className="rounded bg-muted px-1 py-0.5">/api/rules</code>。
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  variant?: "high" | "medium" | "low";
}) {
  const classes = active
    ? variant
      ? SEV_BADGE[variant].className
      : "bg-foreground text-background border-foreground"
    : "bg-background text-muted-foreground border-border hover:text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-none border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${classes}`}
    >
      {label}
    </button>
  );
}
