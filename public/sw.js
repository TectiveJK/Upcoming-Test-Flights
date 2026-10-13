self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// The board must stay live, so requests are not cached.
self.addEventListener("fetch", () => {});
