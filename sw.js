const APP_CACHE="vedator-v3-app-9653ded83650c543";
const APP_CACHE_PREFIX="vedator-v3-app-";
const LEGACY_APP_CACHE_PREFIX="vedator-v2-app-";
const DATA_CACHE="vedator-v3-data-v1";
const DATA_URL="./content-v2.json";
const APP_URLS=["./captions/episode-1.json","./captions/episode-2.json","./captions/episode-3.json","./captions/episode-4.json","./captions/episode-5.json","./captions/episode-6.json","./captions/episode-7.json","./captions/episode-8.json","./captions/episode-9.json","./captions/episode-361.json","./captions/episode-362.json","./captions/episode-363.json","./wake-loop.mp4","./audio-seek-index.json","./","./index.html","./app-v2.js","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png"];
const OFFLINE_AUDIO_CACHE="vedator-offline-audio-v1";
const STATIC_NAMES=new Set(["wake-loop.mp4","audio-seek-index.json","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png"]);
const CAPTION_NAMES=new Set(["episode-1.json","episode-2.json","episode-3.json","episode-4.json","episode-5.json","episode-6.json","episode-7.json","episode-8.json","episode-9.json","episode-361.json","episode-362.json","episode-363.json"]);
const APP_PAGES=new Set([new URL('./',self.location.href).pathname,new URL('./index.html',self.location.href).pathname]);

const delay=ms=>new Promise(resolve=>setTimeout(()=>resolve(null),ms));

async function cacheFreshResponse(cache,cacheKey,response){
  if(!response||!response.ok)throw new Error(`HTTP ${response?.status||0}`);
  await cache.put(cacheKey,response.clone());
  return response;
}

async function networkFirst(request,cacheName,cacheKey,timeoutMs){
  const cache=await caches.open(cacheName);
  const network=fetch(request,{cache:'no-store'})
    .then(response=>cacheFreshResponse(cache,cacheKey,response));
  const first=await Promise.race([network.catch(()=>null),delay(timeoutMs)]);
  if(first)return first;
  const cached=await cache.match(cacheKey,{ignoreSearch:true});
  if(cached)return cached;
  try{return await network}catch{return Response.error()}
}

async function cacheFirst(request,cacheName,cacheKey){
  const cache=await caches.open(cacheName);
  const cached=await cache.match(cacheKey,{ignoreSearch:true});
  if(cached)return cached;
  try{
    const response=await fetch(request,{cache:'no-store'});
    return await cacheFreshResponse(cache,cacheKey,response);
  }catch{return Response.error()}
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const app=await caches.open(APP_CACHE);
  await app.addAll(APP_URLS.map(url=>new Request(url,{cache:'reload'})));
  try{
    const data=await caches.open(DATA_CACHE);
    const response=await fetch(new Request(DATA_URL,{cache:'reload'}));
    if(response.ok)await data.put(DATA_URL,response);
  }catch{}
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  const data=await caches.open(DATA_CACHE);
  if(!(await data.match(DATA_URL))){
    for(const key of keys){
      if(!key.startsWith(LEGACY_APP_CACHE_PREFIX)&&!key.startsWith(APP_CACHE_PREFIX))continue;
      const old=await caches.open(key);
      const previous=await old.match(DATA_URL,{ignoreSearch:true});
      if(previous){await data.put(DATA_URL,previous);break}
    }
  }
  await Promise.all(keys.filter(key=>
    (key.startsWith(LEGACY_APP_CACHE_PREFIX)||key.startsWith(APP_CACHE_PREFIX))&&key!==APP_CACHE
  ).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const name=url.pathname.split('/').pop();

  if(request.mode==='navigate'){
    if(!APP_PAGES.has(url.pathname))return;
    event.respondWith(networkFirst(request,APP_CACHE,'./index.html',1600));
    return;
  }
  if(name==='content-v2.json'){
    event.respondWith(networkFirst(request,DATA_CACHE,DATA_URL,1600));
    return;
  }
  if(name==='app-v2.js'){
    event.respondWith(networkFirst(request,APP_CACHE,'./app-v2.js',1600));
    return;
  }
  if(url.pathname.startsWith(new URL('./captions/',self.location.href).pathname)&&CAPTION_NAMES.has(name)){
    event.respondWith(cacheFirst(request,APP_CACHE,`./captions/${name}`));
    return;
  }
  if(STATIC_NAMES.has(name)){
    event.respondWith(cacheFirst(request,APP_CACHE,`./${name}`));
  }
});
