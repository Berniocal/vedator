import fs from 'node:fs';
import crypto from 'node:crypto';

const OFFLINE_AUDIO_CACHE='vedator-offline-audio-v1';
const APP_CACHE_PREFIX='vedator-v3-app-';
const DATA_CACHE='vedator-v3-data-v1';
const shell=['index.html','app-v2.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
for(const file of [...shell,'content-v2.json']){if(!fs.existsSync(file))throw new Error(`Missing production file: ${file}`)}

const h=crypto.createHash('sha256');
for(const file of shell){h.update(file);h.update('\0');h.update(fs.readFileSync(file));h.update('\0')}
const APP_CACHE=`${APP_CACHE_PREFIX}${h.digest('hex').slice(0,16)}`;
const APP_URLS=['./','./index.html','./app-v2.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];

const source=`const APP_CACHE=${JSON.stringify(APP_CACHE)};
const APP_CACHE_PREFIX=${JSON.stringify(APP_CACHE_PREFIX)};
const LEGACY_APP_CACHE_PREFIX="vedator-v2-app-";
const DATA_CACHE=${JSON.stringify(DATA_CACHE)};
const DATA_URL="./content-v2.json";
const APP_URLS=${JSON.stringify(APP_URLS)};
const OFFLINE_AUDIO_CACHE=${JSON.stringify(OFFLINE_AUDIO_CACHE)};
const STATIC_NAMES=new Set(["manifest.webmanifest","icon.svg","icon-192.png","icon-512.png"]);

const delay=ms=>new Promise(resolve=>setTimeout(()=>resolve(null),ms));

async function cacheFreshResponse(cache,cacheKey,response){
  if(!response||!response.ok)throw new Error(\`HTTP \${response?.status||0}\`);
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
  if(STATIC_NAMES.has(name)){
    event.respondWith(cacheFirst(request,APP_CACHE,\`./\${name}\`));
  }
});
`;
fs.writeFileSync('sw.js',source);
console.log({APP_CACHE,DATA_CACHE,OFFLINE_AUDIO_CACHE});
