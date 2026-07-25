const CACHE='vedator-temata-v13';
const ASSETS=['./','index.html','manifest.webmanifest','icon.svg','summary-enhancer.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await Promise.all((await caches.keys()).filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      try{await client.navigate(client.url)}catch(e){}
    }
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/vedator/');

  if(isPage){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        const html=await response.text();
        const enhanced=html.includes('summary-enhancer.js')
          ? html
          : html.replace('</body>','<script src="summary-enhancer.js?v=3"></script></body>');
        return new Response(enhanced,{
          status:response.status,
          statusText:response.statusText,
          headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}
        });
      }catch(error){
        return (await caches.match('index.html'))||(await caches.match('./'));
      }
    })());
    return;
  }

  if(url.pathname.endsWith('/episodes.json')||url.pathname.endsWith('/summary-enhancer.js')){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});