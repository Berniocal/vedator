import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-v2.js','utf8');
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const episodes=new Map(data.episodes.map(episode=>[episode.number,episode]));
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
const mixed=data.series.filter(series=>series.episodes.some(n=>n>=1600)&&series.episodes.some(n=>n<1600));
assert(mixed.some(series=>series.name==='Černé díry'),'Expected the reported mixed collection');

async function setup(language,saved){
  const dom=new JSDOM(html,{url:'https://example.test/vedator/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.localStorage.setItem('vedator-ui-language-v1',language);
  for(const [key,value] of Object.entries(saved||{}))w.localStorage.setItem(key,value);
  w.fetch=async()=>({ok:true,status:200,json:async()=>data});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.IntersectionObserver=class{observe(){}disconnect(){}};
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
  w.HTMLMediaElement.prototype.play=()=>Promise.resolve();
  w.HTMLMediaElement.prototype.pause=()=>{};
  w.HTMLMediaElement.prototype.load=function(){this.currentTime=0};
  Object.defineProperty(w.HTMLMediaElement.prototype,'duration',{get:()=>3600});
  Object.defineProperty(w.HTMLMediaElement.prototype,'readyState',{get:()=>4});
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Series playback boot timeout')),10000);
    w.addEventListener('vedator-v2-ready',()=>{clearTimeout(timer);resolve()},{once:true});
  });
  w.eval(app);w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
  await ready;await settle();await settle();
  const audio=w.document.querySelector('#audio-v2');
  const snapshot=()=>JSON.parse(w.localStorage.getItem('vedatorLastPlaybackV1'));
  async function expectEpisode(number,series){
    await settle();audio.dispatchEvent(new w.Event('loadedmetadata'));await settle();
    const episode=episodes.get(number),saved=snapshot();
    assert.equal(audio.src,episode.enclosure,`${series.name}: wrong audio for ${number}`);
    assert.equal(w.document.querySelector('#player-title-v2').textContent,episode.i18n?.[language==='cz'?'cs':'sk']?.title||episode.title);
    assert.equal(saved.episode,number,'Saved playback must match the actual MP3');
    assert.equal(saved.context.items[saved.context.index].n,number,'Queue index must match the selected episode');
    assert.deepEqual(saved.context.items.map(item=>item.n),series.episodes,'Queue must follow the displayed release-date order');
  }
  return {dom,w,audio,snapshot,expectEpisode};
}

let clicks=0,transitions=0,restoreState;
for(const language of ['cz','sk']){
  const {dom,w,audio,snapshot,expectEpisode}=await setup(language);
  w.document.querySelector('.tab-v2[data-view="series"]').click();
  // Check every collection's queue, then every special's real row click and neighbors.
  const ordered=[data.series.find(series=>series.name==='Černé díry'),...data.series.filter(series=>series.name!=='Černé díry')];
  for(const series of ordered){
    const seriesIndex=data.series.indexOf(series);
    const card=w.document.querySelector(`.series[data-series-index="${seriesIndex}"]`);
    card.open=true;card.dispatchEvent(new w.Event('toggle'));await settle();
    const rows=[...card.querySelectorAll('.series-item')];
    assert.equal(rows.length,series.episodes.length);
    const indices=new Set([0,...(mixed.includes(series)?series.episodes.flatMap((number,index)=>number>=1600?[index]:[]):[])]);
    for(const index of indices){
      const number=series.episodes[index];
      rows[index].click();await expectEpisode(number,series);clicks++;
      if(number<1600)continue;
      if(index>0){
        w.document.querySelector('#player-prev-v2').click();await expectEpisode(series.episodes[index-1],series);
        w.document.querySelector('#player-next-v2').click();await expectEpisode(number,series);transitions+=2;
      }
      if(index+1<series.episodes.length){
        audio.dispatchEvent(new w.Event('ended'));await expectEpisode(series.episodes[index+1],series);transitions++;
      }
    }
  }
  dom.window.close();
  console.log(`Series row/queue/navigation checks passed: ${language}`);
}
const blackHoles=data.series.find(series=>series.name==='Černé díry');
// A fresh partial-listen fixture keeps resume separate from tracks completed above.
{
  const {dom,w,audio,snapshot,expectEpisode}=await setup('cz',{
    vedatorPlaybackProgressV1:JSON.stringify({'episode-1706':{currentTime:125,duration:3600,completed:false,updatedAt:1}})
  });
  w.document.querySelector('.tab-v2[data-view="series"]').click();
  const card=w.document.querySelector(`.series[data-series-index="${data.series.indexOf(blackHoles)}"]`);
  card.querySelector('.series-resume-v2').click();await expectEpisode(1706,blackHoles);
  assert.equal(audio.currentTime,125,'Resume must keep the special and its own position');
  assert.equal(snapshot().context.index,blackHoles.episodes.indexOf(1706));
  restoreState=Object.fromEntries(['vedatorLastPlaybackV1','vedatorPlaybackProgressV1','vedatorCollectionProgressV1'].map(key=>[key,w.localStorage.getItem(key)]));
  dom.window.close();
}
const {dom,w,audio,expectEpisode}=await setup('cz',restoreState);
await expectEpisode(1706,blackHoles);
assert.equal(audio.currentTime,125,'Restart must restore the special position');
w.document.querySelector('#player-next-v2').click();await expectEpisode(1708,blackHoles);
w.document.querySelector('#player-next-v2').click();await expectEpisode(104,blackHoles);
dom.window.close();
console.log(JSON.stringify({ok:true,collections:data.series.length,languages:2,clicks,transitions,mixedCollections:mixed.length,resume:true,restore:true}));
