const CACHE='vedator-temata-v99';
const VERSION='v99';
const ASSETS=['./','index.html','manifest.webmanifest','icon.svg','fast-touch.css','audio-player.css','audio-player.js','catalog-patch.js','custom-player.js','theme-toggle.js','ui-cleanup.js','highlight-patch.js','playlist-patch.js','slovak-topics-patch.js','topic-filter-fix.js','slovak-ui.js','data-backup.js','view-layout-fix.js','title-truncate.js','scientist-title-fix.js','media-session-skip.js','lazy-render.js','episode-300-chapters.js','episode-244-chapters.js','episode-244-summary.js','episode-248-chapters.js','episode-248-summary.js','episode-257-chapters.js','episode-257-summary.js','episode-263-summary.js','episode-270-summary.js','episode-272-summary.js','episode-278-summary.js','episode-284-summary.js','episode-289-summary.js','episode-295-summary.js','episode-313-summary.js','episode-319-summary.js','episode-326-summary.js','episode-332-summary.js','episode-337-summary.js','episode-340-summary.js','questions-view.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await Promise.all((await caches.keys()).filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients)client.postMessage({type:'VEDATOR_SW_UPDATED',version:VERSION});
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

function updaterScript(){
  return `<script>(()=>{if(!('serviceWorker'in navigator)||window.__vedatorSwUpdater)return;window.__vedatorSwUpdater=true;let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload()});navigator.serviceWorker.addEventListener('message',event=>{if(event.data&&event.data.type==='VEDATOR_SW_UPDATED'&&!sessionStorage.getItem('vedator-sw-'+event.data.version)){sessionStorage.setItem('vedator-sw-'+event.data.version,'1');location.reload()}});navigator.serviceWorker.ready.then(reg=>{reg.update().catch(()=>{});if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'})})})}).catch(()=>{});document.addEventListener('visibilitychange',()=>{if(!document.hidden)navigator.serviceWorker.ready.then(reg=>reg.update()).catch(()=>{})});})();</script>`;
}

async function injectEnhancements(response){
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('fast-touch.css'))html=html.replace('</head>','<link rel="stylesheet" href="./fast-touch.css"></head>');
  if(!html.includes('audio-player.css'))html=html.replace('</head>','<link rel="stylesheet" href="./audio-player.css"></head>');
  if(!html.includes('audio-player.js'))html=html.replace('</body>','<script src="./audio-player.js" defer></script></body>');
  if(!html.includes('catalog-patch.js'))html=html.replace('</body>','<script src="./catalog-patch.js" defer></script></body>');
  if(!html.includes('custom-player.js'))html=html.replace('</body>','<script src="./custom-player.js" defer></script></body>');
  if(!html.includes('theme-toggle.js'))html=html.replace('</body>','<script src="./theme-toggle.js" defer></script></body>');
  if(!html.includes('ui-cleanup.js'))html=html.replace('</body>','<script src="./ui-cleanup.js" defer></script></body>');
  if(!html.includes('slovak-topics-patch.js'))html=html.replace('</body>','<script src="./slovak-topics-patch.js" defer></script></body>');
  if(!html.includes('topic-filter-fix.js'))html=html.replace('</body>','<script src="./topic-filter-fix.js" defer></script></body>');
  if(!html.includes('highlight-patch.js'))html=html.replace('</body>','<script src="./highlight-patch.js" defer></script></body>');
  if(!html.includes('playlist-patch.js'))html=html.replace('</body>','<script src="./playlist-patch.js" defer></script></body>');
  if(!html.includes('slovak-ui.js'))html=html.replace('</body>','<script src="./slovak-ui.js" defer></script></body>');
  if(!html.includes('data-backup.js'))html=html.replace('</body>','<script src="./data-backup.js" defer></script></body>');
  if(!html.includes('view-layout-fix.js'))html=html.replace('</body>','<script src="./view-layout-fix.js" defer></script></body>');
  if(!html.includes('title-truncate.js'))html=html.replace('</body>','<script src="./title-truncate.js" defer></script></body>');
  if(!html.includes('scientist-title-fix.js'))html=html.replace('</body>','<script src="./scientist-title-fix.js" defer></script></body>');
  if(!html.includes('media-session-skip.js'))html=html.replace('</body>','<script src="./media-session-skip.js" defer></script></body>');
  if(!html.includes('lazy-render.js'))html=html.replace('</body>','<script src="./lazy-render.js" defer></script></body>');
  if(!html.includes('episode-300-chapters.js'))html=html.replace('</body>','<script src="./episode-300-chapters.js" defer></script></body>');
  if(!html.includes('episode-244-chapters.js'))html=html.replace('</body>','<script src="./episode-244-chapters.js" defer></script></body>');
  if(!html.includes('episode-244-summary.js'))html=html.replace('</body>','<script src="./episode-244-summary.js" defer></script></body>');
  if(!html.includes('episode-248-chapters.js'))html=html.replace('</body>','<script src="./episode-248-chapters.js" defer></script></body>');
  if(!html.includes('episode-248-summary.js'))html=html.replace('</body>','<script src="./episode-248-summary.js" defer></script></body>');
  if(!html.includes('episode-257-chapters.js'))html=html.replace('</body>','<script src="./episode-257-chapters.js" defer></script></body>');
  if(!html.includes('episode-257-summary.js'))html=html.replace('</body>','<script src="./episode-257-summary.js" defer></script></body>');
  if(!html.includes('episode-263-summary.js'))html=html.replace('</body>','<script src="./episode-263-summary.js" defer></script></body>');
  if(!html.includes('episode-270-summary.js'))html=html.replace('</body>','<script src="./episode-270-summary.js" defer></script></body>');
  if(!html.includes('episode-272-summary.js'))html=html.replace('</body>','<script src="./episode-272-summary.js" defer></script></body>');
  if(!html.includes('episode-278-summary.js'))html=html.replace('</body>','<script src="./episode-278-summary.js" defer></script></body>');
  if(!html.includes('episode-284-summary.js'))html=html.replace('</body>','<script src="./episode-284-summary.js" defer></script></body>');
  if(!html.includes('episode-289-summary.js'))html=html.replace('</body>','<script src="./episode-289-summary.js" defer></script></body>');
  if(!html.includes('episode-295-summary.js'))html=html.replace('</body>','<script src="./episode-295-summary.js" defer></script></body>');
  if(!html.includes('episode-313-summary.js'))html=html.replace('</body>','<script src="./episode-313-summary.js" defer></script></body>');
  if(!html.includes('episode-319-summary.js'))html=html.replace('</body>','<script src="./episode-319-summary.js" defer></script></body>');
  if(!html.includes('episode-326-summary.js'))html=html.replace('</body>','<script src="./episode-326-summary.js" defer></script></body>');
  if(!html.includes('episode-332-summary.js'))html=html.replace('</body>','<script src="./episode-332-summary.js" defer></script></body>');
  if(!html.includes('episode-337-summary.js'))html=html.replace('</body>','<script src="./episode-337-summary.js" defer></script></body>');
  if(!html.includes('episode-340-summary.js'))html=html.replace('</body>','<script src="./episode-340-summary.js" defer></script></body>');
  if(!html.includes('questions-view.js'))html=html.replace('</body>','<script src="./questions-view.js" defer></script></body>');
  if(!html.includes('__vedatorSwUpdater'))html=html.replace('</body>',updaterScript()+'</body>');
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','no-store');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isMedia=event.request.destination==='audio'||event.request.headers.has('range')||/\.(?:mp3|m4a|aac|ogg|wav|webm)(?:$|\?)/i.test(url.pathname);
  if(isMedia||url.origin!==self.location.origin)return;
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/vedator/');
  const isAppCode=isPage||/\.(?:js|css|json|webmanifest)$/i.test(url.pathname);
  if(isAppCode){
    event.respondWith((async()=>{
      try{
        let response=await fetch(event.request,{cache:'no-store'});
        if(isPage)response=await injectEnhancements(response);
        const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        return response;
      }catch(error){
        const cached=await caches.match(event.request)||await caches.match('./');
        if(!cached)throw error;
        return isPage?injectEnhancements(cached):cached;
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});return response;
  })));
});