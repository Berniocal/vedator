import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
import './test-video-catalog.mjs';
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('app-v2.js','utf8'),data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const mappings=JSON.parse(fs.readFileSync('episode-videos.json','utf8'));
const captions=JSON.parse(fs.readFileSync('captions/episode-1.json','utf8'));
const captionAt=(time,lang)=>captions.cues.find(c=>c.start<=time&&time<c.end)?.text[lang]||'';
const unavailable=data.episodes.find(e=>!e.youtubeId);assert(unavailable);
const fixtureNumbers=new Set([1,2,3,4,10,11,142,1642,1701,1715,unavailable.number]);
const fixture={...data,episodes:data.episodes.filter(e=>fixtureNumbers.has(e.number)),series:[],questions:[]};
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
      return {ok:captionMode!=='error',status:captionMode==='error'?404:200,json:async()=>JSON.parse(fs.readFileSync(String(url).replace(/^\.\//,''),'utf8'))};
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
  await t.play(1);assert(!t.$('#player-video-v2').disabled);assert.equal(t.captionRequests.length,1,'MP3 captions load once when available');
  t.audio.currentTime=153.5;t.audio.dispatchEvent(new t.w.Event('timeupdate'));await wait();
  assert.equal(t.$('#player-caption-text-v2').textContent,captionAt(153.5,'cs'));
  await t.click('#player-video-v2');let player=t.players.at(-1),frame=t.$('#player-youtube-frame-v2');
  assert(frame.src.includes('/P_QuPTRbtc8?'));assert.equal(new URL(frame.src).searchParams.get('start'),'153');
  assert.equal(new URL(frame.src).searchParams.get('origin'),'https://example.test');
  assert.equal(frame.referrerPolicy,'strict-origin-when-cross-origin');assert(t.audio.paused);assert.equal(t.audio.getAttribute('src'),null);
  player.ready();await wait();assert(!player.paused);
  assert.equal(t.$('#player-video-caption-v2').textContent,captionAt(153.5,'cs'));
  const seek=t.$('#player-seek-v2');seek.value='201';seek.dispatchEvent(new t.w.Event('change'));assert.equal(player.lastSeek,201);
  await t.captionLanguage('sk');assert.equal(t.$('#player-video-caption-v2').textContent,captionAt(201,'sk'));
  await t.captionLanguage('off');assert(t.$('#player-video-caption-v2').classList.contains('hidden'));assert(!player.paused,'Caption toggle never stops video');
  await t.captionLanguage('cs');await t.click('#player-forward10-v2');assert.equal(player.lastSeek,211);
  await t.click('#player-speed-v2');assert.equal(player.speed,1.25);
  await t.click('#player-video-v2');assert(player.destroyed);assert(!t.$('#player-youtube-frame-v2'));
  assert(t.audio.src.includes('podcast_ep1.mp3'));assert.equal(t.audio.currentTime,211);assert(!t.audio.paused);
  assert.equal(t.$('#player-caption-text-v2').textContent,captionAt(211,'cs'),'Existing MP3 captions survive the handoff');
  await t.click('#player-video-v2');player=t.players.at(-1);player.ready();await wait();
  const requests=t.captionRequests.length;
  for(const number of [11,142,1642,1701,1715].filter(n=>!mappings.find(m=>m.episode===n)?.captionFile)){
    const mapping=mappings.find(e=>e.episode===number);assert(mapping);
    const stale=t.players.at(-1);await t.play(number);const current=t.players.at(-1);current.ready();await wait();
    assert(t.$('#player-youtube-frame-v2').src.includes('/'+mapping.youtubeId+'?'),`Correct video for internal episode ${number}`);
    assert(t.$('#player-captions-v2').classList.contains('hidden'),'New video links do not create subtitle controls');
    stale.emit(0);await wait();assert(t.$('#player-youtube-frame-v2').src.includes('/'+mapping.youtubeId+'?'),'Old player callback cannot change a newer episode');
  }
  assert.equal(t.captionRequests.length,requests,'Video-only episodes must not request subtitle files');
  await t.play(unavailable.number);assert(t.$('#player-video-v2').disabled);assert(!t.$('#player-youtube-frame-v2'));assert(!t.audio.paused);
  assert.equal(t.w.localStorage.getItem('vedator-youtube-enabled-v1'),'true','Unavailable video does not erase preference');
  await t.play(11);player=t.players.at(-1);player.ready();await wait();player.events.onAutoplayBlocked();
  assert.equal(t.$('#player-play-v2').textContent,'▶');player.events.onError({data:150});
  assert(t.$('#player-video-status-v2 a').href.includes(mappings.find(e=>e.episode===11).youtubeId),'Unembeddable video offers its correct direct link');
  await wait();
  assert.equal(t.errors.length,0,t.errors.map(String).join('\n'));
}finally{await wait();t.dom.window.close()}
console.log('YouTube player OK: expanded regular/special episode catalog, exact iframe IDs, seek, language/off, MP3 handoff, video-only episodes, unavailable links and stale callbacks.');
