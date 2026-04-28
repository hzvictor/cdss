/**
 * CDSS Service Worker — stale-while-revalidate cache for /api/rules.
 *
 * Caching strategy:
 *  - Match exactly /api/rules (with or without query string).
 *  - Serve from cache immediately (stale).
 *  - Fire fetch in background, update cache, broadcast to clients.
 *
 * IndexedDB-based rule cache (lib/cache/rules-cache.ts) sits ON TOP of this:
 *  - SW caches the HTTP response for offline-resilience.
 *  - IndexedDB caches the parsed/structured rules + last-known ETag.
 *  - Together: PWA can render rules without any network on cold start.
 */

const VERSION = "cdss-sw-v1";
const RULES_CACHE = `${VERSION}-rules`;
const RULES_PATH = "/api/rules";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("cdss-sw-") && !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== RULES_PATH) return;

  event.respondWith(staleWhileRevalidate(req));
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RULES_CACHE);
  const cached = await cache.match(req, { ignoreSearch: true });

  const networkPromise = fetch(req)
    .then(async (res) => {
      if (res.ok || res.status === 304) {
        if (res.ok) {
          // Only cache full bodies (200), not 304 (which has no body).
          await cache.put(req, res.clone());
          notifyClients({ type: "rules-network-update" });
        }
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    // Don't await — let the background request update the cache.
    event.waitUntil?.(networkPromise);
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;
  return new Response(JSON.stringify({ error: "offline" }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(message);
  }
}
