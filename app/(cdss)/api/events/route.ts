import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { AppEventSchema } from "@/lib/telemetry/events";
import { logEventServer } from "@/lib/telemetry/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const parsed = AppEventSchema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse(null, { status: 400 });
  }

  const session = await auth();

  await logEventServer({
    ...parsed.data,
    userId: session?.user?.id,
    req,
  });

  return new NextResponse(null, { status: 204 });
}
