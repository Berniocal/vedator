import fs from 'node:fs';
import {JSDOM} from 'jsdom';

// Regression for the real click path: a synthetic episode card must select
// exactly the MP3 belonging to its RSS GUID, never the first number=0 item.
const html=fs.readFileSync('index.html','utf8').replace('<script src="./app-v2.js" defer></script>','');
const app=fs.readFileSync('app-v2.js','utf8');
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const rss=JSON.parse(fs.readFileSync('episodes.json','utf8')).episodes;
const specials=rss.filter(e=>!Number(e.number));
const byGuid=new Map(data.episodes.map(e=>[e.id,e]));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(specials.length>=41,'Expected historical unnumbered special collection');

const dom=new JSDOM(html,{url:'https://example.test/vedator/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.localStorage.setItem('vedator-ui-language-v1','cz');
window.fetch=async()=>({ok:true,status:200,json:async()=>data});
window.HTMLMediaElement.prototype.play=()=>Promise.resolve();
window.HTMLMediaElement.prototype.pause=()=>{};
window.HTMLMediaElement.prototype.load=()=>{};
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.requestAnimationFrame=callback=>setTimeout(()=>callback(Date.now()),0);
window.alert=()=>{};window.prompt=()=>'';window.confirm=()=>true;
const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Player test boot timeout')),10000);
  window.addEventListener('vedator-v2-ready',()=>{clearTimeout(timer);resolve()},{once:true});
});
window.eval(app);
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
await ready;
await new Promise(resolve=>setTimeout(resolve,25));

const audio=window.document.querySelector('#audio-v2');
const title=window.document.querySelector('#player-title-v2');
assert(audio&&title,'V2 player nodes missing');

for(const source of specials){
  const episode=byGuid.get(source.id);
  assert(episode&&Number(episode.number)>0,'Missing identity for '+source.title);
  const card=window.document.createElement('article');
  card.className='episode-card-v2';
  const actions=window.document.createElement('div');
  actions.className='actions';
  const play=window.document.createElement('button');
  play.type='button';
  play.className='play';
  play.dataset.episode=String(episode.number);
  play.dataset.seconds='';
  actions.appendChild(play);
  card.appendChild(actions);
  window.document.body.appendChild(card);
  play.click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert(audio.getAttribute('src')===source.enclosure,'Incorrect MP3 selected for '+source.title);
  assert(title.textContent.includes(episode.i18n?.cs?.title||episode.title),'Incorrect player title for '+source.title);
  card.remove();
}
// Also verify the previously duplicated episode 113 displays and plays its own record.
const repost=byGuid.get('vedatorskypodcast.podbean.com/f7a0b29b-66bb-3090-9661-9c2b597593f9');
assert(repost?.number===1613&&repost?.displayNumber===113,'Duplicated 113 playback identity regressed');
assert(specials.every(e=>{
  const b=byGuid.get(e.id);
  return b.unnumbered||Number(b.displayNumber)>0;
}),'Unnumbered episode lost its public series label');

console.log(JSON.stringify({ok:true,unnumberedSpecialsTested:specials.length,uniqueSpecialPlaybackIds:new Set(specials.map(e=>byGuid.get(e.id).number)).size,duplicate113Fixed:true},null,2));
window.close();
