import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';

const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('app-v2.js','utf8'),data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const mappings=JSON.parse(fs.readFileSync('episode-videos.json','utf8'));
assert.equal(mappings.length,10);
for(let n=1;n<=10;n++){
  const episode=data.episodes.find(e=>e.number===n),mapping=mappings.find(e=>e.episode===n);
  assert.equal(episode.id,mapping.guid);assert.equal(episode.youtubeId,mapping.youtubeId);
}
assert(data.episodes.filter(e=>e.number>10).every(e=>!e.youtubeId),'Only the first ten episodes are enabled');
// Exercise the real UI against a bounded slice of the real catalog.
const fixture={...data,episodes:data.episodes.filter(e=>e.number<=20),series:[],questions:[]};
const wait=()=>new Promise(resolve=>setTimeout(resolve,25));
async function boot(storage={},api=true){
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(html,{url:'https://example.test/vedator/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
  for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
  w.localStorage.setItem('vedator-ui-language-v1','cz');
  w.XMLHttpRequest=class{open(){}send(){queueMicrotask(()=>{this.status=200;this.responseText=JSON.stringify(fixture);this.onload()})}};
  w.fetch=async()=>({ok:true,json:async()=>fixture});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
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
  return {dom,w,$,audio,players,play,click,errors,snapshot:()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]))};
}
const t=await boot();
try{
  await t.play(1);assert(!t.$('#player-video-v2').disabled);
  t.audio.currentTime=153.5;t.audio.dispatchEvent(new t.w.Event('timeupdate'));
  await t.click('#player-video-v2');
  let frame=t.$('#player-youtube-frame-v2'),player=t.players.at(-1);
  assert(frame.src.includes('/P_QuPTRbtc8?'));assert.equal(new URL(frame.src).searchParams.get('start'),'153');
  assert.equal(new URL(frame.src).searchParams.get('origin'),'https://example.test');
  assert(t.audio.paused);assert.equal(t.audio.getAttribute('src'),null,'MP3 network must stop during video');
  assert.equal(frame.referrerPolicy,'strict-origin-when-cross-origin');
  const seek=t.$('#player-seek-v2');seek.value='201';seek.dispatchEvent(new t.w.Event('change'));
  player.ready();await wait();assert.equal(player.lastSeek,201,'Seek before API readiness must survive');assert(!player.paused);
  player.time=305.75;player.emit(2);await wait();
  assert.equal(t.$('#player-play-v2').textContent,'▶');
  assert.equal(JSON.parse(t.w.localStorage.getItem('vedatorPlaybackProgressV1'))['episode-1'].currentTime,305.75);
  await t.click('#player-play-v2');assert(!player.paused);
  await t.click('#player-forward10-v2');assert.equal(player.lastSeek,315.75);
  await t.click('#player-speed-v2');assert.equal(player.speed,1.25);
  await t.click('#player-video-v2');assert(player.destroyed);assert(!t.$('#player-youtube-frame-v2'));
  assert(t.audio.src.includes('podcast_ep1.mp3'));assert.equal(t.audio.currentTime,315.75);assert(!t.audio.paused);
  assert.equal(t.w.localStorage.getItem('vedator-youtube-enabled-v1'),'false');
  await t.click('#player-video-v2');player=t.players.at(-1);player.ready();player.time=420;player.emit(2);await wait();
  const snapshot=t.snapshot();
  const restored=await boot(snapshot);
  try{
    const restoredPlayer=restored.players.at(-1);assert(restoredPlayer,'Saved video preference must restore the iframe');restoredPlayer.ready();await wait();
    assert.equal(restoredPlayer.time,420,'Restore video at its saved position');assert(restoredPlayer.paused,'Reopening the app must not autoplay');
    await restored.click('#player-expand-v2');await restored.click('#player-video-v2');
    assert(!restored.$('#player-youtube-frame-v2'));assert.equal(restored.audio.currentTime,420);assert(restored.audio.paused);
  }finally{restored.dom.window.close()}
  await t.play(11);assert(t.$('#player-video-v2').disabled);assert(!t.$('#player-youtube-frame-v2'));assert(t.audio.src.includes('podcast_ep11.mp3'));
  assert.equal(t.w.localStorage.getItem('vedator-youtube-enabled-v1'),'true','Unmapped episode must not erase preference');
  await t.play(2);player=t.players.at(-1);assert(t.$('#player-youtube-frame-v2').src.includes('QY9pL56nmsA'));player.ready();
  player.events.onAutoplayBlocked();assert.equal(t.$('#player-play-v2').textContent,'▶');assert(t.$('#player-video-status-v2').textContent.includes('▶'));
  player.events.onError({data:150});assert(t.$('#player-video-status-v2 a').href.includes('QY9pL56nmsA'));
  await t.click('#player-play-v2');await t.click('#player-close-v2');assert(player.paused,'Collapsed video must pause');
  await t.click('#player-expand-v2');player.emit(0);await wait();
  assert(t.$('#player-youtube-frame-v2').src.includes('1jI97x33kRo'),'Video ending advances the existing episode context: '+t.$('#player-youtube-frame-v2').src+' '+t.$('#player-title-v2').textContent);
  const stale=t.players.at(-1);await t.play(4);stale.ready();stale.emit(0);await wait();
  assert(t.$('#player-youtube-frame-v2').src.includes('BXa3gr-Zdzg'),'Late callbacks must not change a newer episode');
  assert.equal(t.errors.length,0,t.errors.map(String).join('\n'));
}finally{t.dom.window.close()}
const pending=await boot({},false);
try{
  await pending.play(1);pending.audio.currentTime=99;
  await pending.click('#player-video-v2');assert(pending.$('script[src="https://www.youtube.com/iframe_api"]'));
  await pending.click('#player-video-v2');assert.equal(pending.audio.currentTime,99);
  pending.w.YT={Player:class{constructor(){throw new Error('Cancelled player must not be constructed')}}};
  pending.w.onYouTubeIframeAPIReady();await wait();assert(!pending.$('#player-youtube-frame-v2'));
}finally{pending.dom.window.close()}
console.log('YouTube player OK: 10 GUID mappings, MP3/video handoff, seek, controls, progress, restore, unavailable videos, errors, collapse, next episode and cancelled callbacks.');
