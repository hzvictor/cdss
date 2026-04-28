"use client";

/**
 * IndexedDB cache for the CDSS rule dictionary.
 *
 * Schema:
 *   - rules:  keyPath ["id", "version"]            — full rule rows
 *   - meta:   keyPath "key", single row "current"  — version, ETag, sync timestamp
 *
 * Sync strategy (read-through, offline-first):
 *   1. readCached() — return whatever's local
 *   2. fetchFresh() — GET /api/rules with If-None-Match (ETag) and ?since=<lastSync>
 *      - 304               → keep cache, only bump syncedAt
 *      - 200 incremental   → upsert returned rows, replace meta.etag
 *      - 200 full          → wipe + replace
 *   3. broadcastChange() — notify other tabs via BroadcastChannel("cdss-rules")
 *
 * Cross-tab: tabs subscribe to BroadcastChannel and call readCached() to refresh
 * UI without re-fetching. Implements last-writer-wins on meta.
 */

import type { RuleSource } from "@/lib/db/schema";

const DB_NAME = "cdss-rules";
const DB_VERSION = 1;
const STORE_RULES = "rules";
const STORE_META = "meta";
const TTL_MS = 5 * 60 * 1000;
const BROADCAST_CHANNEL = "cdss-rules";

export type RulesPayload = {
  version: string;
  fetchedAt: string;
  count: number;
  mode?: "full" | "incremental";
  since?: string | null;
  rules: RuleSource[];
};

type MetaRow = {
  key: "current";
  version: string;
  fetchedAt: string;
  count: number;
  etag: string | null;
  syncedAt: number;
};

