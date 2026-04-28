"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/telemetry/client";

const EXAMPLES = [
  { label: "化疗后高热", text: "化疗后第 3 天发热到 39 度，伴轻微咳嗽。" },
  { label: "持续呕吐", text: "持续呕吐两天，水都喝不下，体力越来越差。" },
  { label: "脱发与疲劳", text: "最近一周脱发明显，伴随疲劳。" },
];

const MIN_LEN = 2;
const MAX_LEN = 4000;

export function AssessForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track({
      name: "assessment_started",
      payload: { hasInput: false, inputLength: 0 },
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (input.trim().length < MIN_LEN) {
      setError(`请至少输入 ${MIN_LEN} 个字`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputText: input }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { assessmentId } = (await res.json()) as { assessmentId: string };
      router.push(`/assess/${assessmentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
      setSubmitting(false);
    }
  };

  const charCount = input.length;
  const canSubmit = !submitting && input.trim().length >= MIN_LEN;

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="relative">
        <label
          htmlFor="symptom-input"
          className="mb-2 block font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.2em]"
        >
          您的描述
        </label>
        <textarea
          id="symptom-input"
          aria-label="副作用描述"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
          placeholder="例：化疗后第 3 天起出现持续低烧，体温波动在 37.8 ~ 38.2 度之间……"
          rows={6}
          disabled={submitting}
          className="w-full resize-none rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)] px-4 py-3 font-zh-serif text-[15px] leading-[1.7] text-[color:var(--foreground)] outline-none transition-colors placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--primary)]/50 focus:bg-[var(--cdss-paper)] focus:ring-2 focus:ring-[color:var(--primary)]/10 disabled:opacity-60"
        />
        <div className="absolute right-3 bottom-3 font-mono text-[10px] text-[color:var(--muted-foreground)] tabular-nums">
          {charCount} / {MAX_LEN}
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.2em]">
          快速示例
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex.label}
              disabled={submitting}
              onClick={() => setInput(ex.text)}
              className="group rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)]/60 px-3 py-1.5 text-[12px] text-[color:var(--muted-foreground)] transition-all hover:border-[color:var(--primary)]/30 hover:bg-[var(--cdss-paper)] hover:text-[color:var(--foreground)] disabled:opacity-50"
            >
              <span className="text-[color:var(--primary)]/70 group-hover:text-[color:var(--primary)]">
                ›
              </span>{" "}
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          className="rounded-none border border-[var(--cdss-risk-high-border)] bg-[var(--cdss-risk-high-bg)] px-3 py-2 text-[color:var(--cdss-risk-high-fg)] text-sm"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-[11px] text-[color:var(--muted-foreground)]">
          提交后将进入结果页，可继续与系统对话。
        </p>
        <Button
          type="submit"
          disabled={!canSubmit}
          data-testid="assess-submit"
          className="h-11 rounded-none bg-[color:var(--primary)] px-6 font-medium text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary)]/90 disabled:opacity-40"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="size-1.5 animate-ping rounded-none bg-current" />
              评估中
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              开始评估
              <span aria-hidden>→</span>
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
