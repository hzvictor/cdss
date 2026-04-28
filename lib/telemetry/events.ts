export const EVENT_NAMES = [
  "assessment_started",
  "assessment_submitted",
  "result_viewed",
  "contact_team_clicked",
  "assessment_closed",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type AppEvent =
  | {
      name: "assessment_started";
      payload: { hasInput: boolean; inputLength: number };
    }
  | {
      name: "assessment_submitted";
      payload: {
        assessmentId: string;
        riskLevel: "high" | "medium" | "low";
        durationMs: number;
      };
    }
  | { name: "result_viewed"; payload: { assessmentId: string } }
  | {
      name: "contact_team_clicked";
      payload: { assessmentId: string; channel: "team" | "emergency" };
    }
  | {
      name: "assessment_closed";
      payload: { assessmentId: string; viewDurationMs: number };
    };

export const ALLOWED_EVENT_NAMES: ReadonlySet<EventName> = new Set(
  EVENT_NAMES
);
