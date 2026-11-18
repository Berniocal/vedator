import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.VEDATOR_TEST_DEPS||process.cwd(),'package.json'));
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('app-v2.js','utf8'),data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const app=source.replace('  function syncYoutubeCaptions(){', '  window.__readerTest={readerCues,readerCaptionAt,sync:syncYoutubeCaptions};\n  function syncYoutubeCaptions(){');
const original=JSON.parse(fs.readFileSync('captions/episode-1.json','utf8'));
const cue=(start,end,cs)=>({start,end,text:{cs,sk:cs}});
const captions={...original,cues:[cue(1,1.15,'Ano.'),cue(4,4.2,'Tohle je delší titulek, který potřebuje více času na čtení.'),cue(12,12.2,'Další.'),cue(12.3,13,'Souvislá řeč.'),cue(20,21,'První dlouhý řádek se spoustou slov\njedno\na třetí řádek, který se má přesunout do dvou vyvážených řádků.')]};
const fixture={...data,episodes:data.episodes.filter(e=>e.number<=20),series:[],questions:[]};
const wait=()=>new Promise(resolve=>setTimeout(resolve,25));
async function boot(storage={},api=true,captionMode='ok'){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(html,{url:'https://example.test/vedator/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
  for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
  w.localStorage.setItem('vedator-ui-language-v1','cz');
  w.XMLHttpRequest=class{open(){}send(){queueMicrotask(()=>{this.status=200;this.responseText=JSON.stringify(fixture);this.onload()})}};
  const captionRequests=[];let resolveCaptions;
  w.fetch=async url=>{
    if(String(url).includes('captions/')){
      captionRequests.push(String(url));
      if(captionMode==='delay')await new Promise(resolve=>{resolveCaptions=resolve});
      return {ok:captionMode!=='error',status:captionMode==='error'?404:200,json:async()=>captions};
    }
    return {ok:true,json:async()=>fixture};
  };w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.alert=()=>{};
  const media=w.HTMLMediaElement.prototype;
  Object.defineProperty(media,'paused',{get(){return this._paused!==false}});
  Object.defineProperty(media,'duration',{get(){return this._loaded?1800:NaN}});
  Object.defineProperty(media,'readyState',{get(){return this._loaded?4:0}});
  media.pause=function(){const wasPlaying=!this.paused;this._paused=true;if(wasPlaying)this.dispatchEvent(new w.Event('pause'))};
  media.play=function(){this._paused=false;this.dispatchEvent(new w.Event('play'));return Promise.resolve()};
  media.load=function(){this._loaded=false;this.currentTime=0;const version=this._version=(this._version||0)+1;if(this.getAttribute('src'))queueMicrotask(()=>{if(version!==this._version)return;this._loaded=true;this.dispatchEvent(new w.Event('loadedmetadata'))})};
  const players=[];
  class Player{
    constructor(frame,{events}){this.frame=frame;this.events=events;this.time=0;this.destroyed=false;this.paused=true;players.push(this);}
    ready(){this.events.onReady({target:this});}
    emit(value){this.events.onStateChange({target:this,data:value});}
    playVideo(){this.paused=false;this.emit(1)}
    pauseVideo(){this.paused=true;this.emit(2)}
    seekTo(time){this.time=time;this.lastSeek=time}
    setPlaybackRate(speed){this.speed=speed}
    getCurrentTime(){return this.time}
    getDuration(){return 1800}
    destroy(){this.destroyed=true;this.frame.remove()}
  }
  if(api)w.YT={Player};
  const ready=new Promise(resolve=>w.addEventListener('vedator-v2-ready',resolve,{once:true}));
  w.eval(app);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await ready;await wait();
  const $=selector=>w.document.querySelector(selector),audio=$('#audio-v2');
  const sort=$('#parity-sort-v2');sort.value='old';sort.dispatchEvent(new w.Event('change',{bubbles:true}));await wait();
  async function play(n){$(`.episode-card-v2[data-episode="${n}"] > .actions .play`).click();await wait();}
  async function click(selector){$(selector).click();await wait();}
  async function captionLanguage(value){$('#player-caption-language-v2').value=value;$('#player-caption-language-v2').dispatchEvent(new w.Event('change'));await wait()}
  return {dom,w,$,audio,players,play,click,errors,captionLanguage,captionRequests,resolveCaptions:()=>resolveCaptions?.(),snapshot:()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]))};
}
const t=await boot();
try{
  const {$,w,audio}=t;
  w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText:value=>({width:value.length*13})});
  Object.defineProperty($('#player-caption-reader-text-v2'),'clientWidth',{configurable:true,get:()=>300});
  Object.defineProperty($('#player-caption-reader-overlay-v2'),'clientHeight',{get:()=>700});
  await t.play(1);audio.currentTime=1;audio.dispatchEvent(new w.Event('timeupdate'));await wait();
  await t.captionLanguage('cs');await t.click('#player-caption-reader-button-v2');
  const overlay=$('#player-caption-reader-overlay-v2'),bar=$('#caption-reader-controls-v2');
  assert(!overlay.hidden);assert(bar.hidden,'Reader starts with hidden controls');
  await t.click('#player-caption-reader-overlay-v2');assert(!bar.hidden);assert(!overlay.hidden);
  await t.click('#caption-reader-play-v2');assert(audio.paused);assert(!bar.hidden,'Playback buttons do not hide the bar');
  await t.click('#caption-reader-play-v2');assert(!audio.paused);
  audio.currentTime=22;await t.click('#caption-reader-back-v2');assert.equal(audio.currentTime,12);
  await t.click('#caption-reader-forward-v2');assert.equal(audio.currentTime,22);assert(!bar.hidden);
  await t.click('#player-caption-reader-overlay-v2');assert(bar.hidden);assert(!overlay.hidden,'Second tap hides only controls');
  audio.currentTime=2;w.__readerTest.sync();
  assert.equal($('#player-caption-text-v2').textContent,'','Inline timing remains acoustic');
  assert.equal($('#player-caption-reader-text-v2').textContent,'Ano.','Brief word stays visible in surrounding silence');
  audio.currentTime=3.7;w.__readerTest.sync();assert.match($('#player-caption-reader-text-v2').textContent,/Tohle/,'Short cue may start slightly early in silence');
  audio.currentTime=20.5;w.__readerTest.sync();
  const node=$('#player-caption-reader-text-v2'),lines=node.querySelectorAll('span');
  assert.equal(lines.length,2);assert.equal(node.textContent.replace(/\s+/g,' '),captions.cues.at(-1).text.cs.replace(/\s+/g,' '),'Reflow preserves all words');
  Object.defineProperty(node,'clientWidth',{get:()=>1100});w.dispatchEvent(new w.Event('resize'));assert(node.querySelectorAll('span').length<=2);
  await t.click('#player-caption-reader-overlay-v2');await t.click('#caption-reader-close-v2');assert(overlay.hidden);await wait();
  assert(!w.history.state?.vedatorCaptionReader,'Exit consumes fallback history entry');
  await t.click('#player-caption-reader-button-v2');w.history.back();await wait();assert(overlay.hidden,'Back closes fallback reader');
  await t.click('#player-caption-reader-button-v2');overlay.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(overlay.hidden);await wait();
  // Exercise the native fullscreen path and Android/browser Back via fullscreenchange.
  overlay.requestFullscreen=async options=>{w.__fullscreenOptions=options;Object.defineProperty(w.document,'fullscreenElement',{configurable:true,value:overlay});w.document.dispatchEvent(new w.Event('fullscreenchange'))};
  w.document.exitFullscreen=async()=>{Object.defineProperty(w.document,'fullscreenElement',{configurable:true,value:null});w.document.dispatchEvent(new w.Event('fullscreenchange'))};
  await t.click('#player-caption-reader-button-v2');assert(!overlay.hidden);await t.click('#player-caption-reader-overlay-v2');assert.equal(w.__fullscreenOptions.navigationUI,'show');
  await t.click('#player-caption-reader-overlay-v2');assert.equal(w.__fullscreenOptions.navigationUI,'hide');
  await w.document.exitFullscreen();assert(overlay.hidden,'System Back leaving fullscreen returns to app');
  for(const file of fs.readdirSync('captions').filter(f=>/^episode-\d+\.json$/.test(f))){
    const real=JSON.parse(fs.readFileSync('captions/'+file,'utf8'));
    for(const lang of ['cs','sk']){
      const before=JSON.stringify(real.cues),windows=w.__readerTest.readerCues(real.cues,lang);
      windows.forEach((win,i)=>{
        const original=real.cues[i];assert(win.start<=original.start);assert(win.end>=original.end);assert(win.start>=0);assert(win.end>win.start);
        if(i)assert(win.start>=windows[i-1].end,'Reading windows cannot overlap');
        assert(original.start-win.start<=.350001);assert(win.end-original.end<=2.500001);
        assert.equal(w.__readerTest.readerCaptionAt(real.cues,lang,(original.start+original.end)/2),original.text[lang].replace(/\s+/g,' ').trim());
      });assert.equal(JSON.stringify(real.cues),before,'No transcript or acoustic timestamp changes');
    }
  }
  assert.equal(t.errors.length,0,t.errors.map(String).join('\n'));
  console.log('Caption reader OK: bilingual nonoverlapping reading windows, preserved timing/text, balanced two-line reflow, toggle controls, play/pause, ±10 s, close, Back and fullscreen navigation.');
}finally{t.dom.window.close()}
