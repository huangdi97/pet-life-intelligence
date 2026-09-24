/* PLI PWA service worker — v2
 * 原则：
 *  - 只缓存静态应用壳（JS/CSS/图标），用于离线 shell。
 *  - 医疗高风险数据与 API 响应一律 network-first，绝不缓存到本地持久化。
 *  - 离线时访问未缓存页 → 显示 /offline 离线页。
 *  - basePath-aware（Stage F）：从自身 registration.scope 推导部署前缀
 *    （dev 根路径部署 → 空字符串，/pli 部署 → /pli），所有缓存/匹配路径随前缀走。
 */
const VERSION = "pli-sw-v2";
const SHELL_CACHE = `${VERSION}-shell`;

// Derive the deployment base path from the SW's own scope (runtime-correct).
const BASE = (new URL(self.registration.scope).pathname).replace(/\/$/, "") || "";

const PRECACHE_URLS = [
  `${BASE}/`,
  `${BASE}/offline`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/default-pet-avatar.png`,
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
  const isApi = url.hostname !== self.location.hostname ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith(`${BASE}/api/`) ||
    url.pathname.includes("/api/v1/");
  const isNavigate = request.mode === "navigate";
  const isShare = url.pathname.startsWith("/share/") ||
    url.pathname.startsWith(`${BASE}/share/`);

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
          const offline = await caches.match(`${BASE}/offline`);
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
