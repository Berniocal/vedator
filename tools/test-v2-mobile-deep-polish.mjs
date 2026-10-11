import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('v2.html','utf8').replace('<script src="./app-v2.js" defer></script>','');
const app=fs.readFileSync('app-v2.js','utf8');
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

assert(html.includes('V2_MOBILE_DEEP_POLISH_CSS_V2'),'Mobile polish CSS marker missing');
assert(html.includes('html[data-theme="dark"] body .topic-v2.active'),'Dark topic selector does not match V2 theme model');
assert(html.includes('color:#fff!important'),'Selected topic contrast rule missing');
assert(html.includes('grid-template-columns:repeat(20,minmax(0,1fr))'),'Mobile player 5+4 control grid missing');
assert(html.includes('.question-card .actions,.episode-card-v2 .actions{display:grid!important'),'Stable card action row missing');
assert(html.includes('mark.vedator-match'),'Yellow search highlight CSS missing');
assert(!app.includes("const tabs=$('.tab-v2').filter"),'Swipe still uses single-element selector');
assert(app.includes("const tabs=$$('.tab-v2').filter"),'Swipe collection fix missing');
assert(app.includes('async function downloadCurrentMp3()'),'Real MP3 downloader missing');
assert(app.includes('link.download=mobileSafeMp3Filename'),'MP3 Blob download filename missing');
assert(app.includes("type:'episodes'"),'Episode playback context missing');
assert(app.includes("$('#audio-v2')?.addEventListener('ended',()=>{if(state.context&&state.context.index<state.context.items.length-1)navigateContext(1);else playbackAutoplayWanted=false})"),'Continuous playback handler missing');
assert(!app.includes('vedator-playback-keepalive')&&!app.includes('startPlaybackKeepAlive'),'Failed video keepalive was not completely removed');
assert(app.includes('let source=episode.enclosure;'),'Synchronous online MP3 source switch is missing');
assert(app.includes('if(cachedOfflineUrl)source=cachedOfflineUrl;'),'Cached offline MP3 should also be switchable synchronously');
assert(!app.includes("setTimeout(()=>navigateContext(1),0)"),'Ended auto-advance still depends on a background-throttled timer');

const dom=new JSDOM(html,{url:'https://example.test/v2.html',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
Object.defineProperty(window,'innerWidth',{value:390,configurable:true});
Object.defineProperty(window.navigator,'mediaSession',{value:{setActionHandler:()=>{},setPositionState:()=>{},metadata:null},configurable:true});
window.MediaMetadata=function(value){Object.assign(this,value)};
window.matchMedia=()=>({matches:true,addEventListener:()=>{},removeEventListener:()=>{}});
window.IntersectionObserver=class{observe(){} disconnect(){}};
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.scrollTo=()=>{};
window.requestAnimationFrame=callback=>setTimeout(()=>callback(Date.now()),0);
window.alert=()=>{};window.prompt=()=>'';window.confirm=()=>true;
let mediaPlayCalls=0;
window.HTMLMediaElement.prototype.play=function(){mediaPlayCalls++;Object.defineProperty(this,'paused',{value:false,configurable:true});this.dispatchEvent(new window.Event('play'));return Promise.resolve()};
window.HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{value:true,configurable:true});this.dispatchEvent(new window.Event('pause'))};
window.HTMLMediaElement.prototype.load=()=>{};
window.URL.createObjectURL=()=> 'blob:https://example.test/download';
window.URL.revokeObjectURL=()=>{};
const downloads=[];
window.HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.push({download:this.download,href:this.href})};

let audioFetches=0;
const byteChunk=new Uint8Array([1,2,3,4,5,6]);
window.fetch=async url=>{
  const value=String(url);
  if(value.includes('content-v2.json'))return {ok:true,status:200,json:async()=>data};
  audioFetches++;
  let sent=false;
  return {
    ok:true,status:200,
    headers:{get:name=>String(name).toLowerCase()==='content-length'?String(byteChunk.byteLength):String(name).toLowerCase()==='content-type'?'audio/mpeg':null},
    body:{getReader:()=>({read:async()=>sent?{done:true,value:undefined}:(sent=true,{done:false,value:byteChunk})})},
    blob:async()=>new window.Blob([byteChunk],{type:'audio/mpeg'})
  };
};

const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('V2 mobile polish ready timeout')),5000);
  window.addEventListener('vedator-v2-ready',event=>{clearTimeout(timer);resolve(event.detail)},{once:true});
});
window.eval(app);
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
await ready;await new Promise(resolve=>setTimeout(resolve,30));

window.document.documentElement.dataset.theme='dark';
const topic=window.document.querySelector('#parity-topics-v2 .topic-v2');
assert(topic,'Episode topic buttons missing');
topic.click();
assert(topic.classList.contains('active'),'Topic click did not keep active state');

const search=window.document.querySelector('#search-v2');
search.value='podcast';search.dispatchEvent(new window.Event('input',{bubbles:true}));
await new Promise(resolve=>setTimeout(resolve,20));
assert(window.document.querySelector('#episodes-v2 mark.vedator-match'),'Episode search has no yellow highlight');
assert(window.document.querySelectorAll('#episodes-v2 .episode-card-v2').length<=20,'Episode search broke 20-item lazy batch');

