import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  ALLOWED_EVENT_NAMES,
  type AppEvent,
  type EventName,
} from "@/lib/telemetry/events";
import { logEventServer } from "@/lib/telemetry/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    !ALLOWED_EVENT_NAMES.has((body as { name: EventName }).name)
  ) {
    return new NextResponse(null, { status: 400 });
  }

  const session = await auth();
  const event = body as AppEvent;

  await logEventServer({
    ...event,
    userId: session?.user?.id,
    req,
  } as AppEvent & { userId?: string; req?: Request });

  return new NextResponse(null, { status: 204 });
}
