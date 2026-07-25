const CACHE='vedator-temata-v12';
const ASSETS=['./','index.html','manifest.webmanifest','icon.svg','summary-enhancer.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 const isPage=e.request.mode==='navigate'||url.pathname.endsWith('/index.html');
 if(isPage){
  e.respondWith(fetch(e.request).then(async res=>{
   const html=await res.text();
   const enhanced=html.includes('summary-enhancer.js')?html:html.replace('</body>','<script src="summary-enhancer.js"></script></body>');
   const out=new Response(enhanced,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'text/html; charset=utf-8'}});
   caches.open(CACHE).then(c=>c.put(e.request,out.clone()));
   return out;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));
  return;
 }
 const networkFirst=url.pathname.endsWith('/episodes.json')||url.pathname.endsWith('/summary-enhancer.js');
 if(networkFirst){e.respondWith(fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match(e.request)));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res})));
});