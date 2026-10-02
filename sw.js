/* Differenziata Mesagne — cache dell'app per l'uso offline.
   La versione cambia a ogni pubblicazione: così ogni nuovo caricamento
   sostituisce davvero la copia salvata sui telefoni di chi usa l'app. */
var CACHE = "mesagne-differenziata-20261002-ghpages";
var SHELL = ["./", "./index.html", "./manifest.webmanifest",
             "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = e.request.url;

  /* La pagina si scarica sempre dalla rete, così un aggiornamento si vede
     subito; la cache resta come riserva quando non c'è connessione. */
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
      return res;
    }).catch(function () {
      return caches.match("./index.html").then(function (hit) { return hit || caches.match("./"); });
    }));
    return;
  }

  var cacheable = url.indexOf(self.registration.scope) === 0 ||
                  url.indexOf("https://fonts.googleapis.com") === 0 ||
                  url.indexOf("https://fonts.gstatic.com") === 0;
  e.respondWith(caches.match(e.request).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (res) {
      if (cacheable && res && (res.status === 200 || res.type === "opaque")) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () { return caches.match("./index.html"); });
  }));
});
