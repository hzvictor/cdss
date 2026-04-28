import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/client";
import { assessment, contactRequest } from "@/lib/db/schema";
import { logEventServer } from "@/lib/telemetry/server";

export const runtime = "nodejs";

const Body = z.object({
  assessmentId: z.string().uuid(),
  channel: z.enum(["team", "emergency"]).default("team"),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const [a] = await db
    .select({ id: assessment.id, userId: assessment.userId })
    .from(assessment)
    .where(eq(assessment.id, parsed.assessmentId))
    .limit(1);

  if (!a) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (a.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const existing = await db
    .select()
    .from(contactRequest)
    .where(
      and(
        eq(contactRequest.assessmentId, parsed.assessmentId),
        eq(contactRequest.userId, session.user.id),
        eq(contactRequest.channel, parsed.channel)
      )
    )
    .limit(1);

  let row = existing[0];
  if (row) {
    [row] = await db
      .update(contactRequest)
      .set({ status: "created", note: parsed.note ?? row.note, updatedAt: new Date() })
      .where(eq(contactRequest.id, row.id))
      .returning();
  } else {
    [row] = await db
      .insert(contactRequest)
      .values({
        assessmentId: parsed.assessmentId,
        userId: session.user.id,
        channel: parsed.channel,
        status: "created",
        note: parsed.note,
      })
      .returning();
  }

  await logEventServer({
    name: "contact_team_clicked",
    payload: { assessmentId: parsed.assessmentId, channel: parsed.channel },
    userId: session.user.id,
    assessmentId: parsed.assessmentId,
    req,
  });

  return NextResponse.json({ contactRequest: row }, { status: 201 });
}
