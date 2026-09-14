/* PLI PWA service worker — v1
 * 原则：
 *  - 只缓存静态应用壳（JS/CSS/图标），用于离线 shell。
 *  - 医疗高风险数据与 API 响应一律 network-first，绝不缓存到本地持久化。
 *  - 离线时访问未缓存页 → 显示 /offline 离线页。
 */
const VERSION = "pli-sw-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/default-pet-avatar.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isApi = url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname;
  const isNavigate = request.mode === "navigate";
  const isShare = url.pathname.startsWith("/share/");

  // API / 跨域 / 分享页：永不缓存，直接网络。
  if (isApi || isShare) return;

  // 页面导航：network-first，失败回退缓存壳，再回退离线页。
  if (isNavigate) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response("离线", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }),
    );
    return;
  }

  // 静态资源：cache-first。
  if (request.destination === "script" || request.destination === "style" || request.destination === "font" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            const copy = resp.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return resp;
          }),
      ),
    );
    return;
  }
});