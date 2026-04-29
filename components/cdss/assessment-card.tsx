"use client";

import { useEffect, useRef, useState } from "react";
import type { Advice, Assessment, Evidence } from "@/lib/db/schema";
import { track, trackBeacon } from "@/lib/telemetry/client";

const RISK_META = {
  high: {
    label: "高风险",
    accent: "立即采取行动",
    chip: "bg-[color:var(--cdss-risk-high-bg)] text-[color:var(--cdss-risk-high-fg)] border-[color:var(--cdss-risk-high-border)]",
  },
  medium: {
    label: "中风险",
    accent: "建议尽早处理",
    chip: "bg-[color:var(--cdss-risk-medium-bg)] text-[color:var(--cdss-risk-medium-fg)] border-[color:var(--cdss-risk-medium-border)]",
  },
  low: {
    label: "低风险",
    accent: "继续观察",
    chip: "bg-[color:var(--cdss-risk-low-bg)] text-[color:var(--cdss-risk-low-fg)] border-[color:var(--cdss-risk-low-border)]",
  },
} as const;

const ADVICE_TYPE_LABEL: Record<Advice["type"], string> = {
  immediate_care: "立即就医",
  contact_team: "联系团队",
  monitor: "密切观察",
  record: "继续记录",
};

export type AssessmentBundle = {
  assessment: Assessment;
  advice: Advice[];
  evidence: Evidence[];
  totalRulesChecked: number;
};

