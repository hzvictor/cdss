import { z } from "zod";

export const EVENT_NAMES = [
  "assessment_started",
  "assessment_submitted",
  "result_viewed",
  "contact_team_clicked",
  "assessment_closed",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const uuid = z.string().uuid();
const riskLevel = z.enum(["high", "medium", "low"]);
const nonNegInt = z.number().int().nonnegative();

export const AppEventSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("assessment_started"),
    payload: z.object({
      hasInput: z.boolean(),
      inputLength: nonNegInt.max(10_000),
    }),
  }),
  z.object({
    name: z.literal("assessment_submitted"),
    payload: z.object({
      assessmentId: uuid,
      riskLevel,
      durationMs: nonNegInt.max(600_000),
    }),
  }),
  z.object({
    name: z.literal("result_viewed"),
    payload: z.object({ assessmentId: uuid }),
  }),
  z.object({
    name: z.literal("contact_team_clicked"),
    payload: z.object({
      assessmentId: uuid,
      channel: z.enum(["team", "emergency"]),
    }),
  }),
  z.object({
    name: z.literal("assessment_closed"),
    payload: z.object({
      assessmentId: uuid,
      viewDurationMs: nonNegInt.max(24 * 60 * 60 * 1000),
    }),
  }),
]);

export type AppEvent = z.infer<typeof AppEventSchema>;

export const ALLOWED_EVENT_NAMES: ReadonlySet<EventName> = new Set(
  EVENT_NAMES
);
