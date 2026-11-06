/* Offline support: keeps a copy of the game on the phone.
   Change VERSION on every release so phones pick up the new files. */
const VERSION='war-ages-v17';
const FILES=['/','/index.html','/manifest.json','/js/three.min.js','/js/data.js','/js/lang.js','/js/models.js','/js/engine.js','/js/terrain.js','/js/weather.js','/js/net.js','/js/ui.js','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
// network first (so updates arrive), the saved copy when there is no internet
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(VERSION).then(c=>c.put(e.request,cp)); return r; })
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('/index.html'))));
});
