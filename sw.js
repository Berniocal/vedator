const CACHE='vedator-temata-v22';
const ASSETS=['./','index.html','manifest.webmanifest','icon.svg','audio-player.css','audio-player.js'];

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

async function injectAudioPlayer(response){
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;

  let html=await response.text();
  if(!html.includes('audio-player.css')){
    html=html.replace('</head>','<link rel="stylesheet" href="./audio-player.css"></head>');
  }
  if(!html.includes('audio-player.js')){
    html=html.replace('</body>','<script src="./audio-player.js" defer></script></body>');
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
        if(isPage)response=await injectAudioPlayer(response);
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      }catch(error){
        const cached=await caches.match(event.request)||await caches.match('./');
        if(!cached)throw error;
        return isPage?injectAudioPlayer(cached):cached;
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