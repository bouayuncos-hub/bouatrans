// ============================================================
// SERVICE WORKER — BOUA Trans
// Rôle : (1) rendre le site "installable" (critère PWA obligatoire)
//        (2) mettre en cache les pages déjà visitées pour un accès
//            plus rapide et un minimum de fonctionnement hors-ligne
// ============================================================
// Change ce numéro à chaque mise à jour importante du site pour forcer
// les navigateurs à récupérer la nouvelle version au lieu de l'ancienne
// version mise en cache.
const CACHE_NAME = "boua-trans-v1";

// Fichiers mis en cache dès l'installation (le strict minimum pour démarrer)
const FICHIERS_A_METTRE_EN_CACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FICHIERS_A_METTRE_EN_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Supprime les anciens caches (des versions précédentes du site)
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(
        noms.filter((nom) => nom !== CACHE_NAME).map((nom) => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

// Stratégie : essaie le réseau en premier (pour toujours avoir la version
// à jour), et si l'utilisateur est hors-ligne, sert la version en cache.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie));
        return reponse;
      })
      .catch(() => caches.match(event.request))
  );
});
