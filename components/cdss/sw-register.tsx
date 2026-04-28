"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      // Skip SW in dev to avoid stale routing while iterating.
      return;
    }
    const url = "/sw-cdss.js";
    navigator.serviceWorker
      .register(url, { scope: "/" })
      .catch(() => {
        /* swallow — non-critical */
      });
  }, []);
  return null;
}
