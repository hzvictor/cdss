import { eq } from "drizzle-orm";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/client";
import { advice, assessment, evidence } from "@/lib/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const FOLLOWUP_MODEL = "moonshotai/kimi-k2.5";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }
  const { id } = await params;
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const [a] = await db
    .select()
    .from(assessment)
    .where(eq(assessment.id, id))
    .limit(1);
  if (!a || a.userId !== session.user.id) {
    return new Response("forbidden", { status: 403 });
  }

  const [adviceRows, evidenceRows] = await Promise.all([
    db.select().from(advice).where(eq(advice.assessmentId, id)),
    db.select().from(evidence).where(eq(evidence.assessmentId, id)),
  ]);

  const ruleSummary = evidenceRows.length
    ? evidenceRows
        .map((e) => `${e.ruleId}@${e.ruleVersion}（${e.severity}）`)
        .join("、")
    : "无明确高/中风险规则命中";
  const adviceSummary = adviceRows
    .sort((x, y) => x.priority - y.priority)
    .map((r) => `[${r.title}] ${r.description}`)
    .join("\n");

  const system = `你是一位耐心、温和的乳腺癌副作用咨询助手。下面是当前用户的评估上下文，你的回答必须严格围绕这次评估，不要给出新的医学诊断。

【用户描述】
${a.inputText}

【风险等级】${a.riskLevel}
【是否建议联系团队】${a.shouldContactTeam ? "是" : "否"}
【命中规则】${ruleSummary}

【已生成的建议】
${adviceSummary}

【边界要求】
1. 不要重新诊断，不要给出处方、药物剂量。
2. 高风险情况下，始终提醒尽快就医或联系团队。
3. 如果用户问的事超出当前评估范围（例如别的症状），请提示重新做一次评估。
4. 回复尽量简短（不超过 120 字），口吻温和，避免医学术语堆砌。`;

  const result = streamText({
    model: FOLLOWUP_MODEL,
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
