"use client";

import { useEffect, useRef, useState } from "react";
import { FollowupChat } from "@/components/cdss/followup-chat";
import type { Advice, Assessment, Evidence } from "@/lib/db/schema";
import { track, trackBeacon } from "@/lib/telemetry/client";

const RISK_META: Record<
  Assessment["riskLevel"],
  {
    label: string;
    accent: string;
    chipBg: string;
    chipFg: string;
    chipBorder: string;
    line: string;
  }
> = {
  high: {
    label: "高风险",
    accent: "立即采取行动",
    chipBg: "bg-[color:var(--cdss-risk-high-bg)]",
    chipFg: "text-[color:var(--cdss-risk-high-fg)]",
    chipBorder: "border-[color:var(--cdss-risk-high-border)]",
    line: "您的描述匹配到高风险特征，请尽快线下就医或在 24 小时内联系医疗团队。",
  },
  medium: {
    label: "中风险",
    accent: "建议尽早处理",
    chipBg: "bg-[color:var(--cdss-risk-medium-bg)]",
    chipFg: "text-[color:var(--cdss-risk-medium-fg)]",
    chipBorder: "border-[color:var(--cdss-risk-medium-border)]",
    line: "您的描述命中中等风险条目，建议联系医疗团队或密切观察。",
  },
  low: {
    label: "低风险",
    accent: "继续观察",
    chipBg: "bg-[color:var(--cdss-risk-low-bg)]",
    chipFg: "text-[color:var(--cdss-risk-low-fg)]",
    chipBorder: "border-[color:var(--cdss-risk-low-border)]",
    line: "未触发高/中风险规则，建议继续观察并记录变化。",
  },
};

const ADVICE_TYPE_LABEL: Record<Advice["type"], string> = {
  immediate_care: "立即就医",
  contact_team: "联系团队",
  monitor: "密切观察",
  record: "继续记录",
};

type Props = {
  assessment: Assessment;
  advice: Advice[];
  evidence: Evidence[];
  totalRulesChecked: number;
};

