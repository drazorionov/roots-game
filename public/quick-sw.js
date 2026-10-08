/* Only public app assets are cached. API responses and character data never enter this cache. */
const CACHE = "root-quick-assets-v3";
const asset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/_next/image" ||
    url.pathname.startsWith("/art/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/icon.png" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-icon.png");
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
        const urls = [
          ...new Set(
            event.data.urls.map(
              (value) => new URL(value, self.location.origin).href,
            ),
          ),
        ].filter((value) => {
          try {
            return asset(new URL(value, self.location.origin));
          } catch {
            return false;
          }
        });
        await cache.addAll([
          "/",
          "/characters/new?mode=quick",
          "/characters/edit?id=quick-game&mode=quick",
          ...urls,
        ]);
        event.ports[0]?.postMessage({ ready: true });
        // Portraits are optional: a missing illustration must not disable offline play.
        const images = [
          ...new Set(
            (event.data.images || []).map(
              (value) => new URL(value, self.location.origin).href,
            ),
          ),
        ].filter((value) => asset(new URL(value)) && !urls.includes(value));
        await Promise.allSettled(images.map((value) => cache.add(value)));
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
    (url.pathname === "/" ||
      (["/characters/new", "/characters/edit"].includes(url.pathname) &&
        url.searchParams.get("mode") === "quick"));
  const navigationKey =
    url.pathname === "/characters/new"
      ? "/characters/new?mode=quick"
      : url.pathname === "/characters/edit"
        ? "/characters/edit?id=quick-game&mode=quick"
        : "/";
  if (!navigation && !asset(url)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok)
          await cache.put(
            navigation ? navigationKey : request,
            response.clone(),
          );
        return response;
      } catch {
        const cached = await cache.match(navigation ? navigationKey : request);
        if (cached) return cached;
        return Response.error();
      }
    })(),
  );
});
