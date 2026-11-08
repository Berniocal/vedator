import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),deps=process.env.VEDATOR_TEST_DEPS||root,require=createRequire(path.join(deps,'package.json'));
const puppeteer=require('puppeteer-core'),{default:chromium}=await import(pathToFileURL(require.resolve('@sparticuz/chromium')));
const source=JSON.parse(fs.readFileSync('content-v2.json','utf8')),fixture=Buffer.from(fs.readFileSync('tools/continuous-tone-base64.txt','utf8').trim(),'base64');
const order=[9,41,1703],numbers=[...order,340],requests=[];
const realFile=process.env.VEDATOR_REAL_EP9_FILE,realAudio=realFile?fs.readFileSync(realFile):null;
let base,blockAudio=false;
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');requests.push({url:url.pathname,range:request.headers.range||''});
  // Production SW caching is verified separately. Isolate runtime requests from
  // its pre-cache duplicate requests when checking startup and audio behavior.
  if(url.pathname==='/sw.js'){response.writeHead(200,{'Content-Type':'text/javascript'});response.end("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));");return}
  if(realFile&&url.pathname==='/audio-seek-index.json'){const data=JSON.parse(fs.readFileSync('audio-seek-index.json','utf8')),entry=data.entries['https://mcdn.podbean.com/mf/web/4mbanm/podcast_ep9.mp3'];response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({version:1,entries:{[base+'/tone-9.mp3']:entry}}));return}
  if(url.pathname==='/seed.html'){response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><title>Seed</title>');return}
  if(url.pathname==='/content-v2.json'){
    const episodes=numbers.map(n=>({...source.episodes.find(e=>e.number===n),enclosure:base+'/tone-'+n+'.mp3'}));
    const questions=[2,4].map((seconds,i)=>({episode:340,order:i,time:'00:0'+seconds,sourceTime:'00:0'+seconds,seconds,title:'Otázka '+(i+1),points:['Ukázka'],i18n:{cs:{title:'Otázka '+(i+1),points:['Ukázka']},sk:{title:'Otázka '+(i+1),points:['Ukážka']}}}));
    const data={...source,episodes,questions,series:[{name:'Černé díry',i18n:{cs:'Černé díry',sk:'Čierne diery'},episodes:order}],nonquestions:{episodes:{}}};
    response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(data));return;
  }
  if(url.pathname.startsWith('/tone-')){
    const bytes=realFile&&url.pathname==='/tone-9.mp3'?realAudio:fixture;
    if(blockAudio){response.writeHead(503);response.end('network audio disabled');return}
    const match=request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(match){const start=Number(match[1]),end=match[2]?Math.min(bytes.length-1,Number(match[2])):bytes.length-1;if(start>=bytes.length){response.writeHead(416);response.end();return}response.writeHead(206,{'Content-Type':'audio/mpeg','Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${bytes.length}`});response.end(bytes.subarray(start,end+1))}
    else{response.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':bytes.length});response.end(bytes)}return;
  }
  if(url.pathname==='/app-v2.js'){let code=fs.readFileSync('app-v2.js','utf8');code=code.replace('let continuousPlayer=null,continuousContextOffset=0,playerSeekEditing=false;','let continuousPlayer=null,continuousContextOffset=0,playerSeekEditing=false;window.__mainEngine=()=>continuousPlayer;').replace('log:message=>{if','log:message=>{(window.__engineLog??=[]).push(message);if');response.writeHead(200,{'Content-Type':'text/javascript'});response.end(code);return}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){response.writeHead(404);response.end();return}
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
  response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p))||await chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],ignoreDefaultArgs:['--mute-audio','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
await page.setRequestInterception(true);page.on('request',request=>{if(request.url().startsWith(base)||request.url().startsWith('blob:')||request.url().startsWith('data:'))request.continue();else request.abort()});
await page.evaluateOnNewDocument(()=>{
  window.nativePositions=[];window.downloads=[];
  const session=navigator.mediaSession,position=session.setPositionState.bind(session);
  session.setPositionState=value=>{window.nativePositions.push(value?{duration:String(value.duration),position:value.position}:null);return position(value)};
  const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download)window.downloads.push(this.download);else click.call(this)};
});
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',ref=n=>alphabet[(n>>6)&63]+alphabet[n&63];
const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(saved={}){
  await page.goto(base+'/seed.html');await page.evaluate(saved=>{localStorage.clear();localStorage.setItem('vedator-ui-language-v1','cz');for(const [key,value] of Object.entries(saved))localStorage.setItem(key,JSON.stringify(value))},saved);
  requests.length=0;
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.vedatorV2Ready==='1');await settle(60);
  await page.evaluate(()=>{
    const audio=document.getElementById('audio-v2');window.sourceChanges=0;window.events=[];
    new MutationObserver(records=>window.sourceChanges+=records.filter(r=>r.attributeName==='src').length).observe(audio,{attributes:true});
    for(const name of ['play','playing','pause','ended','error'])audio.addEventListener(name,()=>window.events.push({name,time:audio.currentTime,hidden:document.hidden}));
  });
}
async function startSeries(){await page.click('[data-view="series"]');await page.click('#series-v2 .series > summary');await page.click('.series-resume-v2');await page.waitForFunction(()=>document.getElementById('audio-v2').currentTime>.1,{timeout:20000});for(let i=0;i<4;i++)await page.click('#player-speed-v2')}
async function snapshot(){return page.evaluate(()=>{const a=document.getElementById('audio-v2');return {engine:window.__engineLog,parts:window.__mainEngine?.()?.session?.parts.map(({scanner,headerBytes,...part})=>part),src:a.src,time:a.currentTime,paused:a.paused,error:a.error&&{code:a.error.code,message:a.error.message},changes:window.sourceChanges,events:window.events,title:document.getElementById('player-title-v2').textContent,progress:JSON.parse(localStorage.getItem('vedatorPlaybackProgressV1')||'{}'),last:JSON.parse(localStorage.getItem('vedatorLastPlaybackV1')||'null'),collections:JSON.parse(localStorage.getItem('vedatorCollectionProgressV1')||'{}'),nativePositions:window.nativePositions}})}
try{
  if(realFile){
    await setup();await startSeries();
    const initial=await snapshot();assert(initial.src.startsWith('blob:'));
    const began=Date.now(),before=requests.length;
    await page.$eval('#player-seek-v2',node=>{node.focus();node.value='1582';node.dispatchEvent(new Event('change',{bubbles:true}))});
    await page.waitForFunction(()=>{const p=JSON.parse(localStorage.getItem('vedatorLastPlaybackV1'));return p?.time>1582.1&&p.time<1585},{timeout:7000});
    const sought=await snapshot();assert.equal(sought.error,null);assert(!sought.paused);assert(sought.last.episode===9);
    const bytes=requests.slice(before).filter(r=>r.url.endsWith('.mp3')).reduce((sum,r)=>{const m=r.range.match(/^bytes=(\d+)-(\d+)$/);return sum+(m?Number(m[2])-Number(m[1])+1:realAudio.length)},0);
    assert(bytes<12*1048576,'Main far seek must download only bounded readahead, not the entire 50 MB prefix');
    assert(requests.slice(before).filter(r=>r.url==='/tone-9.mp3').every(r=>Number(r.range.match(/^bytes=(\d+)/)?.[1])>40000000),'Main far seek must request bytes directly near the target');
    const readyMs=Date.now()-began;
    await page.waitForFunction(()=>Number(document.getElementById('player-seek-v2').value)>1582,{timeout:2500});
    assert(await page.$eval('#player-seek-v2',node=>document.activeElement===node),'Playback must update the slider while it remains focused');
    await page.click('#player-play-v2');
    await page.$eval('#player-seek-v2',node=>{node.value='2254';node.dispatchEvent(new Event('change',{bubbles:true}))});
    await page.waitForFunction(()=>{const p=JSON.parse(localStorage.getItem('vedatorLastPlaybackV1'));return p?.time>=2254},{timeout:7000});
    assert((await snapshot()).paused,'Paused far seek must stay paused');
    const changes=(await snapshot()).changes;
    const cover=await browser.newPage();await cover.goto('about:blank');await cover.bringToFront();
    if(!await page.evaluate(()=>document.hidden))await page.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
    await page.evaluate(()=>document.getElementById('player-play-v2').click());
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vedatorLastPlaybackV1'))?.episode===41,{polling:100,timeout:6000});
    const next=await snapshot();assert.equal(next.changes,changes);assert.equal(next.error,null);assert(!next.events.some(e=>e.name==='ended'));
    assert(Math.abs(next.progress['episode-9'].duration-2256.483265)<.08);assert(next.progress['episode-9'].completed);
    console.log(JSON.stringify({ok:true,mainApplication:true,episode:9,seek:'26:22',readyMs,requestedBytes:bytes,focusedSlider:true,pausedSeek:true,hiddenHandoff:true}));
    await cover.close();
  }else{
  await setup();
  assert(!requests.some(r=>r.url.endsWith('.mp3')),'Startup must not fetch MP3s');
  assert(!requests.some(r=>r.url.endsWith('.mjs')),'Main startup must not import any extra module');
  assert.equal(requests.filter(r=>r.url==='/app-v2.js').length,1,'Keep a single app runtime request');
  assert.equal(requests.filter(r=>r.url==='/content-v2.json').length,1,'Keep a single content bundle request');
  await startSeries();const initial=await snapshot();assert(initial.src.startsWith('blob:'),'Main series must use the continuous engine');
  const cover=await browser.newPage();await cover.goto('about:blank');await cover.bringToFront();
  if(!await page.evaluate(()=>document.hidden))await page.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
  await page.waitForFunction(()=>document.getElementById('audio-v2').ended,{polling:100,timeout:25000});
  const final=await snapshot();assert.equal(final.changes,1);assert.equal(final.error,null);assert(final.title.includes(source.episodes.find(e=>e.number===1703).i18n.cs.title));
  for(const n of order){const record=final.progress['episode-'+n];assert(record?.completed,'Episode completion missing: '+n);assert(record.duration>5.8&&record.duration<6.2,'Save each episode duration, not the global stream duration');assert(Math.abs(record.currentTime-record.duration)<.1,'Each completed episode needs its own final position')}
  assert.equal(final.last.episode,1703);assert.equal(final.last.context.index,2);assert(final.last.time<6.3,'Last-playback restore must use the local episode clock');
  assert.equal(final.events.filter(e=>e.name==='ended').length,1);assert(final.nativePositions.some(p=>p&&p.position>12),'OS must keep the global stream clock');
  await cover.close();await page.bringToFront();await page.click('#player-download-v2');
  await page.waitForFunction(()=>window.downloads.length===1);assert(requests.some(r=>r.url==='/tone-1703.mp3'&&!r.range),'MP3 download must fetch the episode, not the MediaSource blob');
  await page.click('#player-play-v2');
  await page.waitForFunction(()=>document.getElementById('audio-v2').currentTime>.1);
  const replay=await snapshot();assert(replay.src.endsWith('/tone-1703.mp3'),'Replay after queue end must start the last episode, not rewind the entire queue');
  assert.equal(replay.last.episode,1703);assert.equal(replay.last.context.index,2);
  const restored={...final.last,episode:41,time:2,itemRef:ref(41),context:{...final.last.context,index:1}};
  await setup({vedatorLastPlaybackV1:restored,vedatorPlaybackProgressV1:{'episode-41':{currentTime:2,duration:6.06,completed:false,updatedAt:1}}});
  await page.waitForFunction(()=>document.getElementById('audio-v2').readyState>0&&document.getElementById('audio-v2').paused);
  await page.click('#player-expand-v2');await page.click('#player-play-v2');await page.waitForFunction(()=>document.getElementById('audio-v2').currentTime>.1,{timeout:20000});
  assert((await snapshot()).src.startsWith('blob:'));assert((await snapshot()).last.time>=2,'Restore must preserve the requested position');
  await page.click('#player-play-v2');const paused=await snapshot();await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'))});await settle(150);assert.equal((await snapshot()).paused,true,'Visibility must not cancel a user pause');assert.equal((await snapshot()).src,paused.src);
  await page.click('#player-play-v2');
  await page.$eval('#player-seek-v2',node=>{node.value='1';node.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.waitForFunction(()=>{const saved=JSON.parse(localStorage.getItem('vedatorLastPlaybackV1'));return saved?.episode===41&&saved.time>=1&&saved.time<2});
  await page.waitForFunction(()=>document.getElementById('audio-v2').currentTime>.1,{timeout:15000});
  assert((await snapshot()).src.startsWith('blob:'),'Manual seek outside buffer must restart MSE, not fall back to native');
  console.log('Main series: startup requests unchanged; hidden handoffs, per-episode progress, restore, pause, seek and MP3 download passed');
  const playlist={id:'mixed',name:'Celé díly a otázky',items:[ref(9),'gA','gB']};
  await setup({'vedator-user-playlists-v1':[playlist]});
  await page.click('[data-view="playlists"]');await page.click('#playlists-v2 .playlist-card > summary');await page.click('.playlist-resume-v2');
  await page.waitForFunction(()=>document.getElementById('audio-v2').currentTime>.1,{timeout:15000});for(let i=0;i<4;i++)await page.click('#player-speed-v2');
  await page.waitForFunction(()=>document.getElementById('audio-v2').ended,{timeout:25000});
  const mixed=await snapshot();assert.equal(mixed.error,null);assert.equal(mixed.changes,1);assert.equal(mixed.last.context.index,2);assert.equal(mixed.last.itemRef,'gB');
  const collection=mixed.collections['playlist:mixed'];assert(collection.items['ref:gA'].completed&&collection.items['ref:gB'].completed,'Question playlist entries must retain separate progress');
  assert(mixed.progress['episode-340'].currentTime>5.8&&mixed.progress['episode-340'].currentTime<6.2);
  console.log('Mixed episode/question playlist: exact starts, separate progress and one continuous source passed');
  const offlineIndex=Object.fromEntries(order.map(n=>['episode-'+n,{key:'episode-'+n,cacheUrl:base+'/tone-'+n+'.mp3'}]));
  await setup({vedatorOfflineAudioIndexV1:offlineIndex});
  await page.evaluate(async numbers=>{const cache=await caches.open('vedator-offline-audio-v1');for(const n of numbers){const url=location.origin+'/tone-'+n+'.mp3';await cache.put(url,await fetch(url))}},order);
  blockAudio=true;requests.length=0;await startSeries();
  await page.waitForFunction(()=>document.getElementById('audio-v2').ended,{timeout:25000});
  const offline=await snapshot();assert.equal(offline.error,null);assert.equal(offline.changes,1);assert(!requests.some(r=>r.url.endsWith('.mp3')),'Offline queue must read cached audio without network requests');
  console.log('Offline series: cached MP3s, one stream, no audio network requests passed');
  }
  assert.deepEqual(pageErrors,[]);
}catch(error){console.error(JSON.stringify({snapshot:await snapshot(),pageErrors,requests},null,2));throw error}
finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
