/* Only public app assets are cached. API responses and character data never enter this cache. */
const CACHE = "root-quick-assets-v1";
const asset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/art/") ||
    url.pathname === "/icon.svg");
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_QUICK_ASSETS") return;
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const urls = [...new Set(event.data.urls)].filter((value) => {
          try {
            return asset(new URL(value, self.location.origin));
          } catch {
            return false;
          }
        });
        await cache.addAll(["/", ...urls]);
        event.ports[0]?.postMessage({ ready: true });
      } catch {
        event.ports[0]?.postMessage({ ready: false });
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const navigation =
    request.mode === "navigate" &&
    url.origin === self.location.origin &&
    url.pathname === "/";
  if (!navigation && !asset(url)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok)
          await cache.put(navigation ? "/" : request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(navigation ? "/" : request);
        if (cached) return cached;
        return Response.error();
      }
    })(),
  );
});
