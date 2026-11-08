import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'../..');
const require=createRequire(path.join(root,'node_modules/package.json'));
const puppeteer=require('puppeteer-core');
const source=JSON.parse(fs.readFileSync(path.join(root,'content-v2.json'),'utf8'));
const adapter=fs.readFileSync(path.join(root,'android/app/src/main/assets/native-adapter.js'),'utf8');
const data={...source,episodes:[9,41,1703,340].map(n=>source.episodes.find(e=>e.number===n)),series:[{name:'Černé díry',episodes:[9,41,1703]}],questions:[{episode:340,order:0,seconds:30,time:'00:30',title:'Otázka jedna',points:['Ukázka']},{episode:340,order:1,seconds:70,time:'01:10',title:'Otázka dvě',points:['Ukázka']}],nonquestions:{episodes:{}}};
const requests=[];
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;requests.push(pathname);
 if(pathname==='/content-v2.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return}
 if(pathname==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end('');return}
 if(pathname==='/app-v2.js'){let code=fs.readFileSync(path.join(root,'app-v2.js'),'utf8');const pos=code.lastIndexOf('\n})();');code=code.slice(0,pos)+'\n'+adapter+code.slice(pos);res.setHeader('Content-Type','text/javascript');res.end(code);return}
 const file=path.join(root,pathname==='/'?'index.html':pathname.slice(1));if(!file.startsWith(root+'/')||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;res.end();return}res.setHeader('Content-Type',pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.svg')?'image/svg+xml':'text/html');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||path.resolve(root,'../browser-tmp/chromium'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:412,height:915,isMobile:true,hasTouch:true});
await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(base)||r.url().startsWith('data:')?r.continue():r.abort());
await page.evaluateOnNewDocument(()=>{
 window.commands=[];window.nativeSim={queue:{},index:0,time:0,duration:2256,playing:false,ready:false,speed:1};
 window.VedatorNative={postMessage(raw){const r=JSON.parse(raw);window.commands.push(r);const s=window.nativeSim;
 if(r.action==='ready'){window.__vedatorNativeReceive({kind:'bootstrap',values:{},downloads:{},snapshot:s});return}
 if(r.action==='storage'||r.action==='export'||r.action==='offline'||r.action==='download')return;
 if(r.action==='queue'){s.queue=r;s.index=r.index;s.time=r.position;s.playing=r.autoplay;s.ready=true;s.ended=false;s.speed=r.speed}
 if(r.action==='seek')s.time=r.time;
 if(r.action==='pause')s.playing=false;
 if(r.action==='play')s.playing=true;
 if(r.action==='navigate'){s.index+=r.delta;s.time=s.queue.items[s.index].start||0}
 if(r.action==='speed')s.speed=r.speed;
 setTimeout(()=>window.__vedatorNativeReceive({kind:'snapshot',snapshot:JSON.parse(JSON.stringify(s))}),0);
 }};
 localStorage.setItem('vedator-ui-language-v1','cz');
});
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.vedatorV2Ready==='1');
 await page.click('[data-view="series"]');await page.click('#series-v2 .series>summary');await page.click('.series-resume-v2');await page.waitForFunction(()=>window.commands.some(c=>c.action==='queue'));
 let queue=await page.evaluate(()=>window.commands.filter(c=>c.action==='queue').at(-1));assert.deepEqual(queue.items.map(x=>x.number),[9,41,1703]);assert.equal(queue.position,0);
 assert.equal(await page.$eval('#audio-v2',a=>a.getAttribute('src')),null,'HTML audio must never acquire a source');
 await page.$eval('#player-seek-v2',n=>{n.value='1582';n.dispatchEvent(new Event('change',{bubbles:true}))});await page.waitForFunction(()=>window.nativeSim.time===1582);
 assert.equal(await page.$eval('#player-current-v2',n=>n.textContent),'26:22');
 await page.click('#player-play-v2');await page.waitForFunction(()=>!window.nativeSim.playing);
 await page.$eval('#player-seek-v2',n=>{n.value='1600';n.dispatchEvent(new Event('change',{bubbles:true}))});await page.waitForFunction(()=>window.nativeSim.time===1600);assert.equal(await page.evaluate(()=>window.nativeSim.playing),false,'Paused seek must stay paused');
 await page.click('#player-next-v2');await page.waitForFunction(()=>document.getElementById('player-title-v2').textContent.includes('41'));
 await page.click('#player-next-v2');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vedatorLastPlaybackV1')).episode===1703);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vedatorLastPlaybackV1')).episode),1703);
 // Android Auto can change the track without a click in the WebView.
 await page.evaluate(()=>{window.nativeSim.index=0;window.nativeSim.time=30;window.nativeSim.queue.token='car-test';window.__vedatorNativeReceive({kind:'snapshot',snapshot:JSON.parse(JSON.stringify(window.nativeSim))})});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vedatorLastPlaybackV1')).episode),9);
 await page.click('#player-offline-v2');assert.equal(await page.evaluate(()=>window.commands.filter(c=>c.action==='offline').at(-1).number),9);
 await page.click('#player-download-v2');assert.equal(await page.evaluate(()=>window.commands.filter(c=>c.action==='download').at(-1).number),9);
 await page.click('[data-view="questions"]');await page.click('#questions-v2 .play');await page.waitForFunction(()=>window.commands.filter(c=>c.action==='queue').at(-1).items.some(i=>i.number===340));
 queue=await page.evaluate(()=>window.commands.filter(c=>c.action==='queue').at(-1));assert.equal(queue.position,30);
 await page.click('[data-view="data"]');await page.click('.data-export');assert(await page.evaluate(()=>JSON.parse(window.commands.filter(c=>c.action==='export').at(-1).data).app==='vedator'));
 assert(!requests.some(url=>url.endsWith('.mp3')),'WebView must not download playback audio');assert.deepEqual(errors,[]);
 console.log('PASS: native queue, specials, 26:22 seek, paused seek, car track changes, question timestamp, offline/download/export; zero HTML audio sources');
}finally{await browser.close();server.close();}