const qtab=[...window.document.querySelectorAll('.tab-v2')].find(tab=>tab.dataset.view==='questions');qtab.click();
const skTitle=data.questions.find(q=>q?.i18n?.sk?.title)?.i18n.sk.title||data.questions[0]?.title||'';
const qword=(skTitle.match(/[A-Za-zÁ-ž]{5,}/g)||[]).sort((a,b)=>b.length-a.length)[0];
assert(qword,'Could not derive question search word');
search.value=qword;search.dispatchEvent(new window.Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,20));
assert(window.document.querySelector('#questions-v2 mark.vedator-match'),'Question search has no yellow highlight');

const qactions=window.document.querySelector('#questions-v2 .question-card .actions');
assert(qactions&&qactions.querySelector('.play')&&qactions.querySelector('.question-more')&&qactions.querySelector('.deep-share'),'Question action row is incomplete');

const etab=[...window.document.querySelectorAll('.tab-v2')].find(tab=>tab.dataset.view==='episodes');etab.click();search.value='';search.dispatchEvent(new window.Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,20));
const episodeCards=[...window.document.querySelectorAll('#episodes-v2 .episode-card-v2')];
assert(episodeCards.length>=2,'Need at least two episode cards for mobile player test');
const secondPlay=episodeCards[1].querySelector('.actions .play');secondPlay.click();await new Promise(resolve=>setTimeout(resolve,20));
assert(!window.document.querySelector('#vedator-playback-keepalive'),'Unexpected video keepalive element');
const prev=window.document.querySelector('#player-prev-v2'),next=window.document.querySelector('#player-next-v2');
assert(!(prev.disabled&&next.disabled),'Regular episode playback has no prev/next context');

const download=window.document.querySelector('#player-download-v2');
download.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,50));
assert(audioFetches>=1,'MP3 download did not fetch audio bytes');
assert(downloads.some(item=>item.download.endsWith('.mp3')),'MP3 Blob download was not triggered');
assert(!download.dataset.busy,'MP3 download stayed stuck in busy state');

const beforeTitle=window.document.querySelector('#player-title-v2').textContent;
const playCallsBeforeEnded=mediaPlayCalls,savedWindowSetTimeout=window.setTimeout;
window.setTimeout=()=>0;
const beforeSource=window.document.querySelector('#audio-v2').getAttribute('src');
window.document.querySelector('#audio-v2').dispatchEvent(new window.Event('ended'));
// Must happen in the same event-handler call stack, before even a microtask.
const immediateTitle=window.document.querySelector('#player-title-v2').textContent;
const immediateSource=window.document.querySelector('#audio-v2').getAttribute('src');
const immediatePlays=mediaPlayCalls;
window.setTimeout=savedWindowSetTimeout;
assert(beforeTitle!==immediateTitle,'Next episode did not switch inside the ended event');
assert(beforeSource!==immediateSource,'Next MP3 URL was not assigned synchronously');
assert(immediatePlays>playCallsBeforeEnded,'Next MP3 was not started synchronously');


// Regression: the next MP3 may be rejected after a long period in the background.
// Play must recover the same episode without stepping to another episode and back.
const testAudio=window.document.querySelector('#audio-v2');
const originalTestPlay=window.HTMLMediaElement.prototype.play;
const originalTestLoad=window.HTMLMediaElement.prototype.load;
let blockBackgroundPlay=true,extraLoads=0;
window.HTMLMediaElement.prototype.play=function(){
  if(blockBackgroundPlay){blockBackgroundPlay=false;return Promise.reject(new Error('Simulated background playback rejection'))}
  return originalTestPlay.call(this);
};
window.HTMLMediaElement.prototype.load=function(){extraLoads++;return originalTestLoad.call(this)};
const beforeRejectedEpisode=window.document.querySelector('#player-title-v2').textContent;
testAudio.dispatchEvent(new window.Event('ended'));
for(let tick=0;tick<6;tick++)await Promise.resolve();
const rejectedEpisode=window.document.querySelector('#player-title-v2').textContent;
assert(rejectedEpisode!==beforeRejectedEpisode,'Failed background playback did not select next episode');
assert(testAudio.paused,'Rejected background playback should remain paused');
const loadsBeforeRecovery=extraLoads,playsBeforeRecovery=mediaPlayCalls;
window.document.querySelector('#player-play-v2').click();
for(let tick=0;tick<4;tick++)await Promise.resolve();
assert(extraLoads>loadsBeforeRecovery,'Play button did not reload a failed MP3');
assert(mediaPlayCalls>playsBeforeRecovery&&!testAudio.paused,'Play button did not restart the current MP3');
assert(window.document.querySelector('#player-title-v2').textContent===rejectedEpisode,'Recovery unexpectedly changed the episode');
// A user pause must not be undone when the page becomes visible again.
window.document.querySelector('#player-play-v2').click();
const playsAfterPause=mediaPlayCalls;
window.document.dispatchEvent(new window.Event('visibilitychange'));
assert(mediaPlayCalls===playsAfterPause,'Foreground recovery restarted audio paused by the user');
window.HTMLMediaElement.prototype.play=originalTestPlay;
window.HTMLMediaElement.prototype.load=originalTestLoad;

console.log(JSON.stringify({ok:true,mobileWidth:390,episodeHighlight:true,questionHighlight:true,darkTopicContrast:true,shareSingleRow:true,realMp3Download:true,episodeContext:true,autoAdvance:true,backgroundRecovery:true,synchronousSwitch:true,videoRemoved:true,downloaded:downloads[0]?.download||null},null,2));