export function ResultView({
  assessment: a,
  advice: adviceRows,
  evidence: evidenceRows,
  totalRulesChecked,
}: Props) {
  const [contacting, setContacting] = useState(false);
  const [contactStatus, setContactStatus] = useState<
    "idle" | "created" | "error"
  >("idle");
  const viewedRef = useRef(false);
  const enteredAtRef = useRef(Date.now());

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track({ name: "result_viewed", payload: { assessmentId: a.id } });
  }, [a.id]);

  useEffect(() => {
    const fire = () => {
      trackBeacon({
        name: "assessment_closed",
        payload: {
          assessmentId: a.id,
          viewDurationMs: Date.now() - enteredAtRef.current,
        },
      });
    };
    window.addEventListener("pagehide", fire);
    return () => {
      window.removeEventListener("pagehide", fire);
      fire();
    };
  }, [a.id]);

  const onContact = async () => {
    setContacting(true);
    try {
      const res = await fetch("/api/contact-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentId: a.id, channel: "team" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setContactStatus("created");
    } catch {
      setContactStatus("error");
    } finally {
      setContacting(false);
    }
  };

  const meta = RISK_META[a.riskLevel];

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      {/* Verdict */}
      <section
        className="cdss-reveal space-y-6"
        data-risk={a.riskLevel}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid="risk-badge"
            data-risk={a.riskLevel}
            className={`inline-flex items-center gap-2 rounded-none border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${meta.chipBg} ${meta.chipFg} ${meta.chipBorder}`}
          >
            <span className="size-1.5 rounded-none bg-current" />
            {meta.label}
          </span>
          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.18em]">
            · {meta.accent}
          </span>
        </div>

        <h1 className="font-display font-medium text-[color:var(--foreground)] text-3xl leading-[1.2] tracking-tight sm:text-4xl">
          {a.summary}
        </h1>

        <p className="font-zh-serif text-[15px] text-[color:var(--muted-foreground)] leading-[1.7]">
          {meta.line}
        </p>
      </section>

      {/* User input — explicit echo */}
      <section
        className="cdss-reveal cdss-paper-card rounded-none p-6"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.22em]">
            您的描述 · 原文
          </h2>
          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)] tabular-nums">
            {a.inputText.length} 字
          </span>
        </div>
        <p className="whitespace-pre-wrap font-zh-serif text-[15px] text-[color:var(--foreground)] leading-[1.85]">
          {a.inputText}
        </p>
      </section>

      {/* Advice */}
      <section
        className="cdss-reveal space-y-4"
        style={{ animationDelay: "0.2s" }}
      >
        <SectionHeader number="01" title="下一步建议" />
        <div className="space-y-2.5">
          {adviceRows.map((row) => (
            <article
              key={row.id}
              className="flex items-start gap-4 rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)] p-5"
            >
              <span className="mt-0.5 inline-flex shrink-0 items-center rounded-none bg-[color:var(--primary)]/8 px-2.5 py-0.5 font-mono text-[10px] text-[color:var(--primary)] uppercase tracking-[0.16em]">
                {ADVICE_TYPE_LABEL[row.type]}
              </span>
              <div className="flex-1">
                <p className="font-display font-medium text-[15px] text-[color:var(--foreground)]">
                  {row.title}
                </p>
                <p className="mt-1.5 font-zh-serif text-[14px] text-[color:var(--muted-foreground)] leading-[1.7]">
                  {row.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Contact team CTA */}
      {a.shouldContactTeam && (
        <section
          className="cdss-reveal"
          style={{ animationDelay: "0.3s" }}
        >
          <SectionHeader number="02" title="联系医疗团队" />
          <div
            className={`mt-4 rounded-none border ${meta.chipBorder} ${meta.chipBg} p-5`}
          >
            {contactStatus === "created" ? (
              <p className={`font-zh-serif text-[14px] ${meta.chipFg}`}>
                ✓ 已通知团队，请保持电话畅通。如症状加重请立即就医。
              </p>
            ) : contactStatus === "error" ? (
              <p className="font-zh-serif text-[14px] text-[color:var(--destructive)]">
                通知失败，请稍后重试或直接拨打主治医生电话。
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-zh-serif text-[14px] text-[color:var(--foreground)] leading-[1.7]">
                  点击下方按钮通知您的医疗团队，团队将尽快联系您。
                </p>
                <button
                  type="button"
                  onClick={onContact}
                  disabled={contacting}
                  data-testid="contact-team-btn"
                  className="h-10 shrink-0 rounded-none bg-[color:var(--foreground)] px-5 text-[13px] text-[color:var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {contacting ? "通知中…" : "联系团队 →"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Evidence */}
      <section
        className="cdss-reveal space-y-4"
        style={{ animationDelay: "0.4s" }}
      >
        <div className="flex items-baseline justify-between">
          <SectionHeader
            number={a.shouldContactTeam ? "03" : "02"}
            title="命中的规则（评估依据）"
          />
          <span className="font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.18em]">
            已对照 {totalRulesChecked} 条 · 命中 {evidenceRows.length} 条
          </span>
        </div>

        {evidenceRows.length === 0 ? (
          <div className="rounded-none border border-dashed border-[var(--cdss-line)] bg-[var(--cdss-paper)]/40 p-5">
            <p className="font-zh-serif text-[14px] text-[color:var(--foreground)] leading-[1.7]">
              系统已用 v{a.ruleVersion} 规则库对您的描述做了关键词比对，
              <strong>没有匹配到高/中风险条目</strong>。
            </p>
            <p className="mt-2 text-[12px] text-[color:var(--muted-foreground)] leading-relaxed">
              这只代表当前描述未触发规则，并不代表症状一定无大碍。如有顾虑可在下方继续追问，或重新描述更详细的信息。
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {evidenceRows.map((ev) => {
              const sev = RISK_META[ev.severity];
              return (
                <li
                  key={ev.id}
                  className="rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)] p-4"
                >
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-[var(--cdss-rule)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--foreground)]">
                      {ev.ruleId}
                    </code>
                    <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                      {ev.ruleVersion}
                    </span>
                    <span
                      className={`ml-auto rounded-none border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${sev.chipBg} ${sev.chipFg} ${sev.chipBorder}`}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[12px] text-[color:var(--muted-foreground)] leading-relaxed">
                    匹配关键词：
                    {(ev.matchedKeywords as string[]).map((k) => (
                      <span
                        key={k}
                        className="ml-1 inline-block rounded bg-[var(--cdss-rule)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--foreground)]"
                      >
                        {k}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1.5 font-zh-serif text-[12px] text-[color:var(--muted-foreground)] italic leading-relaxed">
                    “…{ev.matchedText}…”
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Followup chat */}
      <section
        className="cdss-reveal"
        style={{ animationDelay: "0.5s" }}
      >
        <FollowupChat assessmentId={a.id} />
      </section>

      {/* Audit */}
      <section
        className="cdss-reveal space-y-4 border-[var(--cdss-line)] border-t pt-8"
        style={{ animationDelay: "0.6s" }}
      >
        <h2 className="font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.22em]">
          🔍 审计信息
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 font-mono text-[11px] sm:grid-cols-2">
          <AuditRow label="规则版本" value={a.ruleVersion} />
          <AuditRow label="模型" value={a.modelId} />
          <AuditRow label="模型版本" value={a.modelVersion} />
          <AuditRow
            label="生成时间"
            value={new Date(a.createdAt).toLocaleString("zh-CN", {
              hour12: false,
            })}
          />
          <AuditRow label="评估 ID" value={a.id} className="sm:col-span-2" />
        </dl>
      </section>
    </div>
  );
}

function SectionHeader({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.22em]">
        · {number}
      </span>
      <h2 className="font-display font-medium text-[color:var(--foreground)] text-xl">
        {title}
      </h2>
    </div>
  );
}

function AuditRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-[var(--cdss-line)]/60 border-b py-1.5 ${className ?? ""}`}
    >
      <dt className="text-[color:var(--muted-foreground)] uppercase tracking-[0.16em]">
        {label}
      </dt>
      <dd className="truncate text-[color:var(--foreground)]" title={value}>
        {value}
      </dd>
    </div>
  );
}
