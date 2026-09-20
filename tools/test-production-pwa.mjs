import fs from 'node:fs';

const fail=message=>{throw new Error(message)};
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const app=fs.readFileSync('app-v2.js','utf8');

if(!html.includes('data-view="series" type="button">Série a témata</button>'))fail('Production index still exposes the old Série label');
if(!/app-v2\.js\?v=[0-9a-f]{12}/.test(html))fail('app-v2.js is not content-versioned in production index');
if(!html.includes("updateViaCache:'none'"))fail('Service worker update check may use stale HTTP cache');
if(!html.includes("visibilitychange"))fail('Service worker is not rechecked when the app becomes visible');
if(!html.includes("setInterval(safeUpdate,CHECK_INTERVAL)"))fail('Periodic service worker update check is missing');

const summaryState=html.match(/<script id="v2-summary-open-state">([\s\S]*?)<\/script>/)?.[1];
if(!summaryState)fail('Episode summary open-state preservation is missing');
if(!summaryState.includes("details.episode-summary-v2"))fail('Summary-state helper is not scoped to episode summaries');
if(!summaryState.includes("attributeFilter:['open']"))fail('Summary-state helper does not observe the open state');
if(!summaryState.includes('openEpisodes.has(episode)'))fail('Summary-state helper does not restore open episodes');
try{new Function(summaryState)}catch(error){fail(`Summary-state helper has invalid JavaScript: ${error.message}`)}

if(!sw.includes('const APP_CACHE_PREFIX="vedator-v3-app-";'))fail('New app cache namespace is missing');
if(!sw.includes('const DATA_CACHE="vedator-v3-data-v1";'))fail('Separate data cache is missing');
if(!sw.includes("request.mode==='navigate'"))fail('Navigation handler is missing');
if(!sw.includes("networkFirst(request,APP_CACHE,'./index.html',1600)"))fail('Navigation is not network-first');
if(!sw.includes("networkFirst(request,DATA_CACHE,DATA_URL,1600)"))fail('content-v2.json is not network-first');
if(!sw.includes("networkFirst(request,APP_CACHE,'./app-v2.js',1600)"))fail('app-v2.js is not network-first');
if(sw.match(/const APP_URLS=.*content-v2\.json/))fail('content-v2.json must not invalidate the whole app cache');

if(!app.includes('V2_SEARCH_HIGHLIGHT_CONSISTENCY_V1'))fail('Unified search highlight layer is missing');
if(!app.includes('afterAppend?.(container);applySearchHighlights(container)'))fail('Lazy-rendered search results are not highlighted');
if(!app.includes("if(state.view==='series'){renderSeries();applySearchHighlights(active);return}"))fail('Series search results are not highlighted');
if(!app.includes('search-match-expanded-v2'))fail('Hidden question-answer matches are not made visible during search');
if(!app.includes('mark.vedator-search-dom'))fail('Search DOM highlight marker is missing');

console.log('Production PWA cache/startup checks passed.');
