import "server-only";

import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { eventLog } from "@/lib/db/schema";
import { ALLOWED_EVENT_NAMES, type AppEvent } from "./events";

const IP_SALT = process.env.TELEMETRY_IP_SALT ?? "cdss-telemetry";

type LogContext = {
  userId?: string;
  assessmentId?: string;
  req?: Request;
};

function hashIp(req: Request): string | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  if (!ip) return null;
  return createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex");
}

/**
 * 服务端打点：直接 INSERT event_log。
 * 失败不抛出，不阻塞业务路径。
 */
export async function logEventServer(
  event: AppEvent & LogContext
): Promise<void> {
  if (!ALLOWED_EVENT_NAMES.has(event.name)) {
    return;
  }

  const assessmentId =
    event.assessmentId ??
    ("assessmentId" in event.payload
      ? (event.payload as { assessmentId?: string }).assessmentId
      : undefined);

  try {
    await db.insert(eventLog).values({
      userId: event.userId ?? null,
      assessmentId: assessmentId ?? null,
      eventName: event.name,
      payload: event.payload,
      userAgent: event.req?.headers.get("user-agent") ?? null,
      ipHash: event.req ? hashIp(event.req) : null,
    });
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: telemetry fallback
    console.error("[telemetry] failed", event.name, err);
  }
}
