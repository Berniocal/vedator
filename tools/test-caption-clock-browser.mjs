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
        const available=[...state.data.episodes].sort((a,b)=>a.number-b.number);
        const index=available.findIndex(e=>e.number===number),episode=available[index];
        const items=[episode,available[(index+1)%available.length]].map(e=>({episode:e,ref:epRef(e.number)}));
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
  await page.$eval('.language-v2 [data-lang="cz"]',button=>button.click());
  check(!await page.$('#player-caption-language-v2'),'Caption language follows the application without a selector');
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
    check(reader.inline.replace(/\s+/g,' ').trim()===reader.reader.replace(/\s+/g,' ').trim(),'Inline and fullscreen preserve the same spoken words after reader reflow',{n,reader});
    const readerLayout=await page.evaluate(()=>{const node=document.getElementById('player-caption-reader-text-v2');return {lines:node.querySelectorAll('.caption-reader-line-v2').length,fits:node.scrollWidth<=node.clientWidth+1}});
    check(readerLayout.lines<=2&&readerLayout.fits,'Fullscreen captions fit at most two complete lines',{n,readerLayout});
    check(reader.videoParent==='player-caption-reader-overlay-v2','Wake video must enter fullscreen subtree',{n,reader});
    if(n===1){
      await page.evaluate(()=>document.getElementById('audio-v2').pause());
      const before=await page.evaluate(()=>({time:window.__captionTest.clock().time,font:parseFloat(document.getElementById('player-caption-reader-text-v2').style.fontSize)}));
      await page.click('#player-caption-reader-text-v2');await page.waitForFunction(()=>!document.getElementById('caption-reader-controls-v2').hidden);await page.click('#caption-book-larger-v2');
      const after=await page.evaluate(()=>({time:window.__captionTest.clock().time,font:parseFloat(document.getElementById('player-caption-reader-text-v2').style.fontSize),fits:document.getElementById('player-caption-reader-text-v2').scrollWidth<=document.getElementById('player-caption-reader-text-v2').clientWidth+1}));
      check(after.font>before.font&&after.fits&&Math.abs(after.time-before.time)<.001,'Live reader font enlargement preserves the shared paused position',{before,after});
      await page.click('#caption-book-smaller-v2');
    }

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
    if(n===1){
      for(const width of [320,390]){
        await page.setViewport({width,height:844,isMobile:true,hasTouch:true});
        const row=await page.evaluate(()=>{
          const ids=['player-caption-toggle-v2','player-caption-reader-button-v2','player-video-fullscreen-v2'];
          const rects=ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.left,y:r.top,right:r.right,height:r.height}});
          return {rects,viewport:innerWidth};
        });
        check(row.rects.every(r=>Math.abs(r.y-row.rects[0].y)<2&&r.x>=0&&r.right<=row.viewport+1),'Three subtitle/video buttons fit on one mobile row',{width,row});
      }
    }

    await page.$eval('.language-v2 [data-lang="sk"]',button=>button.click());
    check(await page.$eval('#player-video-caption-v2',e=>e.textContent)===captions[n].cues[5].text.sk,'YouTube Slovak cue timing',{n});
    if(n===1||n===363){
      const frame=await page.$('#player-youtube-frame-v2');
      await page.click('#player-video-fullscreen-v2');
      await page.waitForFunction(()=>document.fullscreenElement?.id==='player-video-panel-v2');
      for(const viewport of [{width:390,height:844,isMobile:true,hasTouch:true},{width:844,height:390,isMobile:true,hasTouch:true}]){
        await page.setViewport(viewport);await wait(100);
        const layout=await page.evaluate(()=>{
          const panel=document.fullscreenElement,host=document.getElementById('player-video-host-v2'),caption=document.getElementById('player-video-caption-v2');
          const h=host.getBoundingClientRect(),c=caption.getBoundingClientRect(),b=document.getElementById('player-video-fullscreen-close-v2').getBoundingClientRect();
          const pictureWidth=Math.min(h.width,h.height*16/9),pictureHeight=Math.min(h.height,h.width*9/16);
          const left=h.left+(h.width-pictureWidth)/2,top=h.top+(h.height-pictureHeight)/2;
          return {contains:panel.contains(host)&&panel.contains(caption),fillsViewport:h.left<=1&&h.top<=1&&h.width>=innerWidth-1&&h.height>=innerHeight-1,captionFits:c.left>=left-1&&c.right<=left+pictureWidth+1&&c.top>=top-1&&c.bottom<=top+pictureHeight+1,buttonFits:b.left>=left-1&&b.right<=left+pictureWidth+1&&b.top>=top-1&&b.bottom<=top+pictureHeight+1,text:caption.textContent};
        });
        check(layout.contains&&layout.fillsViewport&&layout.captionFits&&layout.buttonFits,'Fullscreen video retains overlay captions inside the rendered video in both orientations',{n,viewport,layout});
        check(layout.text===captions[n].cues[5].text.sk,'Fullscreen retains the current caption language',{n,layout});
      }
      check(await page.evaluate(node=>node===document.getElementById('player-youtube-frame-v2'),frame),'Fullscreen never reloads or moves the iframe',{n});
      await page.click('#player-video-fullscreen-close-v2');
      await page.waitForFunction(()=>!document.fullscreenElement&&!document.body.classList.contains('vedator-video-fullscreen'));
      await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
    }
    await page.$eval('.language-v2 [data-lang="cz"]',button=>button.click());
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
  // Book mode uses actual mobile font metrics and keeps whole pages while paused.
  await page.evaluate(()=>window.__captionTest.reader());
  await page.keyboard.press('Enter');await page.click('#caption-reader-mode-v2');
  const bookLayout=await page.evaluate(()=>{
    const node=document.getElementById('player-caption-reader-text-v2'),rect=node.getBoundingClientRect(),lines=node.querySelectorAll('.caption-book-line-v2'),bar=document.getElementById('caption-reader-controls-v2'),footer=document.getElementById('caption-book-progress-v2');
    return {paused:document.getElementById('audio-v2').paused,lines:lines.length,font:parseFloat(getComputedStyle(node).fontSize),fits:node.scrollWidth<=node.clientWidth+1&&rect.top>=bar.getBoundingClientRect().bottom+15&&lines[lines.length-1].getBoundingClientRect().bottom<=footer.getBoundingClientRect().top-15,page:footer.textContent,height:node.clientHeight,text:node.textContent};
  });
  check(bookLayout.paused&&bookLayout.lines>8&&bookLayout.font<26&&bookLayout.fits,'Mobile book mode fits a readable multi-line page and pauses audio',bookLayout);
  for(const fraction of [.8,.2]){
    const point=await page.$eval('#player-caption-reader-text-v2',(e,f)=>{const r=e.getBoundingClientRect();return {x:r.left+r.width*f,y:r.top+r.height/2}},fraction);
    await page.mouse.click(point.x,point.y);await wait(370);
    const tapped=await page.evaluate(()=>({page:document.getElementById('caption-book-progress-v2').textContent,text:document.getElementById('player-caption-reader-text-v2').textContent,height:document.getElementById('player-caption-reader-text-v2').clientHeight,hidden:document.getElementById('caption-reader-controls-v2').hidden}));
    check(tapped.page===bookLayout.page&&tapped.text===bookLayout.text&&tapped.height===bookLayout.height&&tapped.hidden===(fraction===.8),'Text taps toggle toolbar without changing book page or geometry',tapped);
  }
  await page.evaluate(()=>{
    const overlay=document.getElementById('player-caption-reader-overlay-v2'),r=overlay.getBoundingClientRect(),y=r.height/2;
    for(const [type,x] of [['pointerdown',r.width*.8],['pointermove',r.width*.2],['pointerup',r.width*.2]])overlay.dispatchEvent(new PointerEvent(type,{pointerId:10,isPrimary:true,clientX:x,clientY:y,bubbles:true}));
  });
  check(await page.$eval('#caption-book-progress-v2',e=>e.textContent)!==bookLayout.page,'Mobile book swipe advances');
  await page.click('#caption-book-larger-v2');
  check(await page.$eval('#player-caption-reader-text-v2',e=>e.scrollWidth<=e.clientWidth+1),'Larger book text stays within the mobile screen');
  await page.click('#caption-reader-mode-v2');
  await page.waitForFunction(()=>!document.getElementById('audio-v2').paused&&document.getElementById('audio-v2').readyState>=2,{timeout:15000});
  const holdPoint=await page.$eval('#player-caption-reader-overlay-v2',e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
  await page.mouse.move(holdPoint.x,holdPoint.y);await page.mouse.down();await wait(650);
  const heldTime=await page.$eval('#audio-v2',e=>({paused:e.paused,time:e.currentTime}));
  check(heldTime.paused,'Center hold pauses actual MP3 while the finger is down',heldTime);
  await wait(300);
  check(Math.abs(await page.$eval('#audio-v2',e=>e.currentTime)-heldTime.time)<.08,'Reading hold freezes the source clock');
  await page.mouse.up();await page.waitForFunction(()=>!document.getElementById('audio-v2').paused,{timeout:5000});
  await page.evaluate(()=>window.__captionTest.exitReader());
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
