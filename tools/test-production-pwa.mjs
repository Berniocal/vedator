import fs from 'node:fs';

const fail=message=>{throw new Error(message)};
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

if(!html.includes('data-view="series" type="button">Série a témata</button>'))fail('Production index still exposes the old Série label');
if(!/app-v2\.js\?v=[0-9a-f]{12}/.test(html))fail('app-v2.js is not content-versioned in production index');
if(!html.includes("updateViaCache:'none'"))fail('Service worker update check may use stale HTTP cache');
if(!html.includes("visibilitychange"))fail('Service worker is not rechecked when the app becomes visible');
if(!html.includes("setInterval(safeUpdate,CHECK_INTERVAL)"))fail('Periodic service worker update check is missing');

if(!sw.includes('const APP_CACHE_PREFIX="vedator-v3-app-";'))fail('New app cache namespace is missing');
if(!sw.includes('const DATA_CACHE="vedator-v3-data-v1";'))fail('Separate data cache is missing');
if(!sw.includes("request.mode==='navigate'"))fail('Navigation handler is missing');
if(!sw.includes("networkFirst(request,APP_CACHE,'./index.html',1600)"))fail('Navigation is not network-first');
if(!sw.includes("networkFirst(request,DATA_CACHE,DATA_URL,1600)"))fail('content-v2.json is not network-first');
if(!sw.includes("networkFirst(request,APP_CACHE,'./app-v2.js',1600)"))fail('app-v2.js is not network-first');
if(sw.match(/const APP_URLS=.*content-v2\.json/))fail('content-v2.json must not invalidate the whole app cache');

console.log('Production PWA cache/startup checks passed.');
