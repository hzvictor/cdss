"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { type FormEvent, useState } from "react";

const SUGGESTED_PROMPTS = [
  "我应该现在就去医院吗？",
  "在等待联系团队前，我可以做什么？",
  "这种情况要避免哪些食物？",
];

export function FollowupChat({ assessmentId }: { assessmentId: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/assessment/${assessmentId}/chat`,
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="font-display font-medium text-[color:var(--foreground)] text-xl">
          继续追问
        </h2>
        <span className="font-mono text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.2em]">
          基于当前评估上下文
        </span>
      </header>

      <div className="cdss-paper-card overflow-hidden rounded-none">
        <div className="max-h-[420px] overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="space-y-3 py-6">
              <p className="text-[13px] text-[color:var(--muted-foreground)] leading-relaxed">
                助手已加载本次评估的上下文（您的描述、命中规则、风险等级与建议）。可以继续追问以下方向：
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendMessage({ text: p })}
                    disabled={isStreaming}
                    className="rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)] px-3 py-1.5 text-[12px] text-[color:var(--muted-foreground)] transition-colors hover:border-[color:var(--primary)]/40 hover:text-[color:var(--foreground)] disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="space-y-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-none bg-[color:var(--primary)]/8 px-4 py-2.5 font-zh-serif text-[14px] text-[color:var(--foreground)] leading-[1.65]"
                        : "max-w-[85%] rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)] px-4 py-2.5 font-zh-serif text-[14px] text-[color:var(--foreground)] leading-[1.65]"
                    }
                  >
                    <MessageContent message={m} />
                  </div>
                </li>
              ))}
              {isStreaming && messages.at(-1)?.role === "user" && (
                <li className="flex justify-start">
                  <div className="rounded-none border border-[var(--cdss-line)] bg-[var(--cdss-paper)] px-4 py-3">
                    <ThinkingDots />
                  </div>
                </li>
              )}
            </ol>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-[var(--cdss-line)] border-t bg-[var(--cdss-paper)] px-3 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStreaming ? "助手正在回答…" : "继续问点什么？"}
            disabled={isStreaming}
            data-testid="followup-input"
            className="h-10 flex-1 bg-transparent px-2 text-[14px] outline-none placeholder:text-[color:var(--muted-foreground)] disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={() => stop()}
              className="h-9 rounded-none bg-[color:var(--destructive)]/10 px-4 text-[12px] text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/15"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              data-testid="followup-send"
              className="h-9 rounded-none bg-[color:var(--primary)] px-4 text-[12px] text-[color:var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              发送
            </button>
          )}
        </form>
      </div>
    </section>
  );
}

function MessageContent({
  message,
}: {
  message: { parts?: { type: string; text?: string }[]; content?: string };
}) {
  const text =
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("") ?? message.content ?? "";
  return <p className="whitespace-pre-wrap">{text}</p>;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-1.5 animate-pulse rounded-none bg-[color:var(--muted-foreground)] [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-pulse rounded-none bg-[color:var(--muted-foreground)] [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-pulse rounded-none bg-[color:var(--muted-foreground)]" />
    </div>
  );
}
