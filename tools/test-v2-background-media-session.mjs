import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

// Exercise the real series/playlist UI and ended events. This checks our Media
// Session contract; only a physical Android device can verify OS notifications.
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app-v2.js','utf8');
const source=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const collection=source.series.find(s=>s.name==='Černé díry');
const numbers=collection.episodes.slice(0,3);
const data={...source,episodes:source.episodes.filter(e=>numbers.includes(e.number)),questions:[],nonquestions:{episodes:{}},series:[{...collection,episodes:numbers}]};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};

async function setup({offline=false,mediaSession=true}={}){
  const dom=new JSDOM(html,{url:'https://example.test/vedator/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,handlers={},states=[],positions=[];
  let declared='none',position=null,hidden=false,plays=0,paused=true,ended=false,readyState=0,duration=NaN,rejectNext=false,releaseOffline;
  const session={metadata:null,setActionHandler:(name,fn)=>{handlers[name]=fn},setPositionState:value=>{position=value||null;positions.push(position)}};
  Object.defineProperty(session,'playbackState',{get:()=>declared,set:value=>{declared=value;states.push(value)}});
  if(mediaSession)Object.defineProperty(w.navigator,'mediaSession',{value:session});
  w.MediaMetadata=function(value){Object.assign(this,value)};
  w.localStorage.setItem('vedator-ui-language-v1','cz');
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const refs=numbers.map(n=>alphabet[(n>>6)&63]+alphabet[n&63]);
  w.localStorage.setItem('vedator-user-playlists-v1',JSON.stringify([{id:'background',name:'Background',items:refs}]));
  if(offline){
    const key='episode-'+numbers[1];
    w.localStorage.setItem('vedatorOfflineAudioIndexV1',JSON.stringify({[key]:{key,cacheUrl:'https://example.test/offline.mp3'}}));
    w.caches={open:async()=>({match:()=>new Promise(resolve=>{releaseOffline=()=>resolve({blob:async()=>new w.Blob(['mp3'])})})})};
    w.URL.createObjectURL=()=> 'blob:https://example.test/offline';
  }
  w.fetch=async()=>({ok:true,status:200,json:async()=>data});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.IntersectionObserver=class{observe(){}disconnect(){}};
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
  Object.defineProperty(w.document,'hidden',{get:()=>hidden});
  const proto=w.HTMLMediaElement.prototype;
  Object.defineProperties(proto,{
    paused:{get:()=>paused},ended:{get:()=>ended},readyState:{get:()=>readyState},
    duration:{get:()=>duration},currentSrc:{get(){return this.getAttribute('src')||''}}
  });
  proto.pause=function(){if(!paused){paused=true;this.dispatchEvent(new w.Event('pause'))}};
  proto.load=function(){paused=true;ended=false;readyState=0;duration=NaN;this.currentTime=0};
  proto.play=function(){
    plays++;
    if(rejectNext){rejectNext=false;return Promise.reject(new Error('Simulated Android play rejection'))}
    paused=false;ended=false;this.dispatchEvent(new w.Event('play'));return Promise.resolve();
  };
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Background player boot timeout')),10000);
    w.addEventListener('vedator-v2-ready',()=>{clearTimeout(timer);resolve()},{once:true});
  });
  w.eval(app);w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
  await ready;await tick();await tick();
  const audio=w.document.querySelector('#audio-v2');
  const loaded=()=>{readyState=4;duration=3600;audio.dispatchEvent(new w.Event('loadedmetadata'));if(!paused)audio.dispatchEvent(new w.Event('playing'))};
  const finish=()=>{audio.currentTime=3600;ended=true;paused=true;audio.dispatchEvent(new w.Event('ended'))};
  const hide=()=>{hidden=true;w.document.dispatchEvent(new w.Event('visibilitychange'))};
  function open(kind){
    if(kind==='series'){
      w.document.querySelector('.tab-v2[data-view="series"]').click();
      w.document.querySelector('.series-resume-v2').click();
    }else{
      w.document.querySelector('.tab-v2[data-view="playlists"]').click();
      w.document.querySelector('.playlist-resume-v2').click();
    }
  }
  return {w,dom,audio,session,handlers,states,positions,loaded,finish,hide,open,get position(){return position},get plays(){return plays},reject(){rejectNext=true},release:()=>releaseOffline()};
}

