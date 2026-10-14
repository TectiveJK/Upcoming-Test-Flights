self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "New flight or test",
    body: "Someone added a plan to the board.",
    url: self.registration.scope,
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.title === "string" && parsed.title) payload.title = parsed.title;
        if (typeof parsed.body === "string" && parsed.body) payload.body = parsed.body;
        if (typeof parsed.url === "string" && parsed.url.startsWith("https://")) {
          payload.url = parsed.url;
        }
      }
    }
  } catch {
    // Show the fallback text when the payload is not JSON.
  }
  const icon = new URL("icons/icon-192.png", self.registration.scope).href;
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    event.notification.data &&
    typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : self.registration.scope;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.startsWith(self.registration.scope) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
        return undefined;
      }),
  );
});