export type SyncOutcome =
  | { kind: "cache-hit"; reason: "fresh"; payload: RulesPayload }
  | { kind: "not-modified"; payload: RulesPayload }
  | { kind: "incremental"; changed: number; payload: RulesPayload }
  | { kind: "full-replace"; payload: RulesPayload }
  | { kind: "error"; error: string };

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RULES)) {
        db.createObjectStore(STORE_RULES, { keyPath: ["id", "version"] });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function readMeta(): Promise<MetaRow | null> {
  if (!isBrowser()) return null;
  const db = await openDb();
  try {
    return await new Promise<MetaRow | null>((res, rej) => {
      const tx = db.transaction(STORE_META, "readonly");
      const req = tx.objectStore(STORE_META).get("current");
      req.onsuccess = () => res((req.result as MetaRow | undefined) ?? null);
      req.onerror = () => rej(req.error);
    });
  } finally {
    db.close();
  }
}

async function readAllRules(): Promise<RuleSource[]> {
  if (!isBrowser()) return [];
  const db = await openDb();
  try {
    return await new Promise<RuleSource[]>((res, rej) => {
      const tx = db.transaction(STORE_RULES, "readonly");
      const req = tx.objectStore(STORE_RULES).getAll();
      req.onsuccess = () => res(req.result as RuleSource[]);
      req.onerror = () => rej(req.error);
    });
  } finally {
    db.close();
  }
}

export async function readCached(): Promise<RulesPayload | null> {
  const meta = await readMeta();
  if (!meta) return null;
  const rules = await readAllRules();
  return {
    version: meta.version,
    fetchedAt: meta.fetchedAt,
    count: meta.count,
    rules,
  };
}

async function writeFull(payload: RulesPayload, etag: string | null) {
  if (!isBrowser()) return;
  const db = await openDb();
  try {
    const tx = db.transaction([STORE_RULES, STORE_META], "readwrite");
    tx.objectStore(STORE_RULES).clear();
    for (const rule of payload.rules) {
      tx.objectStore(STORE_RULES).put(rule);
    }
    const meta: MetaRow = {
      key: "current",
      version: payload.version,
      fetchedAt: payload.fetchedAt,
      count: payload.count,
      etag,
      syncedAt: Date.now(),
    };
    tx.objectStore(STORE_META).put(meta);
    await txDone(tx);
  } finally {
    db.close();
  }
}

async function writeIncremental(
  changed: RuleSource[],
  payload: RulesPayload,
  etag: string | null
): Promise<number> {
  if (!isBrowser()) return 0;
  const db = await openDb();
  try {
    const tx = db.transaction([STORE_RULES, STORE_META], "readwrite");
    for (const rule of changed) {
      tx.objectStore(STORE_RULES).put(rule);
    }
    const meta: MetaRow = {
      key: "current",
      version: payload.version,
      fetchedAt: payload.fetchedAt,
      count: payload.count,
      etag,
      syncedAt: Date.now(),
    };
    tx.objectStore(STORE_META).put(meta);
    await txDone(tx);
    return changed.length;
  } finally {
    db.close();
  }
}

async function bumpSyncedAt(etag: string | null) {
  if (!isBrowser()) return;
  const meta = await readMeta();
  if (!meta) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put({
      ...meta,
      etag: etag ?? meta.etag,
      syncedAt: Date.now(),
    } satisfies MetaRow);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export function isStale(payload: RulesPayload | null): boolean {
  if (!payload) return true;
  const fetchedAtMs = Date.parse(payload.fetchedAt);
  if (Number.isNaN(fetchedAtMs)) return true;
  return Date.now() - fetchedAtMs > TTL_MS;
}

export async function syncRules(force = false): Promise<SyncOutcome> {
  if (!isBrowser()) {
    return { kind: "error", error: "no-browser" };
  }

  try {
    const meta = await readMeta();
    const cached = meta ? await readCached() : null;

    // Fast path — cache fresh and not forced
    if (!force && cached && !isStale(cached)) {
      return { kind: "cache-hit", reason: "fresh", payload: cached };
    }

    // Build conditional request
    const url = new URL("/api/rules", window.location.origin);
    if (meta && !force) {
      url.searchParams.set("since", new Date(meta.syncedAt).toISOString());
    }
    const headers: HeadersInit = {};
    if (meta?.etag && !force) headers["if-none-match"] = meta.etag;

    const res = await fetch(url.toString(), { headers, cache: "no-store" });
    const newEtag = res.headers.get("etag");

    if (res.status === 304 && cached) {
      await bumpSyncedAt(newEtag);
      const refreshed = (await readCached()) ?? cached;
      broadcastChange("not-modified");
      return { kind: "not-modified", payload: refreshed };
    }

    if (!res.ok) {
      return { kind: "error", error: `HTTP ${res.status}` };
    }

    const payload = (await res.json()) as RulesPayload;

    if (payload.mode === "incremental" && cached) {
      const changed = await writeIncremental(payload.rules, payload, newEtag);
      const refreshed = (await readCached()) ?? cached;
      broadcastChange("incremental");
      return { kind: "incremental", changed, payload: refreshed };
    }

    await writeFull(payload, newEtag);
    const refreshed = (await readCached()) ?? payload;
    broadcastChange("full-replace");
    return { kind: "full-replace", payload: refreshed };
  } catch (err) {
    return {
      kind: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

let _channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") return null;
  if (!_channel) _channel = new BroadcastChannel(BROADCAST_CHANNEL);
  return _channel;
}

export type CrossTabEvent =
  | { type: "not-modified" }
  | { type: "incremental" }
  | { type: "full-replace" }
  | { type: "cleared" };

function broadcastChange(kind: CrossTabEvent["type"]) {
  const ch = getChannel();
  ch?.postMessage({ type: kind } satisfies CrossTabEvent);
}

export function onCrossTabSync(cb: (e: CrossTabEvent) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (e: MessageEvent<CrossTabEvent>) => cb(e.data);
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}

export async function clearCache(): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  try {
    const tx = db.transaction([STORE_RULES, STORE_META], "readwrite");
    tx.objectStore(STORE_RULES).clear();
    tx.objectStore(STORE_META).clear();
    await txDone(tx);
  } finally {
    db.close();
  }
  broadcastChange("cleared");
}
