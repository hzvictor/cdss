import type { AppEvent } from "./events";

export function track(event: AppEvent): void {
  try {
    const body = JSON.stringify(event);
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function trackBeacon(event: AppEvent): void {
  try {
    const body = JSON.stringify(event);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" })
      );
    } else {
      track(event);
    }
  } catch {
    /* noop */
  }
}
