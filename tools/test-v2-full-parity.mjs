import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('v2.html','utf8').replace('<script src="./app-v2.js" defer></script>','');
const app=fs.readFileSync('app-v2.js','utf8');
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const seriesConfig=JSON.parse(fs.readFileSync('series.json','utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(Array.isArray(seriesConfig)&&seriesConfig.length>0,'series.json should contain at least one series');
assert(data.series.length===seriesConfig.length,`Expected ${seriesConfig.length} configured series, got ${data.series.length}`);
for(const item of seriesConfig){
  const series=data.series.find(series=>series.name===item.cs);
  assert(series,`Missing configured series: ${item.cs}`);
  assert(series.i18n?.cs===item.cs&&series.i18n?.sk===item.sk,`Configured series translation mismatch: ${item.cs}`);
}
assert(data.meta?.legacyParity?.source==='series.json','Series bundle should be generated from series.json');

const mediaHandlers={};
const dom=new JSDOM(html,{url:'https://example.test/v2.html',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
Object.defineProperty(window.navigator,'mediaSession',{value:{setActionHandler:(name,fn)=>{mediaHandlers[name]=fn},setPositionState:()=>{},metadata:null},configurable:true});
window.MediaMetadata=function(value){Object.assign(this,value)};
window.fetch=async()=>({ok:true,status:200,json:async()=>data});
window.HTMLMediaElement.prototype.play=()=>Promise.resolve();
window.HTMLMediaElement.prototype.pause=()=>{};
window.HTMLMediaElement.prototype.load=()=>{};
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.requestAnimationFrame=callback=>setTimeout(()=>callback(Date.now()),0);
window.alert=()=>{};window.prompt=()=>'';window.confirm=()=>true;

const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('V2 ready timeout')),5000);
  window.addEventListener('vedator-v2-ready',event=>{clearTimeout(timer);resolve(event.detail)},{once:true});
});
window.eval(app);window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));await ready;await new Promise(resolve=>setTimeout(resolve,30));

assert(window.document.querySelectorAll('#episodes-v2 .episode-card-v2').length===20,'Initial episode batch is not 20');
assert(window.document.querySelector('#episodes-v2 .parity-sentinel'),'Episode lazy sentinel missing');
assert(window.document.querySelectorAll('#parity-topics-v2 .topic-v2').length===15,'Episode topic bar should contain 15 choices including All');
assert(window.document.querySelectorAll('#parity-sort-v2 option').length===6,'Episode sort should contain 6 legacy modes');
assert(window.document.querySelector('#episodes-v2 .tag'),'Episode purple topic tag missing');
assert(window.document.querySelector('style[data-v2-full-parity]')?.textContent.includes('.tag'),'Parity tag styles missing');

window.document.querySelector('#episodes-v2 .parity-sentinel').click();await new Promise(resolve=>setTimeout(resolve,20));
assert(window.document.querySelectorAll('#episodes-v2 .episode-card-v2').length===40,'Second episode batch should raise rendered cards to 40');

const tabs=[...window.document.querySelectorAll('.tab-v2')];
tabs.find(tab=>tab.dataset.view==='questions').click();await new Promise(resolve=>setTimeout(resolve,20));
assert(window.document.querySelectorAll('#questions-v2 .question-card').length===20,'Initial question batch is not 20');
assert(window.document.querySelectorAll('#parity-topics-v2 .topic-v2').length===11,'Question topic bar should contain 11 choices');
assert(window.document.querySelector('#questions-v2 .tag'),'Question purple topic tag missing');
assert(window.document.querySelectorAll('#parity-sort-v2 option').length===2,'Question sort should contain newest/oldest');
assert(window.document.querySelector('script[data-v2-mathjax]'),'MathJax should be lazy-requested on question view');

tabs.find(tab=>tab.dataset.view==='nonquestions').click();await new Promise(resolve=>setTimeout(resolve,20));
assert(window.document.querySelectorAll('#nonquestions-v2 .question-card').length===20,'Initial nonquestion batch is not 20');
assert(window.document.querySelector('#nonquestions-v2 .tag'),'Nonquestion purple topic tag missing');

tabs.find(tab=>tab.dataset.view==='series').click();await new Promise(resolve=>setTimeout(resolve,20));
assert(window.document.querySelectorAll('#series-v2 .series').length===data.series.length,'All series cards should be listed');
assert(window.document.querySelectorAll('#parity-sort-v2 option').length===6,'Series sort should contain 6 modes');
assert(window.document.querySelector('#parity-sort-v2').selectedIndex>=0,'Series sort should visibly select the current mode');
for(const value of ['started','completed','unheard'])assert(window.document.querySelector(`#parity-sort-v2 option[value="${value}"]`),`Missing series status sort: ${value}`);
const peopleSeries=data.series.find(series=>series.people);assert(peopleSeries,'At least one configured people series is required for person formatting test');
const peopleIndex=data.series.indexOf(peopleSeries);const peopleCard=window.document.querySelector(`#series-v2 .series[data-series-index="${peopleIndex}"]`);assert(peopleCard,'People series card missing');
assert(!peopleCard.querySelector('.parity-series-body'),'Series body should be lazy before opening');peopleCard.open=true;peopleCard.dispatchEvent(new window.Event('toggle'));await new Promise(resolve=>setTimeout(resolve,10));assert(peopleCard.querySelector('.parity-series-body'),'Series body did not lazy-load on open');assert(peopleCard.querySelector('.person-name-v2'),'Scientist name formatting missing');

assert(window.document.querySelector('#player-back10-v2'),'−10 s player button missing');
assert(window.document.querySelector('#player-forward10-v2'),'+10 s player button missing');
assert(!window.document.querySelector('#parity-refresh-v2'),'Manual refresh button should be removed');
for(const action of ['seekbackward','seekforward','previoustrack','nexttrack','seekto'])assert(typeof mediaHandlers[action]==='function',`Media Session handler missing: ${action}`);

const runtimeScripts=[...window.document.querySelectorAll('script[src]')].map(script=>script.getAttribute('src')).filter(Boolean).filter(src=>!src.includes('mathjax'));
assert(runtimeScripts.length===0,'Test HTML should have no extra runtime scripts after app script removal');
console.log(JSON.stringify({ok:true,series:data.series.length,seriesSource:data.meta?.legacyParity?.source,episodeBatch:20,questionBatch:20,nonquestionBatch:20,episodeTopics:15,questionTopics:11,episodeSortModes:6,seriesSortModes:6,tags:true,mediaSession:true,lazySeries:true,reloadRemoved:true},null,2));
