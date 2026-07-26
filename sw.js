const CACHE='vedator-temata-v20';
const ASSETS=['./','index.html','manifest.webmanifest','icon.svg','inapp.css','inapp.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await Promise.all((await caches.keys()).filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function injectInAppAssets(response){
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;

  let html=await response.text();
  if(!html.includes('inapp.css')){
    html=html.replace('</head>','<link rel="stylesheet" href="./inapp.css"></head>');
  }
  if(!html.includes('inapp.js')){
    html=html.replace('</body>','<script src="./inapp.js" defer></script></body>');
  }

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const url=new URL(event.request.url);
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/vedator/');
  const networkFirst=isPage||url.pathname.endsWith('/episodes.json');

  if(networkFirst){
    event.respondWith((async()=>{
      try{
        let response=await fetch(event.request,{cache:'no-store'});
        if(isPage)response=await injectInAppAssets(response);
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      }catch(error){
        const cached=await caches.match(event.request)||await caches.match('./');
        if(!cached)throw error;
        return isPage?injectInAppAssets(cached):cached;
      }
    })());
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  })));
});
