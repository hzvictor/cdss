import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { track, trackBeacon } from "./client";

describe("track — POST /api/events", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts JSON to /api/events with keepalive", () => {
    track({
      name: "result_viewed",
      payload: { assessmentId: "11111111-1111-1111-1111-111111111111" },
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/events");
    const opts = init as RequestInit;
    expect(opts.method).toBe("POST");
    expect((opts.headers as Record<string, string>)["content-type"]).toBe(
      "application/json"
    );
    expect(opts.keepalive).toBe(true);
    const body = JSON.parse(opts.body as string);
    expect(body.name).toBe("result_viewed");
  });

  it("swallows fetch failures (no unhandled rejection)", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline"))
    );
    expect(() =>
      track({
        name: "result_viewed",
        payload: { assessmentId: "x" },
      })
    ).not.toThrow();
  });
});

describe("trackBeacon — prefers navigator.sendBeacon", () => {
  let beaconSpy: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    beaconSpy = vi.fn().mockReturnValue(true);
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("navigator", { sendBeacon: beaconSpy });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls sendBeacon when available", () => {
    trackBeacon({
      name: "assessment_closed",
      payload: {
        assessmentId: "11111111-1111-1111-1111-111111111111",
        viewDurationMs: 12345,
      },
    });
    expect(beaconSpy).toHaveBeenCalledTimes(1);
    const [url, blob] = beaconSpy.mock.calls[0];
    expect(url).toBe("/api/events");
    expect(blob).toBeInstanceOf(Blob);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to fetch when sendBeacon is missing", () => {
    vi.stubGlobal("navigator", {} as Navigator);
    trackBeacon({
      name: "assessment_closed",
      payload: {
        assessmentId: "11111111-1111-1111-1111-111111111111",
        viewDurationMs: 0,
      },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("swallows sendBeacon errors", () => {
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("kaboom");
      },
    });
    expect(() =>
      trackBeacon({
        name: "assessment_closed",
        payload: {
          assessmentId: "11111111-1111-1111-1111-111111111111",
          viewDurationMs: 0,
        },
      })
    ).not.toThrow();
  });
});
