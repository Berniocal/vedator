import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-v2.js','utf8');
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const nuclear=data.episodes.find(e=>e.number===142);
const webb=data.episodes.find(e=>e.number===1642);
const wait=()=>new Promise(resolve=>setTimeout(resolve,40));

async function setup(hash=''){
  const dom=new JSDOM(html,{url:'https://example.test/v2.html'+hash,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.fetch=async()=>({ok:true,status:200,json:async()=>data});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.IntersectionObserver=class{observe(){}disconnect(){}};
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.scrollTo=()=>{};
  w.HTMLMediaElement.prototype.play=()=>Promise.resolve();
  w.HTMLMediaElement.prototype.pause=()=>{};
  w.HTMLMediaElement.prototype.load=function(){this.currentTime=0};
  Object.defineProperty(w.HTMLMediaElement.prototype,'duration',{get:()=>1800});
  Object.defineProperty(w.HTMLMediaElement.prototype,'readyState',{get:()=>4});
  w.localStorage.setItem('vedatorPlaybackProgressV1',JSON.stringify({'episode-142':{currentTime:600,duration:1800,completed:false,updatedAt:1}}));
  w.localStorage.setItem('vedator-user-playlists-v1',JSON.stringify([{id:'two142',name:'Both 142',items:['CO','Zq']}]));
  // An existing offline nuclear recording must never be reused for Webb.
  w.localStorage.setItem('vedatorOfflineAudioIndexV1',JSON.stringify({'episode-142':{key:'episode-142',cacheUrl:nuclear.enclosure}}));
  const hits=[];
  w.caches={open:async()=>({match:async url=>{hits.push(url);return null}})};
  const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('ready timeout')),5000);w.addEventListener('vedator-v2-ready',()=>{clearTimeout(timer);resolve()},{once:true})});
  w.eval(app);w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
  await ready;await wait();
  w.document.querySelector('#audio-v2').dispatchEvent(new w.Event('loadedmetadata'));await wait();
  return {dom,w,hits};
}

const {dom,w,hits}=await setup();
hits.length=0;
const search=w.document.querySelector('#search-v2');
search.value='142';search.dispatchEvent(new w.Event('input',{bubbles:true}));await wait();
const cards=[...w.document.querySelectorAll('#episodes-v2 .episode-card-v2')].filter(c=>!c.hidden&&[142,1642].includes(Number(c.dataset.episode)));
assert.equal(cards.length,2,'Search 142 must show both episodes');
assert(cards.every(c=>c.querySelector('.meta').textContent.includes('142')));
const play=async number=>{w.document.querySelector(`#episodes-v2 [data-episode="${number}"] .actions .play`).click();await wait();const audio=w.document.querySelector('#audio-v2');audio.dispatchEvent(new w.Event('loadedmetadata'));await wait();return audio};
let audio=await play(1642);
assert.equal(audio.src,webb.enclosure,'Webb card must play Webb');
assert.equal(audio.currentTime,0,'Webb must not inherit the nuclear resume position');
assert.equal(hits.length,0,'Webb must not read the nuclear offline recording');
audio.currentTime=125;audio.dispatchEvent(new w.Event('timeupdate'));await wait();
audio=await play(142);
assert.equal(audio.src,nuclear.enclosure,'Nuclear card must still play nuclear');
assert.equal(audio.currentTime,600,'Existing nuclear resume position must survive');
assert(hits.includes(nuclear.enclosure));
audio=await play(1642);
assert.equal(audio.currentTime,125,'Webb must resume its own saved position');
w.document.querySelector('#player-next-v2').click();await wait();
assert.equal(audio.src,nuclear.enclosure,'Next after Webb must be the other 142');
const saved=JSON.parse(w.localStorage.getItem('vedatorPlaybackProgressV1'));
assert.equal(saved['episode-1642'].currentTime,125);
assert.equal(saved['episode-142'].currentTime,600);
w.document.querySelector('.tab-v2[data-view="playlists"]').click();await wait();
assert.equal(w.document.querySelectorAll('#playlists-v2 .playlist-item').length,2,'Both episodes must remain distinct in a playlist');
dom.window.close();
for(const [number,episode] of [[142,nuclear],[1642,webb]]){
  const {dom,w}=await setup('#episode='+number);
  const card=w.document.querySelector(`#episodes-v2 [data-episode="${number}"]`);
  assert(card,'Direct link must target the right card');
  card.querySelector('.actions .play').click();await wait();
  assert.equal(w.document.querySelector('#audio-v2').src,episode.enclosure,'Direct link must play the correct audio');
  dom.window.close();
}
console.log(JSON.stringify({ok:true,distinctAudio:true,independentProgress:true,offlineIsolation:true,playlist:true,deepLinks:true,navigation:true}));
