const CACHE = "insarwatch-v2";
const ASSETS = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Nunca cachear llamadas a la API: siempre deben ir a la red
  if (e.request.url.includes("/api/")) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  );
});

// Permite que la página pida al service worker mostrar una notificación
// (más confiable en Android que `new Notification()` cuando la pestaña está en segundo plano)
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = e.data;
    self.registration.showNotification(title, options);
  }
});

// Notificaciones push enviadas por el backend (funcionan con la app cerrada)
self.addEventListener("push", (e) => {
  let payload = { title: "⚠️ Pico detectado", body: "Revisa la app InsarWatch." };
  try{ if(e.data) payload = Object.assign(payload, e.data.json()); }catch(err){}

  const options = {
    body: payload.body,
    icon: "icon-192.png",
    badge: "icon-192.png",
    vibrate: Array.isArray(payload.vibrate) ? payload.vibrate : [300,120,300,120,300,120,600],
    requireInteraction: true,
    tag: "insarwatch-bg-" + Date.now(),
    data: { url: "./index.html" },
  };
  e.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
