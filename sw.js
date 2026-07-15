// ============================================================
// SERVICE WORKER — BOUA Trans
// ============================================================
// IMPORTANT : incrémente ce numéro à CHAQUE mise à jour du site
// (même une petite). C'est ce qui force les navigateurs des visiteurs
// à récupérer la nouvelle version plutôt que de servir l'ancienne
// depuis le cache indéfiniment.
const CACHE_VERSION = "v2";
const CACHE_NAME = `boua-trans-${CACHE_VERSION}`;

// Fichiers essentiels mis en cache dès l'installation, pour que le
// site s'ouvre même hors-ligne dès la première visite.
const PRECACHE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./output.css",
  "./offline.html"
];

// ------------------------------------------------------------
// INSTALLATION : télécharge et met en cache les fichiers essentiels
// ------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_FILES))
      .catch((err) => console.warn("Précache partiellement échouée :", err))
  );
  self.skipWaiting();
});

// ------------------------------------------------------------
// ACTIVATION : supprime les anciens caches (versions précédentes)
// ------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(
        noms
          .filter((nom) => nom.startsWith("boua-trans-") && nom !== CACHE_NAME)
          .map((nom) => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

// ------------------------------------------------------------
// STRATÉGIE DE CACHE — différente selon le type de ressource :
//
// 1. Page HTML (navigation) → "network first" : on essaie toujours
//    d'avoir la version la plus fraîche ; si hors-ligne, on sert la
//    page mise en cache, et en dernier recours une page "offline.html".
//
// 2. Assets statiques (CSS, polices, images) → "stale-while-revalidate" :
//    on sert immédiatement la version en cache (rapide), tout en
//    vérifiant en arrière-plan s'il y a une nouvelle version pour la
//    prochaine visite. Idéal pour la performance (Core Web Vitals).
//
// 3. Appels vers Firebase / API externes → jamais mis en cache
//    (les données doivent toujours être fraîches).
// ------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // On ne met jamais en cache les appels vers des domaines externes
  // (Firebase, Google Fonts API, etc.) — seulement les fichiers du site.
  if (url.origin !== self.location.origin) {
    return; // laisse la requête suivre son cours normal, sans interception
  }

  // 1. Navigation (chargement/rechargement de la page)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
          return reponse;
        })
        .catch(() =>
          caches.match(request).then((reponse) => reponse || caches.match("./offline.html"))
        )
    );
    return;
  }

  // 2. Assets statiques : stale-while-revalidate
  event.respondWith(
    caches.match(request).then((reponseEnCache) => {
      const fetchPromise = fetch(request)
        .then((reponseReseau) => {
          if (reponseReseau && reponseReseau.status === 200) {
            const copie = reponseReseau.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
          }
          return reponseReseau;
        })
        .catch(() => reponseEnCache); // hors-ligne : on retombe sur le cache

      return reponseEnCache || fetchPromise;
    })
  );
});
