"use client";

import { useRouter } from "next/navigation";
import { suggestions } from "@/lib/constants";

export function Preview() {
  const router = useRouter();

  const handleAction = (query?: string) => {
    const url = query ? `/?query=${encodeURIComponent(query)}` : "/";
    router.push(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-tl-2xl">
      <div className="flex h-14 shrink-0 items-center gap-3 border-[var(--cdss-line)] border-b px-5">
        <span className="grid size-7 place-items-center rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)]">
          <span className="font-display font-semibold text-[13px] text-[color:var(--primary)]">
            C
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">
          Breast Cancer CDSS
        </span>
      </div>

      <div className="flex flex-1 flex-col items-stretch justify-center gap-10 px-10">
        <div className="space-y-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">
            Side-Effect Triage
          </p>
          <div className="h-px w-12 bg-[var(--cdss-line)]" aria-hidden />
          <h2 className="font-display font-medium text-[40px] leading-[1.05] tracking-tight">
            请描述您
            <br />
            治疗期间的<span className="italic">不适</span>
          </h2>
          <p className="max-w-md font-zh-serif text-[15px] leading-[1.75] text-[color:var(--muted-foreground)]">
            162 条规则字典 + AI 抽取 · 每条结论可追溯到具体规则编号
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            从下面任选一条开始 · 或直接在底部输入
          </p>
          <ul className="divide-y divide-[var(--cdss-line)] border-y border-[var(--cdss-line)]">
            {suggestions.map((suggestion, i) => (
              <li key={suggestion}>
                <button
                  className="group flex w-full items-baseline gap-4 px-1 py-3 text-left transition-colors hover:bg-[var(--cdss-rule)]/40"
                  onClick={() => handleAction(suggestion)}
                  type="button"
                >
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-zh-serif text-[15px] leading-relaxed text-[color:var(--foreground)]">
                    {suggestion}
                  </span>
                  <span
                    aria-hidden
                    className="font-mono text-[14px] text-[color:var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="shrink-0 px-10 pb-6">
        <button
          className="flex w-full items-baseline justify-between gap-3 border-[var(--cdss-line)] border-t pt-5 text-left transition-colors"
          onClick={() => handleAction()}
          type="button"
        >
          <span className="font-zh-serif text-[15px] text-[color:var(--muted-foreground)]/70">
            请描述您最近的不适…
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--primary)]/80">
            开始 →
          </span>
        </button>
      </div>
    </div>
  );
}
