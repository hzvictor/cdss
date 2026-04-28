import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/app/(auth)/auth";
import { isAdminEmail } from "@/lib/auth/admin";

export default async function CdssLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Admin pages are public for the demo. Keep the link visible to all users.
  const isAdmin = true;
  const emailSnippet = session.user.email
    ? maskEmail(session.user.email)
    : "guest";

  return (
    <div className="cdss-theme cdss-grain flex min-h-dvh flex-col">
      <header className="border-[var(--cdss-line)] border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/assess"
            className="group flex items-center gap-3"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--cdss-line)] bg-[var(--cdss-paper)]">
              <span className="font-display font-semibold text-[15px] text-[color:var(--primary)]">
                C
              </span>
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display font-medium text-[15px] tracking-tight">
                副作用评估
              </span>
              <span className="text-[10px] text-[color:var(--muted-foreground)] uppercase tracking-[0.18em]">
                Care Decision Support
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/assess">新评估</NavLink>
            <NavLink href="/history">历史</NavLink>
            {isAdmin && <NavLink href="/admin/assessments">管理</NavLink>}
            <span className="ml-3 hidden border-[var(--cdss-line)] border-l pl-3 text-[11px] text-[color:var(--muted-foreground)] sm:inline">
              {emailSnippet}
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
        {children}
      </main>

      <footer className="mt-12 border-[var(--cdss-line)] border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-6 text-[11px] text-[color:var(--muted-foreground)] leading-relaxed sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="text-[color:var(--foreground)]">
              本工具为面试 demo 原型，
            </span>
            不构成医学建议。紧急情况请立即拨打 120 或前往最近的急诊科。
          </p>
          <p className="font-mono uppercase tracking-[0.2em]">
            v0.1 · 规则引擎 v1
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-[color:var(--muted-foreground)] transition-colors hover:bg-[var(--cdss-rule)] hover:text-[color:var(--foreground)]"
    >
      {children}
    </Link>
  );
}

function maskEmail(email: string): string {
  if (email.includes("guest-")) return "guest";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return email;
  return `${local.slice(0, 2)}…@${domain}`;
}
