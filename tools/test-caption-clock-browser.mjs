import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),require=createRequire(path.join(process.env.VEDATOR_TEST_DEPS||root,'package.json'));
const puppeteer=require('puppeteer-core'),{default:chromium}=await import(pathToFileURL(require.resolve('@sparticuz/chromium')));
const source=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const numbers=JSON.parse(fs.readFileSync('episode-videos.json','utf8')).filter(e=>e.captionFile).map(e=>e.episode);
const captions=Object.fromEntries(numbers.map(n=>[n,JSON.parse(fs.readFileSync('captions/episode-'+n+'.json','utf8'))]));
const audio=Object.fromEntries(numbers.map(n=>[n,fs.readFileSync(path.join(process.env.VEDATOR_CAPTION_AUDIO,'episode-'+n+'.mp3'))]));
const diagnostics=process.env.VEDATOR_CAPTION_DIAGNOSTIC==='1';
let base;
const errors=[],failures=[];
const check=(condition,label,detail)=>{if(!condition){failures.push({label,detail});if(!diagnostics)assert(condition,label+' '+JSON.stringify(detail))}};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),name=url.pathname;
  if(name==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end('');return}
  if(name==='/content-v2.json'){
    const data={...source,episodes:source.episodes.filter(e=>numbers.includes(e.number)).map(e=>({...e,enclosure:base+'/episode-'+e.number+'.mp3'})),series:[],questions:[]};
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
  }
  if(name==='/audio-seek-index.json'){
    const data=JSON.parse(fs.readFileSync('audio-seek-index.json','utf8'));
    const entries=Object.fromEntries(numbers.map(n=>[base+'/episode-'+n+'.mp3',data.entries[source.episodes.find(e=>e.number===n).enclosure]]).filter(([,entry])=>entry));
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:1,entries}));return;
  }
  const match=name.match(/^\/(?:audio\/)?episode-(\d+)\.mp3$/);
  if(name==='/episode-5.mp3'){res.writeHead(503);res.end('Simulated unavailable original episode 5 CDN');return}
  if(match&&numbers.includes(Number(match[1]))){
    const bytes=audio[match[1]],range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    let start=range?Number(range[1]):0,end=range&&range[2]?Math.min(bytes.length-1,Number(range[2])):bytes.length-1;
    if(start>=bytes.length){res.writeHead(416);res.end();return}
    res.writeHead(range?206:200,{'Content-Type':'audio/mpeg','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':'bytes '+start+'-'+end+'/'+bytes.length}:{})});
    res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));return;
  }
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
  let bytes=fs.readFileSync(file);
  if(name==='/app-v2.js'){
    let code=bytes.toString();
    const marker='  function syncYoutubeCaptions(){';
    assert(code.includes(marker));
    code=code.replace(marker,String.raw`  window.__captionTest={
      open:(number,start=0,continuous=false)=>{
        const episode=state.data.episodes.find(e=>e.number===number);
        const items=[number,number===Math.max(...state.data.episodes.map(e=>e.number))?1:number+1].map(n=>({episode:state.data.episodes.find(e=>e.number===n),ref:epRef(n)}));
        youtubeEnabled=false;
        return openPlayback(episode,{start,autoplay:true,context:continuous?{type:'episodes',label:'Test',index:0,items}:null});
      },
      clock:playbackClock,sync:syncYoutubeCaptions,seek:seekPlayback,
      part:()=>continuousPlayer?.part(),engine:()=>continuousPlayer,
      video:toggleYoutubePlayback,
      reader:enterCaptionReader,exitReader:exitCaptionReader
    };
`+marker);
    bytes=Buffer.from(code);
  }
  res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json','.mp4':'video/mp4','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(bytes);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(base)||r.url().startsWith('blob:')||r.url().startsWith('data:')?r.continue():r.abort());