for(const kind of ['series','playlist']){
  const t=await setup();
  try{
    t.open(kind);await flush();t.loaded();
    assert.equal(t.session.playbackState,'playing');
    assert.equal(t.position.duration,3600);
    t.hide();
    // The handoff must remain synchronous even if all page timers are frozen.
    for(let index=1;index<numbers.length;index++){
      const before=t.plays,stateIndex=t.states.length;
      const original=t.w.setTimeout;t.w.setTimeout=()=>0;
      try{t.finish()}finally{t.w.setTimeout=original}
      assert.equal(t.audio,t.w.document.querySelector('#audio-v2'),'Audio element must stay the same');
      assert.equal(t.audio.getAttribute('src'),data.episodes.find(e=>e.number===numbers[index]).enclosure);
      assert.equal(t.plays,before+1,'Next MP3 must play inside ended, before a microtask');
      assert.equal(t.session.playbackState,'playing','Loading the next MP3 must retain the declared session');
      assert(t.states.slice(stateIndex).every(value=>value==='playing'),'Session dropped during handoff');
      assert.equal(t.position,null,'Previous episode position must be cleared while loading');
      assert.equal(t.session.metadata.title,data.episodes.find(e=>e.number===numbers[index]).i18n.cs.title);
      await flush();t.loaded();
      t.audio.currentTime=185;t.audio.dispatchEvent(new t.w.Event('timeupdate'));
      assert.equal(t.session.playbackState,'playing');
    }
    t.handlers.pause();assert.equal(t.session.playbackState,'paused');
    const afterPause=t.plays;t.handlers.pause();assert.equal(t.plays,afterPause,'Pause must be idempotent');
    t.w.document.dispatchEvent(new t.w.Event('visibilitychange'));
    assert.equal(t.plays,afterPause,'Visibility must not undo a user pause');
    t.handlers.play();await flush();assert.equal(t.session.playbackState,'playing');
    const afterPlay=t.plays;t.handlers.play();assert.equal(t.plays,afterPlay,'Play must not toggle to pause');
    t.finish();assert.equal(t.session.playbackState,'paused','Final episode must end the playing state');
  }finally{await flush();await tick();t.dom.window.close()}
}

{
  const t=await setup({offline:true});
  try{
    t.open('series');await flush();t.loaded();t.hide();t.finish();await flush();
    assert.equal(t.session.playbackState,'playing','Offline lookup must retain the session');
    t.handlers.pause();const before=t.plays;
    t.release();await flush();
    assert.equal(t.plays,before,'A late offline lookup must respect a system pause');
    assert.equal(t.session.playbackState,'paused');
    t.handlers.play();await flush();t.loaded();assert.equal(t.session.playbackState,'playing');
    t.reject();t.finish();await flush();
    assert.equal(t.session.playbackState,'paused','Rejected playback must not claim to be playing');
    t.handlers.play();await flush();t.loaded();assert.equal(t.session.playbackState,'playing');
  }finally{await flush();await tick();t.dom.window.close()}
}
{
  const t=await setup({mediaSession:false});
  try{t.open('series');await flush();t.loaded();t.hide();t.finish();assert.equal(t.plays,2,'Playback must work without Media Session')}finally{await flush();await tick();t.dom.window.close()}
}
console.log(JSON.stringify({ok:true,series:true,playlist:true,synchronousHiddenHandoff:true,sessionContinuity:true,systemPlayPause:true,offlinePause:true,rejectionRecovery:true,noMediaSession:true}));
