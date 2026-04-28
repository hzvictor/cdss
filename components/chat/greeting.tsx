"use client";

import { motion } from "framer-motion";

const SCOPE = [
  { code: "BCS", label: "乳腺癌专属", example: "淋巴水肿、HER2 心毒性、内分泌治疗潮热、可疑复发" },
  { code: "HEM", label: "血液系统", example: "AC-T 后粒缺伴发热、CDK4/6 引起的中性粒减少" },
  { code: "NEU", label: "神经系统", example: "紫杉类周围神经病变、剧烈头痛" },
  { code: "GAS", label: "消化系统", example: "化疗后持续呕吐、严重腹泻、便血" },
  { code: "DER", label: "皮肤反应", example: "卡培他滨手足综合征、脱发、皮疹" },
  { code: "CON", label: "全身症状", example: "高热、AI 关节痛、骨密度下降" },
];

const REGIMENS = [
  "AC-T",
  "TC",
  "TCH(P)",
  "Trastuzumab",
  "Tamoxifen",
  "AI",
  "CDK4/6",
  "PARP",
];

export const Greeting = () => {
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col items-stretch px-6"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
        initial={{ opacity: 0, y: 8 }}
        transition={{ delay: 0.15, duration: 0.5, ease }}
      >
        Breast Cancer · Side-Effect Triage
      </motion.div>

      <motion.div
        aria-hidden
        animate={{ scaleX: 1, opacity: 1 }}
        className="mt-3 h-px origin-left bg-[var(--cdss-line)]"
        initial={{ scaleX: 0, opacity: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease }}
      />

      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 font-display font-medium text-[44px] leading-[1.05] tracking-tight text-foreground sm:text-[56px]"
        initial={{ opacity: 0, y: 12 }}
        transition={{ delay: 0.35, duration: 0.55, ease }}
      >
        请描述您
        <br className="sm:hidden" />
        在治疗期间的
        <span className="font-display italic"> 不适</span>
      </motion.h1>

      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 max-w-xl font-zh-serif text-[17px] leading-[1.85] text-muted-foreground"
        initial={{ opacity: 0, y: 12 }}
        transition={{ delay: 0.5, duration: 0.55, ease }}
      >
        本系统专为乳腺癌患者设计，覆盖
        <span className="text-foreground"> 化疗、HER2 靶向、内分泌、CDK4/6 / PARP </span>
        各阶段。结合
        <span className="text-foreground"> 162 条规则字典 </span>
        与
        <span className="text-foreground"> AI 抽取 </span>
        给出风险等级与下一步建议；每一条结论都可追溯到具体规则编号与版本。
      </motion.p>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2"
        initial={{ opacity: 0, y: 12 }}
        transition={{ delay: 0.55, duration: 0.55, ease }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          适用方案
        </span>
        {REGIMENS.map((r) => (
          <span
            key={r}
            className="border border-[var(--cdss-line)] px-2 py-0.5 font-mono text-[11px] tracking-wide text-foreground"
          >
            {r}
          </span>
        ))}
      </motion.div>

      <motion.dl
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 grid grid-cols-1 divide-y divide-[var(--cdss-line)] border-y border-[var(--cdss-line)] sm:grid-cols-2 sm:divide-x sm:divide-y-0"
        initial={{ opacity: 0, y: 12 }}
        transition={{ delay: 0.65, duration: 0.55, ease }}
      >
        {SCOPE.map((s, i) => (
          <div
            key={s.code}
            className={`flex items-baseline gap-4 px-1 py-3 sm:px-4 ${
              i >= 2 && i % 2 === 0 ? "sm:border-t sm:border-[var(--cdss-line)]" : ""
            } ${i >= 2 && i % 2 === 1 ? "sm:border-t sm:border-[var(--cdss-line)]" : ""}`}
          >
            <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {s.code}
            </dt>
            <div className="flex-1">
              <p className="font-display text-[15px] font-medium text-foreground">
                {s.label}
              </p>
              <p className="mt-0.5 font-zh-serif text-[13px] leading-relaxed text-muted-foreground">
                {s.example}
              </p>
            </div>
          </div>
        ))}
      </motion.dl>

      <motion.div
        animate={{ opacity: 1 }}
        className="mt-8 flex flex-wrap items-baseline justify-between gap-3 text-[12px] text-muted-foreground"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.85, duration: 0.5, ease }}
      >
        <p className="font-zh-serif italic leading-relaxed">
          本工具为面试 demo 原型，
          <span className="text-foreground/80">不构成医学建议</span>
          。如出现紧急情况请立即拨打 120 或前往急诊。
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
          rules v2 · model gateway
        </p>
      </motion.div>
    </div>
  );
};