page.on('pageerror',e=>errors.push(e.message));
await page.evaluateOnNewDocument(()=>{
  window.__wakeRequests=0;window.__wakeReleases=0;window.__wakeLocks=[];
  Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{
    window.__wakeRequests++;const lock=new EventTarget();lock.released=false;lock.release=async()=>{if(lock.released)return;lock.released=true;window.__wakeReleases++;lock.dispatchEvent(new Event('release'))};window.__wakeLocks.push(lock);return lock;
  }}});
  class Player{
    constructor(frame,{events}){this.events=events;this.frame=frame;this.time=0;window.__yt=this;queueMicrotask(()=>events.onReady({target:this}))}
    seekTo(t){this.time=t}getCurrentTime(){return this.time}getDuration(){return 1800}setPlaybackRate(){}
    playVideo(){this.events.onStateChange({data:1})}pauseVideo(){this.events.onStateChange({data:2})}destroy(){this.frame.remove()}
  }
  window.YT={Player};
});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.vedatorV2Ready==='1');
  await page.evaluate(()=>{localStorage.setItem('vedator-ui-language-v1','cz');const select=document.getElementById('player-caption-language-v2');select.value='cs';select.dispatchEvent(new Event('change'))});
  const results=[];
  for(const n of numbers){
    const episode=source.episodes.find(e=>e.number===n),c=captions[n];
    const origin=c.source.url||c.source.audio;
    if(c.source.audioSha256)check(crypto.createHash('sha256').update(audio[n]).digest('hex')===c.source.audioSha256,'Transcribed audio hash must match played MP3',{n});
    check(episode.enclosure===origin,'Caption source must equal played MP3',{n,enclosure:episode.enclosure,origin});
    await page.evaluate(n=>window.__captionTest.open(n),n);
    await page.waitForFunction(()=>document.getElementById('audio-v2').readyState>=2&&!document.getElementById('player-caption-text-v2').textContent.includes('Načít'));
    await page.evaluate(()=>document.getElementById('player-play-v2').click());
    const candidates=c.cues.filter(q=>q.end-q.start>2.5);
    const times=[candidates[0],candidates[Math.floor(candidates.length/2)],candidates.at(-1)].map(q=>q.end-.15);
    for(const t of times){
      await page.evaluate(t=>{const a=document.getElementById('audio-v2');a.currentTime=t},t);
      await page.waitForFunction(()=>!document.getElementById('audio-v2').seeking);
      const actual=await page.evaluate(()=>{window.__captionTest.sync();return {clock:window.__captionTest.clock().time,text:document.getElementById('player-caption-text-v2').textContent}});
      const expected=c.cues.find(q=>q.start<=actual.clock&&actual.clock<q.end)?.text.cs||'';
      check(actual.text===expected,'MP3 cue must use source time without blanket offset',{n,t,...actual,expected});
    }
    await page.evaluate(()=>window.__captionTest.reader());await wait(300);
    const reader=await page.evaluate(()=>({inline:document.getElementById('player-caption-text-v2').textContent,reader:document.getElementById('player-caption-reader-text-v2').textContent,videoParent:document.querySelector('.vedator-caption-wake-video')?.parentElement.id}));
    check(reader.inline===reader.reader,'Inline and fullscreen must agree',{n,reader});
    check(reader.videoParent==='player-caption-reader-overlay-v2','Wake video must enter fullscreen subtree',{n,reader});
    await page.evaluate(()=>window.__captionTest.exitReader());await wait(100);
    const desired=Math.floor(c.cues.at(-1).start*.75);
    const speechSample=c.cues.find(q=>q.start>=desired&&q.end-q.start>=4);
    const target=speechSample?speechSample.start+.15:desired;
    await page.evaluate(({n,target})=>window.__captionTest.open(n,target,true),{n,target});
    await page.waitForFunction(()=>window.__captionTest.clock().ready&&window.__captionTest.clock().time>10,{timeout:30000});
    const mse=await page.evaluate(()=>({clock:window.__captionTest.clock(),approximate:window.__captionTest.part()?.approximate,partStart:window.__captionTest.part()?.start}));
    check(!mse.approximate,'Captioned MP3 seeking must use exact frame positions',{n,target,mse});
    // Verify running captions after a distant seek, a rate change and a pause.
    await page.evaluate(()=>{document.getElementById('audio-v2').playbackRate=1.5});
    await wait(1800);
    const running=await page.evaluate(()=>{
      const a=document.getElementById('audio-v2');a.pause();window.__captionTest.sync();
      return {clock:window.__captionTest.clock().time,text:document.getElementById('player-caption-text-v2').textContent};
    });
    const expectedRunning=c.cues.find(q=>q.start<=running.clock&&running.clock<q.end)?.text.cs||'';
    check(Boolean(expectedRunning.trim())&&running.text===expectedRunning,'Running MSE captions follow speech at changed speed',{n,running,expectedRunning});
    await wait(350);
    check(Math.abs(await page.evaluate(()=>window.__captionTest.clock().time)-running.clock)<.08,'Paused caption clock must not drift',{n,running});
    results.push({n,times,target,mse,running});
  }
  // Each mapped video uses its own cue identity and source clock in both languages.
  for(const n of numbers){
    await page.evaluate(n=>window.__captionTest.open(n),n);await page.evaluate(()=>window.__captionTest.video());
    await page.waitForFunction(()=>window.__yt?.time>=0&&document.getElementById('player-video-caption-v2'));
    const vt=captions[n].cues[5].start+.1;
    await page.evaluate(t=>{window.__yt.time=t;window.__captionTest.sync()},vt);
    check(await page.$eval('#player-video-caption-v2',e=>e.textContent)===captions[n].cues[5].text.cs,'YouTube Czech cue timing',{n});
    await page.select('#player-caption-language-v2','sk');
    check(await page.$eval('#player-video-caption-v2',e=>e.textContent)===captions[n].cues[5].text.sk,'YouTube Slovak cue timing',{n});
    await page.select('#player-caption-language-v2','cs');
  }
  // A cached caption promise can settle while its MP3 session is hidden by
  // YouTube. Returning to that same session must display captions immediately.
  await page.evaluate(()=>{
    window.__captionTest.open(1,100);
    window.__captionTest.open(6,400);
    window.__captionTest.video();
  });
  await page.waitForFunction(()=>!!window.__yt&&!!document.getElementById('player-youtube-frame-v2'));
  await page.evaluate(()=>{window.__yt.time=400;window.__captionTest.sync()});
  await page.click('#player-video-v2');
  await page.waitForFunction(()=>!document.getElementById('player-youtube-frame-v2')&&document.getElementById('audio-v2').readyState>=2&&!document.getElementById('audio-v2').paused,{timeout:15000});
  await page.click('#player-play-v2');
  await page.waitForFunction(cues=>{
    const t=window.__captionTest.clock().time,q=cues.find(q=>q.start<=t&&t<q.end);
    return !!q&&document.getElementById('player-caption-text-v2').textContent===q.text.cs;
  },{timeout:5000},captions[6].cues);
  check(!/Načít|Načítav/.test(await page.$eval('#player-caption-text-v2',e=>e.textContent)),'Cached MP3 captions survive a video handoff');
  // Episode 5 must work while its upstream URL is unavailable.
  await page.evaluate(()=>window.__captionTest.open(5,400));
  await page.waitForFunction(()=>document.getElementById('audio-v2').readyState>=2&&!document.getElementById('audio-v2').paused&&document.getElementById('audio-v2').currentTime>=400,{timeout:15000});
  check((await page.$eval('#audio-v2',a=>a.currentSrc)).includes('/audio/episode-5.mp3'),'Episode 5 uses verified same-origin MP3');
  await page.click('#player-video-v2');
  await page.waitForFunction(()=>!!document.getElementById('player-youtube-frame-v2'));
  await page.click('#player-video-v2');
  await page.waitForFunction(()=>!document.getElementById('player-youtube-frame-v2')&&!document.getElementById('audio-v2').paused&&document.getElementById('audio-v2').readyState>=2,{timeout:15000});
  check((await page.$eval('#audio-v2',a=>a.currentSrc)).includes('/audio/episode-5.mp3'),'Playing YouTube hands back to independent MP3');
  await page.click('#player-video-v2');await page.click('#player-play-v2');
  await page.click('#player-video-v2');
  await page.waitForFunction(()=>!document.getElementById('player-youtube-frame-v2')&&document.getElementById('audio-v2').readyState>=2,{timeout:15000});
  check(await page.$eval('#audio-v2',a=>a.paused),'Paused video handoff stays paused');
  await page.click('#player-play-v2');
  await page.waitForFunction(()=>!document.getElementById('audio-v2').paused&&document.getElementById('audio-v2').currentTime>400,{timeout:15000});
  // Keep-alive playback must be decodable and advance, both inline and fullscreen.
  const wake=await page.evaluate(()=>{const v=document.querySelector('.vedator-caption-wake-video');return {exists:!!v,time:v?.currentTime,error:v?.error?.code,paused:v?.paused,requests:window.__wakeRequests,locks:window.__wakeLocks.filter(x=>!x.released).length}});
  await wait(3200);
  const advanced=await page.evaluate(()=>{const v=document.querySelector('.vedator-caption-wake-video');return {time:v?.currentTime,error:v?.error?.code,paused:v?.paused,ready:v?.readyState}});
  check(wake.exists&&!advanced.error&&!advanced.paused&&advanced.ready>=2,'Silent video must really decode',{wake,advanced});
  check(wake.requests>0&&wake.locks===1,'Screen wake lock backs up the tiny video',wake);
  await page.evaluate(()=>{document.getElementById('player-caption-toggle-v2').click()});await wait(100);
  check(await page.evaluate(()=>!document.querySelector('.vedator-caption-wake-video')&&window.__wakeLocks.every(x=>x.released)),'Turning off captions releases keep-awake');
  await page.evaluate(()=>document.getElementById('player-caption-toggle-v2').click());await wait(100);
  // A system release is renewed on the next gesture without repeated requests per tick.
  await page.evaluate(()=>window.__wakeLocks.at(-1)?.release());
  await page.click('#player-speed-v2');await wait(150);
  check(await page.evaluate(()=>window.__wakeLocks.filter(x=>!x.released).length===1),'Gesture restores system-released screen lock');
  await page.evaluate(()=>document.getElementById('player-close-v2').click());await wait(100);
  check(await page.evaluate(()=>!document.querySelector('.vedator-caption-wake-video')&&window.__wakeLocks.every(x=>x.released)),'Collapsing player releases keep-awake');
  await page.click('#player-expand-v2');await wait(100);
  check(await page.evaluate(()=>!!document.querySelector('.vedator-caption-wake-video')&&window.__wakeLocks.filter(x=>!x.released).length===1),'Expanding player restores keep-awake');
  await page.evaluate(()=>document.getElementById('player-dismiss-v2').click());await wait(100);
  check(await page.evaluate(()=>!document.querySelector('.vedator-caption-wake-video')&&window.__wakeLocks.every(x=>x.released)),'Closing player releases keep-awake');
  check(errors.length===0,'No application exceptions',errors);
  console.log(JSON.stringify({ok:!failures.length,results,wake,advanced,failures,errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r))}
