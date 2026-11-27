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
const numbers=[12];
const workingDraft=process.env.VEDATOR_LAYOUT_WORKING_DRAFT==='1';
function workingWrap(text){
 if(text.length<=48)return text;
 const choices=[...text.matchAll(/ /g)].map(m=>m.index).filter(i=>i<=48&&text.length-i-1<=48&&!/(?:^| )[aikosuvz]$/i.test(text.slice(0,i))&&text.slice(0,i).split(' ').length>1&&text.slice(i+1).split(' ').length>1);
 if(!choices.length)return text;
 choices.sort((a,b)=>Math.abs(a-(text.length-1)/2)-Math.abs(b-(text.length-1)/2));
 return text.slice(0,choices[0])+'\n'+text.slice(choices[0]+1);
}
const captions=Object.fromEntries(numbers.map(n=>[n,workingDraft?{version:1,episode:n,guid:source.episodes.find(e=>e.number===n).id,youtubeId:source.episodes.find(e=>e.number===n).youtubeId,cues:JSON.parse(fs.readFileSync('captions/source/episode-'+n+'-manual-bilingual-draft.json','utf8')).cues.map(c=>({start:c.sourceStart,end:c.sourceEnd,text:Object.fromEntries(Object.entries(c.text).map(([lang,text])=>[lang,workingWrap(text)]))}))}:JSON.parse(fs.readFileSync('captions/episode-'+n+'.json','utf8'))]));
const reviewedSegments=process.env.VEDATOR_LAYOUT_REVIEWED_SEGMENTS==='1'?JSON.parse(fs.readFileSync('captions/source/episode-12-segmentation-review.json','utf8')):null;
if(reviewedSegments)assert(workingDraft,'Text-only reviewed-segment preview requires the explicit working fixture');
const layoutCues=reviewedSegments?reviewedSegments.groups.flatMap(g=>g.parts.map(text=>({text}))):captions[12].cues;
const audio=Object.fromEntries(numbers.map(n=>[n,fs.readFileSync(path.join(process.env.VEDATOR_CAPTION_AUDIO,'episode-'+n+'.mp3'))]));
const diagnostics=process.env.VEDATOR_CAPTION_DIAGNOSTIC==='1';
let base;
const errors=[],failures=[];
const check=(condition,label,detail)=>{if(!condition){failures.push({label,detail});if(!diagnostics)assert(condition,label+' '+JSON.stringify(detail))}};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),name=url.pathname;
  if(name==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end('');return}
  if(workingDraft&&name==='/captions/episode-12.json'){
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(captions[12]));return;
  }
  if(name==='/content-v2.json'){
    const data={...source,episodes:source.episodes.filter(e=>numbers.includes(e.number)).map(e=>({...e,enclosure:base+'/episode-'+e.number+'.mp3',...(workingDraft?{captionFile:'captions/episode-'+e.number+'.json'}:{})})),series:[],questions:[]};
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
      clock:playbackClock,sync:syncYoutubeCaptions,seek:seekPlayback,language:setLanguage,
      part:()=>continuousPlayer?.part(),engine:()=>continuousPlayer,
      video:toggleYoutubePlayback,
      reader:enterCaptionReader,exitReader:exitCaptionReader,renderReader:(value,scale)=>{captionReaderScale=scale;captionReaderValue=value;layoutCaptionReader()}
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
 await page.evaluate(()=>window.__captionTest.open(12));
 await page.waitForFunction(()=>document.getElementById('audio-v2').readyState>=2);
 await page.evaluate(()=>document.getElementById('audio-v2').pause());
 const findings=[],candidateChecks=[];
 for(const width of [360,390]){
  await page.setViewport({width,height:844,isMobile:true,hasTouch:true});
  await page.evaluate(()=>window.__captionTest.open(12));
  await page.waitForFunction(()=>document.getElementById('audio-v2').readyState>=2);
  await page.evaluate(()=>document.getElementById('audio-v2').pause());
  for(const mode of ['mp3','video','reader']){
   if(mode==='video'){await page.evaluate(()=>window.__captionTest.video());await page.waitForFunction(()=>window.__yt)}
   if(mode==='reader'){await page.evaluate(()=>window.__captionTest.reader());await wait(100)}
   const rows=await page.evaluate(({cues,mode,propose})=>{
    const node=document.getElementById(mode==='mp3'?'player-caption-text-v2':mode==='video'?'player-video-caption-v2':'player-caption-reader-text-v2');
    function lines(){const words=[];const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let child;while(child=walker.nextNode()){const re=/\S+/g;let m;while(m=re.exec(child.textContent)){const r=document.createRange();r.setStart(child,m.index);r.setEnd(child,m.index+m[0].length);const b=r.getBoundingClientRect();words.push({text:m[0],y:Math.round(b.top)})}}const groups=[];for(const w of words){let g=groups.find(g=>Math.abs(g.y-w.y)<3);if(!g)groups.push(g={y:w.y,words:[]});g.words.push(w.text)}return groups.map(g=>g.words)}
    if(mode==='reader')window.__captionTest.renderReader('Kontrola mobilního vykreslení titulků.',1);else node.textContent='Kontrola mobilního vykreslení titulků.';
    if(node.clientWidth<20||!node.getBoundingClientRect().height)return [{kind:'caption-surface-not-visible'}];
    const result=[],candidates=[];
    function options(value){
     const flat=value.replace(/\s+/g,' '),choices=[value],words=flat.split(' ');
     if(flat.length<=48)choices.push(flat);
     for(let j=1;j<words.length;j++){
      const a=words.slice(0,j).join(' '),b=words.slice(j).join(' ');
      if(a.length>48||b.length>48||j<2||words.length-j<2||/(?:^| )[aikosuvz]$/i.test(a))continue;
      choices.push(a+'\n'+b);
      const bind=(line,k)=>{const w=line.split(' ');if(w.length<k+1||w.slice(-k).join(' ').length>24)return line;return w.slice(0,-k).join(' ')+' '+w.slice(-k).join('\u00a0')};
      for(const k of [2,3])choices.push(bind(a,k)+'\n'+bind(b,k));
     }
     return [...new Set(choices)];
    }
    const base=parseFloat(getComputedStyle(node).fontSize);
    for(const lang of ['cs','sk'])for(const scale of [1,1.3])for(let i=0;i<cues.length;i++){
     window.__captionTest.language(lang);node.lang=lang;
     const value=cues[i].text[lang];
     if(mode==='reader')window.__captionTest.renderReader(value,scale);else{node.style.fontSize=(base*scale)+'px';node.textContent=value}
     const wrapped=lines();
     if(wrapped.length>1&&wrapped.some(l=>l.length===1)){
      if(mode==='reader')window.__captionTest.renderReader(value.replace(/\s+/g,' '),scale);else node.textContent=value.replace(/\s+/g,' ');
      const natural=lines();if(!natural.some(l=>l.length===1))result.push({cue:i+1,lang,scale,wrapped,natural,kind:'fixed-break-orphan'});
     }
     if(node.scrollWidth>node.clientWidth+1)result.push({cue:i+1,lang,scale,kind:'horizontal-overflow'});
    }
    if(propose&&mode!=='reader')for(const lang of ['cs','sk'])for(const scale of [1,1.3])for(let i=0;i<cues.length;i++){
     const value=cues[i].text[lang],flat=value.replace(/\s+/g,' ');node.style.fontSize=(base*scale)+'px';node.textContent=flat;
     const naturalOrphan=lines().some(l=>l.length===1);
     for(const candidate of options(value)){
      node.textContent=candidate;const rendered=lines();
      candidates.push({cue:i+1,lang,text:candidate,fail:(node.scrollWidth>node.clientWidth+1||(!naturalOrphan&&rendered.length>1&&rendered.some(l=>l.length===1)))?1:0});
     }
    }
    node.style.fontSize='';return {result,candidates};
   },{cues:layoutCues,mode,propose:process.env.VEDATOR_LAYOUT_PROPOSE==='1'});
   if(Array.isArray(rows))findings.push(...rows.map(row=>({width,mode,...row})));else{findings.push(...rows.result.map(row=>({width,mode,...row})));candidateChecks.push(...rows.candidates)}
   if(process.env.VEDATOR_LAYOUT_SCREENSHOTS&&width===360){
    for(const lang of ['cs','sk']){
     await page.evaluate(({value,mode,lang,time})=>{
      window.__captionTest.language(lang);window.__captionTest.seek(time);if(window.__yt)window.__yt.time=time;
      if(mode==='reader')window.__captionTest.renderReader(value,1.3);
      else document.getElementById(mode==='mp3'?'player-caption-text-v2':'player-video-caption-v2').textContent=value;
     },{value:captions[12].cues[2].text[lang],mode,lang,time:captions[12].cues[2].start+.15});
     await wait(100);
     await page.screenshot({path:path.join(process.env.VEDATOR_LAYOUT_SCREENSHOTS,'episode-12-working-'+mode+'-'+lang+'.png')});
    }
   }
   if(mode==='reader')await page.evaluate(()=>window.__captionTest.exitReader());
  }
 }
 const totals=new Map();for(const c of candidateChecks){const key=c.cue+':'+c.lang+':'+c.text,old=totals.get(key)||{...c,fail:0};old.fail+=c.fail;totals.set(key,old)}
 const keys=[...new Set(findings.filter(f=>f.cue).map(f=>f.cue+':'+f.lang))];
 const layoutCost=c=>{const rows=c.text.split('\n');return Math.abs(rows[0].length-(rows[1]?.length||0))+2*(c.text.match(/\u00a0/g)||[]).length};
 const proposals=keys.map(key=>[...totals.values()].filter(c=>c.cue+':'+c.lang===key).sort((a,b)=>a.fail-b.fail||layoutCost(a)-layoutCost(b))[0]);
 const font=await page.evaluate(()=>getComputedStyle(document.getElementById('player-caption-text-v2')).fontFamily);
 const browserVersion=await browser.version();
 await new Promise(resolve=>process.stdout.write(JSON.stringify({episode:12,status:reviewedSegments?'manually-resegmented-text-layout-not-final-aligned-captions':workingDraft?'working-source-groups-not-final-caption-layout':'final-caption-layout',sourceGroupsReviewed:reviewedSegments?.sourceGroupsReviewed,browser:browserVersion,font,checkedCues:layoutCues.length,widths:[360,390],languages:['cs','sk'],scales:[1,1.3],modes:['mp3','video','reader'],findings,proposals},null,2)+'\n',resolve));
assert.equal(findings.length,0,'Mobile caption overflow or avoidable fixed-break orphan');
}finally{await browser.close();server.close()}
