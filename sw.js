const CACHE='vedator-temata-v2';
const ASSETS=['./','index.html','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const isPage=e.request.mode==='navigate'||e.request.url.endsWith('/index.html');
  if(isPage){
    e.respondWith(fetch(e.request).then(res=>{
      const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res;
  })));
});