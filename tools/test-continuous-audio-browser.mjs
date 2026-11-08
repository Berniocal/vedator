import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),deps=process.env.VEDATOR_TEST_DEPS||root;
const require=createRequire(path.join(deps,'package.json'));
const puppeteer=require('puppeteer-core');
const {default:chromium}=await import(pathToFileURL(require.resolve('@sparticuz/chromium')));
const live=process.env.VEDATOR_CONTINUOUS_LIVE==='1';
const systemMode=process.env.VEDATOR_CONTINUOUS_SYSTEM==='stream'?'stream':'episode';
const liveNumbers=(process.env.VEDATOR_CONTINUOUS_EPISODES||'77,92,357').split(',').map(Number);
const fixture=Buffer.from(fs.readFileSync('tools/continuous-tone-base64.txt','utf8').trim(),'base64');
let noRange=false,blockSecond=false,transientFailure=true,failures=0;
const requested=[];
const real=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
let base;
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/content-v2.json'){
    const episodes=live?liveNumbers.map(n=>real.episodes.find(e=>e.number===n)):[77,92,357].map(n=>({number:n,title:'Zkušební díl '+n,enclosure:base+'/tone-'+n+'.mp3'}));
    response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({episodes,series:[{name:'Černé díry',episodes:episodes.map(e=>e.number)}]}));return;
  }
  if(url.pathname.startsWith('/tone-')){
    requested.push({path:url.pathname,range:request.headers.range||null});
    if(url.pathname==='/tone-92.mp3'&&(blockSecond||transientFailure)){
      transientFailure=false;failures++;response.writeHead(503);response.end('Simulated network failure');return;
    }
    const range=request.headers.range?.match(/^bytes=(\d+)-(\d+)$/);
    if(range&&!noRange){
      const start=Number(range[1]),end=Math.min(fixture.length-1,Number(range[2]));
      if(start>=fixture.length){response.writeHead(416);response.end();return}
      response.writeHead(206,{'Content-Type':'audio/mpeg','Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${fixture.length}`});response.end(fixture.subarray(start,end+1));
    }else{response.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':fixture.length});response.end(fixture)}
    return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){response.writeHead(404);response.end();return}
  const ext=path.extname(file);response.writeHead(200,{'Content-Type':({'.html':'text/html','.mjs':'text/javascript','.png':'image/png','.svg':'image/svg+xml'})[ext]||'text/plain','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
// Use normal Chrome process isolation. Serverless --single-process flags can
// crash the full Chrome installed on GitHub-hosted runners before tests start.
const args=['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
if(live&&process.env.HTTPS_PROXY)args.push('--proxy-server='+process.env.HTTPS_PROXY,'--ignore-certificate-errors');
const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p))||await chromium.executablePath();
const browser=await puppeteer.launch({executablePath,headless:true,args,ignoreDefaultArgs:['--mute-audio','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.evaluateOnNewDocument(()=>{
  window.positionCalls=[];window.systemHandlers={};
  if(!navigator.mediaSession)return;
  const session=navigator.mediaSession,position=session.setPositionState.bind(session),handler=session.setActionHandler.bind(session);
  session.setPositionState=value=>{
    const audio=document.getElementById('audio'),s=window.vedatorContinuousTest?.player.session;
    window.positionCalls.push({duration:value?String(value.duration):null,position:value?.position,nativeTime:audio?.currentTime,nativeDuration:String(audio?.duration),index:s?.index});
    return position(value);
  };
  session.setActionHandler=(name,callback)=>{window.systemHandlers[name]=callback;return handler(name,callback)};
});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',message=>{if(message.type()==='error')console.log('Browser error:',message.text())});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(system=systemMode){
  await page.goto(base+'/test-souvisle.html'+(system==='stream'?'?system=stream':''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.continuousReady==='1');
  await page.evaluate(live=>{
    const {player}=window.vedatorContinuousTest;
    if(!live){player.chunkSize=1024;player.lead=4;player.keepBehind=2}
    window.srcChanges=0;window.audioEvents=[];
    const audio=document.getElementById('audio');
    new MutationObserver(records=>{window.srcChanges+=records.filter(r=>r.attributeName==='src').length}).observe(audio,{attributes:true});
    for(const name of ['play','playing','pause','ended','error'])audio.addEventListener(name,()=>window.audioEvents.push({name,hidden:document.hidden,time:audio.currentTime}));
    document.getElementById('speed').value='2';
  },live);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile page overflows');
}
async function state(){return page.evaluate(()=>{const t=window.vedatorContinuousTest,s=t.player.session,a=document.getElementById('audio');return {src:a.src,changes:window.srcChanges,events:window.audioEvents,index:s?.index,failed:s?.failed,complete:s?.complete,parts:s?.parts,transitions:s?.transitionCount,paused:a.paused,error:a.error&&{code:a.error.code,message:a.error.message},time:a.currentTime,metadata:navigator.mediaSession?.metadata?.title,systemTimeline:t.player.systemTimeline,positionCalls:window.positionCalls,log:t.log}})}
function assertStreamTimeline(result){
  assert(result.positionCalls.length>3,'System position updates must be observed');
  assert(result.positionCalls.every(p=>p.duration!==null),'Continuous system timeline must never be cleared during playback');
  assert(result.positionCalls.every(p=>Math.abs(p.position-p.nativeTime)<.06),'System seek position must use the native whole-stream timeline');
  assert(result.positionCalls.every(p=>p.duration===p.nativeDuration||p.duration==='Infinity'&&p.nativeDuration==='NaN'),'System duration must follow the whole media stream');
  assert(result.positionCalls.some(p=>p.index===1&&p.position>result.parts[1].start),'Second episode must retain its global time, not reset to zero');
  assert(!result.log.some(line=>line.includes('MEDIA API CHYBA')),'Native Media Session API must accept every position update');
}
try{
  await setup();await page.click(live?'#quick':'#start');
  await page.waitForFunction(()=>!document.getElementById('audio').paused&&document.getElementById('audio').currentTime>.1,{timeout:60000});
  const initial=await state();assert.equal(initial.changes,1);assert.equal(initial.error,null);
  await page.click('#toggle');const pausedAt=(await state()).time;await wait(200);assert(Math.abs((await state()).time-pausedAt)<.1,'Pause must remain paused');
  await page.click('#toggle');
  assert.equal(await page.evaluate(()=>window.vedatorContinuousTest.player.seek(99999)),false);
  const cover=await browser.newPage();await cover.goto('about:blank');await cover.bringToFront();
  const actuallyHidden=await page.evaluate(()=>document.hidden);
  if(!actuallyHidden){
    // The serverless headless shell has no real tab occlusion. Keep real audio
    // decoding and explicitly label this limited visibility simulation in CI.
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
    console.log('Headless shell: simulating document.hidden; physical Android suspension remains a manual check');
  }
  if(live){
    await page.waitForFunction(()=>window.vedatorContinuousTest.player.session.index>=1,{polling:100,timeout:120000});
    await page.waitForFunction(()=>window.vedatorContinuousTest.player.position()>30,{polling:100,timeout:45000});
    const current=await state();assert.equal(current.changes,1);assert.equal(current.error,null);assert.equal(current.paused,false);assert(current.transitions>=1);
    if(systemMode==='stream')assertStreamTimeline(current);
    console.log(JSON.stringify({ok:true,liveMp3:true,hiddenTransition:true,visibilitySimulated:!actuallyHidden,episodes:liveNumbers,secondsInNextEpisode:current.time-current.parts[1].start,sourceChanges:current.changes,metadata:current.metadata,log:current.log},null,2));
  }else{
    // requestAnimationFrame stops on a genuinely hidden tab. Observe media
    // completion with interval polling instead of Puppeteer's default rAF.
    await page.waitForFunction(()=>document.getElementById('audio').ended,{polling:100,timeout:25000});
    const final=await state();assert.equal(final.changes,1);assert.equal(final.error,null);assert.equal(final.transitions,2);assert.equal(final.index,2);
    assert.equal(final.events.filter(e=>e.name==='ended').length,1,'ended must only fire after the last episode');
    assert.equal(failures,1,'Transient network error should be exercised');
    assert(final.log.some(l=>l.includes('PŘECHOD')&&l.includes('hidden=true')),'Real hidden-page handoff missing');
    assert(final.metadata.includes('357'),'System metadata must follow the actual track');
    console.log('Real MSE: three tracks, two hidden handoffs, one source, transient network retry passed');
    await cover.close();await page.bringToFront();await setup();
    await page.evaluate(()=>{const p=window.vedatorContinuousTest.player,original=p.start.bind(p);p.start=(items,options)=>original(items,{...options,tailBytes:1024})});
    await page.click('#quick');await page.waitForFunction(()=>window.vedatorContinuousTest.player.session?.complete,{timeout:15000});
    const quick=await state();assert(quick.parts[0].bytes<fixture.length,'Quick test must really skip the first MP3 prefix');assert.equal(quick.changes,1);assert.equal(quick.error,null);
    assert(requested.some(r=>r.path==='/tone-77.mp3'&&r.range===`bytes=${fixture.length-1024}-${fixture.length-1}`),'Tail must use a numeric CORS-safe Range');
    await page.click('#stop');
    noRange=true;await setup();await page.click('#start');
    await page.waitForFunction(()=>window.vedatorContinuousTest.player.session?.complete,{timeout:15000});
    const fullResponse=await state();assert.equal(fullResponse.error,null);assert.equal(fullResponse.changes,1);await page.click('#stop');noRange=false;
    blockSecond=true;await setup();await page.click('#start');
    await page.waitForFunction(()=>window.vedatorContinuousTest.player.session?.failed,{timeout:15000});
    const failed=await state();blockSecond=false;await page.click('#retry');
    await page.waitForFunction(()=>window.vedatorContinuousTest.player.session?.complete,{timeout:15000});
    const recovered=await state();assert.equal(recovered.src,failed.src);assert.equal(recovered.changes,1);assert.equal(recovered.error,null);
    assert.equal(recovered.parts.length,3,'Retry must not duplicate logical tracks');
    console.log('Quick tail, no-Range streaming, preserved-source retry, pause and unavailable seek passed');
    // Opt-in v2: preserve the successful audio pipeline, but expose the same
    // whole-stream clock to the OS. Exercise real API calls, not a fake session.
    await setup('stream');await page.click('#start');
    await page.waitForFunction(()=>document.getElementById('audio').currentTime>.1,{timeout:15000});
    await page.click('#toggle');
    await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'))});
    assert.equal((await state()).paused,true,'Foreground metadata refresh must not undo a user pause');
    await page.click('#toggle');
    const streamCover=await browser.newPage();await streamCover.goto('about:blank');await streamCover.bringToFront();
    if(!await page.evaluate(()=>document.hidden))await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
    await page.waitForFunction(()=>document.getElementById('audio').ended,{polling:100,timeout:25000});
    const stream=await state();assertStreamTimeline(stream);assert.equal(stream.changes,1);assert.equal(stream.transitions,2);assert.equal(stream.error,null);
    const sought=await page.evaluate(()=>{
      const audio=document.getElementById('audio'),target=audio.currentTime-1;
      window.systemHandlers.seekto({seekTime:target});return {target,actual:audio.currentTime};
    });
    assert(Math.abs(sought.target-sought.actual)<.05,'OS seekto must accept global stream time');
    await streamCover.close();await page.bringToFront();
    console.log('System timeline v2: no resets at episode boundaries, native duration/position, OS seekto and user pause passed');
  }
  await page.bringToFront();
  const screenshot=process.env.VEDATOR_TEST_SCREENSHOT;if(screenshot)await page.screenshot({path:screenshot,fullPage:true});
  assert.deepEqual(errors,[],'No page runtime errors allowed');
}catch(error){console.error(JSON.stringify(await state(),null,2));throw error}
finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