export function AssessmentCard({ bundle }: { bundle: AssessmentBundle }) {
  const {
    assessment: a,
    advice: adviceRows,
    evidence: evidenceRows,
    totalRulesChecked,
  } = bundle;
  const [contactStatus, setContactStatus] = useState<
    "idle" | "loading" | "created" | "error"
  >("idle");
  const viewedRef = useRef(false);
  const enteredAtRef = useRef(Date.now());

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }
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

  const meta = RISK_META[a.riskLevel];

  const onContact = async () => {
    setContactStatus("loading");
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
    }
  };

  return (
    <article
      data-testid="assessment-card"
      data-risk={a.riskLevel}
      className="cdss-paper-card overflow-hidden"
    >
      {/* Verdict header */}
      <header className="space-y-3 border-[var(--cdss-line)] border-b p-5">
        <div className="flex items-center gap-3">
          <span
            data-testid="risk-badge"
            data-risk={a.riskLevel}
            className={`inline-flex items-center gap-2 border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${meta.chip}`}
          >
            <span className="size-1.5 bg-current" />
            {meta.label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
            · {meta.accent}
          </span>
          <span className="ml-auto font-mono text-[10px] tabular-nums text-[color:var(--muted-foreground)]">
            {new Date(a.createdAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <h3 className="font-display font-medium text-[20px] leading-[1.4] text-[color:var(--foreground)]">
          {a.summary}
        </h3>
      </header>

      {/* Original user input */}
      <section className="border-[var(--cdss-line)] border-b bg-[var(--cdss-rule)]/30 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            您的描述 · 原文
          </span>
          <span className="font-mono text-[10px] tabular-nums text-[color:var(--muted-foreground)]">
            {a.inputText.length} 字
          </span>
        </div>
        <p className="whitespace-pre-wrap font-zh-serif text-[14px] leading-[1.75] text-[color:var(--foreground)]">
          {a.inputText}
        </p>
      </section>

      {/* Advice list (full, not truncated) */}
      <section>
        <SectionLabel number="01" title="下一步建议" />
        <div className="divide-y divide-[var(--cdss-line)]/50">
          {adviceRows.map((row) => (
            <div key={row.id} className="flex items-start gap-3 px-5 py-3.5">
              <span className="mt-0.5 inline-flex shrink-0 items-center bg-[color:var(--primary)]/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--primary)]">
                {ADVICE_TYPE_LABEL[row.type]}
              </span>
              <div className="flex-1">
                <p className="font-display font-medium text-[14px] text-[color:var(--foreground)]">
                  {row.title}
                </p>
                <p className="mt-0.5 font-zh-serif text-[13px] leading-[1.7] text-[color:var(--muted-foreground)]">
                  {row.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact-team CTA */}
      {a.shouldContactTeam && (
        <section
          className={`flex items-center justify-between gap-3 border-[var(--cdss-line)] border-t border-b px-5 py-3 ${meta.chip}`}
        >
          <p className="font-zh-serif text-[13px] leading-[1.5]">
            {contactStatus === "created"
              ? "已通知团队，请保持电话畅通。如症状加重立即就医。"
              : contactStatus === "error"
                ? "通知失败，请稍后重试或直接拨打主治医生电话。"
                : "需要医疗团队介入吗？一键通知。"}
          </p>
          {contactStatus === "idle" || contactStatus === "loading" ? (
            <button
              type="button"
              onClick={() => {
                track({
                  name: "contact_team_clicked",
                  payload: { assessmentId: a.id, channel: "team" },
                });
                onContact();
              }}
              disabled={contactStatus === "loading"}
              data-testid="contact-team-btn"
              className="h-8 shrink-0 bg-[color:var(--foreground)] px-4 text-[12px] text-[color:var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {contactStatus === "loading" ? "通知中…" : "联系团队"}
            </button>
          ) : null}
        </section>
      )}

      {/* Evidence (always expanded) */}
      <section>
        <SectionLabel
          number={a.shouldContactTeam ? "02" : "02"}
          title="命中规则（评估依据）"
          aside={`已对照 ${totalRulesChecked} 条 · 命中 ${evidenceRows.length} 条`}
        />
        {evidenceRows.length === 0 ? (
          <p className="px-5 py-4 font-zh-serif text-[13px] leading-relaxed text-[color:var(--muted-foreground)]">
            系统已用 v{a.ruleVersion} 规则库做过关键词比对，未匹配到高/中风险条目。
            如有顾虑请在下方继续追问，或描述更详细的信息。
          </p>
        ) : (
          <ul className="divide-y divide-[var(--cdss-line)]/40">
            {evidenceRows.map((ev) => {
              const sev = RISK_META[ev.severity];
              return (
                <li key={ev.id} className="space-y-1.5 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <code className="bg-[var(--cdss-rule)] px-1.5 py-0.5 font-mono text-[11px]">
                      {ev.ruleId}
                    </code>
                    <span className="font-mono text-[10px] text-[color:var(--muted-foreground)]">
                      {ev.ruleVersion}
                    </span>
                    <span
                      className={`ml-auto border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sev.chip}`}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-[color:var(--muted-foreground)]">
                    关键词:{" "}
                    {(ev.matchedKeywords as string[]).map((k) => (
                      <span
                        key={k}
                        className="ml-1 inline-block bg-[var(--cdss-rule)] px-1.5 font-mono text-[10px]"
                      >
                        {k}
                      </span>
                    ))}
                  </p>
                  <p className="font-zh-serif text-[12px] italic leading-relaxed text-[color:var(--muted-foreground)]">
                    “…{ev.matchedText}…”
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Audit footer */}
      <footer className="border-[var(--cdss-line)] border-t bg-[var(--cdss-rule)]/30 p-5">
        <SectionLabel number="03" title="审计信息" inline />
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 font-mono text-[10px] sm:grid-cols-2">
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
      </footer>
    </article>
  );
}

function SectionLabel({
  number,
  title,
  aside,
  inline,
}: {
  number: string;
  title: string;
  aside?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${inline ? "" : "border-[var(--cdss-line)] border-b px-5 py-2.5"}`}
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
          · {number}
        </span>
        <span className="font-display font-medium text-[13px] text-[color:var(--foreground)]">
          {title}
        </span>
      </div>
      {aside && (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
          {aside}
        </span>
      )}
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
      className={`flex items-baseline justify-between gap-3 ${className ?? ""}`}
    >
      <dt className="uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
        {label}
      </dt>
      <dd
        className="truncate text-[color:var(--foreground)]"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
