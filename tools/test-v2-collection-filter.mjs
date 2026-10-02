import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('index.html','utf8').replace('<script src="./app-v2.js" defer></script>','');
const app=fs.readFileSync('app-v2.js','utf8');
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const dom=new JSDOM(html,{url:'https://example.test/v2.html',runScripts:'outside-only',pretendToBeVisual:true});
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
  const timer=setTimeout(()=>reject(new Error('V2 ready event timeout')),5000);
  window.addEventListener('vedator-v2-ready',event=>{clearTimeout(timer);resolve(event.detail)},{once:true});
});
window.eval(app);
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
await ready;
await new Promise(resolve=>setTimeout(resolve,30));

const assert=(condition,message)=>{if(!condition)throw new Error(message)};

for(const view of ['episodes']){
  window.document.querySelector(`.tab-v2[data-view="${view}"]`).click();
  const buttons=[...window.document.querySelectorAll('#parity-topics-v2 .topic-v2')];
  assert(buttons.length===data.series.length+1,`Wrong collection count: ${view}`);
  for(let i=0;i<data.series.length;i++){
    const series=data.series[i],members=new Set(series.episodes.map(Number));
    const button=window.document.querySelector(`#parity-topics-v2 [data-topic="collection:${i}"]`);
    assert(button.textContent===(series.i18n?.cs||series.name),`Label mismatch: ${series.name}`);
    button.click();
    const root=window.document.querySelector(`.view-v2[data-view="${view}"]`);
    let sentinel;let loops=0;
    while((sentinel=root.querySelector('.parity-sentinel'))&&loops++<200)sentinel.click();
    const cards=[...root.querySelectorAll(view==='episodes'?'article[data-episode]':'.question-card')];
    const numbers=cards.map(card=>view==='episodes'?Number(card.dataset.episode):Number(card.dataset.item.split(':')[1]));
    assert(numbers.every(n=>members.has(n)),`Foreign episode: ${view}/${series.name}`);
    const source=view==='episodes'?data.episodes:view==='questions'?data.questions:Object.entries(data.nonquestions.episodes).flatMap(([episode,languages])=>(languages.cs||languages.sk||[]).map(item=>({...item,episode})));
    assert(cards.length===source.filter(item=>members.has(Number(view==='episodes'?item.number:item.episode))).length,`Missing members: ${view}/${series.name}`);
    assert(!root.querySelector('mark'),`Unexpected highlight: ${view}/${series.name}`);
  }
  window.document.querySelector('#parity-topics-v2 [data-topic="all"]').click();
  const search=window.document.querySelector('#search-v2');search.value='kvant';search.dispatchEvent(new window.Event('input',{bubbles:true}));
  await new Promise(resolve=>setTimeout(resolve,30));
  assert(window.document.querySelector(`#${view}-v2 mark`),`Text highlighting broken: ${view}`);
  search.value='';search.dispatchEvent(new window.Event('input',{bubbles:true}));
}
for(const view of ['questions','nonquestions']){window.document.querySelector(`.tab-v2[data-view="${view}"]`).click();assert(window.document.querySelector('#parity-topics-v2').classList.contains('hidden'),`Row must stay hidden: ${view}`)}
window.document.querySelector('.tab-v2[data-view="episodes"]').click();
window.document.querySelector('.language-v2 [data-lang="sk"]').click();
for(let i=0;i<data.series.length;i++)assert(window.document.querySelector(`#parity-topics-v2 [data-topic="collection:${i}"]`).textContent===(data.series[i].i18n?.sk||data.series[i].name),'Slovak label mismatch');
assert(window.getComputedStyle(window.document.querySelector('#parity-topics-v2')).display!=='none','Production collection row hidden');
console.log('All collection memberships, labels, text highlights and production visibility passed');
window.close();
