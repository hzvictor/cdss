"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onCrossTabSync,
  readCached,
  type RulesPayload,
  syncRules,
  type SyncOutcome,
} from "@/lib/cache/rules-cache";

type Source = "idle" | "cache" | "not-modified" | "incremental" | "network";

type State = {
  payload: RulesPayload | null;
  source: Source;
  lastOutcome: SyncOutcome["kind"] | "idle";
  changedCount: number;
  error: string | null;
  refreshing: boolean;
};

const initial: State = {
  payload: null,
  source: "idle",
  lastOutcome: "idle",
  changedCount: 0,
  error: null,
  refreshing: false,
};

export function useRules() {
  const [state, setState] = useState<State>(initial);

  const refresh = useCallback(async (force = false) => {
    setState((s) => ({ ...s, refreshing: true, error: null }));
    const out = await syncRules(force);
    if (out.kind === "error") {
      setState((s) => ({ ...s, error: out.error, refreshing: false }));
      return;
    }
    setState({
      payload: out.payload,
      source:
        out.kind === "cache-hit"
          ? "cache"
          : out.kind === "not-modified"
            ? "not-modified"
            : out.kind === "incremental"
              ? "incremental"
              : "network",
      lastOutcome: out.kind,
      changedCount: out.kind === "incremental" ? out.changed : 0,
      error: null,
      refreshing: false,
    });
  }, []);

  // Initial sync on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cross-tab: when another tab updates IndexedDB, re-read cache (no network)
  useEffect(() => {
    return onCrossTabSync(async () => {
      const cached = await readCached();
      if (cached) {
        setState((s) => ({ ...s, payload: cached }));
      }
    });
  }, []);

  return { ...state, refresh: () => refresh(true) };
}
