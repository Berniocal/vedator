import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.VEDATOR_TEST_DEPS||process.cwd(),'package.json'));
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('app-v2.js','utf8'),data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const app=source.replace('  function syncYoutubeCaptions(){', '  window.__readerTest={readerCues,readerCaptionAt,captionBookDocument,paginateCaptionBook,book:()=>captionBook,sync:syncYoutubeCaptions};\n  function syncYoutubeCaptions(){');
const original=JSON.parse(fs.readFileSync('captions/episode-1.json','utf8'));
const cue=(start,end,cs)=>({start,end,text:{cs,sk:cs}});
const captions={...original,cues:[cue(1,1.15,'Ano.'),cue(4,4.2,'Tohle je delší titulek, který potřebuje více času na čtení.'),cue(12,12.2,'Další.'),cue(12.3,13,'Souvislá řeč.'),cue(20,21,'První dlouhý řádek se spoustou slov\njedno\na třetí řádek, který se má přesunout do dvou vyvážených řádků.')]};
captions.cues.push(...Array.from({length:80},(_,i)=>cue(100+i*4,103+i*4,`Odstavec ${i+1} obsahuje další souvislý text pro čtení celé obrazovky.`)));
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
  async function captionLanguage(value){
    const toggle=$('#player-caption-toggle-v2');
    if(value==='off'){if(toggle.getAttribute('aria-pressed')==='true')toggle.click()}
    else{if(toggle.getAttribute('aria-pressed')==='false')toggle.click();$('.language-v2 [data-lang="'+(value==='sk'?'sk':'cz')+'"]').click()}
    await wait();
  }
  return {dom,w,$,audio,players,play,click,errors,captionLanguage,captionRequests,resolveCaptions:()=>resolveCaptions?.(),snapshot:()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]))};
}
const t=await boot();
try{
  const {$,w,audio}=t;
  w.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText:value=>({width:value.length*13})});
  Object.defineProperty($('#player-caption-reader-text-v2'),'clientWidth',{configurable:true,get:()=>300});
  Object.defineProperty($('#player-caption-reader-overlay-v2'),'clientHeight',{get:()=>700});
  let readingHeight=550;
  Object.defineProperty($('#player-caption-reader-text-v2'),'clientHeight',{get:()=>readingHeight});
  await t.play(1);audio.currentTime=1;audio.dispatchEvent(new w.Event('timeupdate'));await wait();
  await t.captionLanguage('cs');await t.click('#player-caption-reader-button-v2');
  const overlay=$('#player-caption-reader-overlay-v2'),bar=$('#caption-reader-controls-v2');
  assert(!overlay.hidden);assert(bar.hidden,'Reader starts with hidden controls');
  assert(!$('#caption-book-smaller-v2').hidden&&!$('#caption-book-larger-v2').hidden,'Font controls also exist while listening');
  const originalFont=parseFloat($('#player-caption-reader-text-v2').style.fontSize),originalTime=audio.currentTime;
  await t.click('#caption-book-larger-v2');
  assert(parseFloat($('#player-caption-reader-text-v2').style.fontSize)>originalFont,'Live subtitle size increases');
  assert.equal(JSON.parse(w.localStorage.getItem('vedator-caption-listening-size-v1')),1.1);
  assert.equal(audio.currentTime,originalTime,'Changing subtitle size never seeks');
  await t.click('#caption-book-smaller-v2');assert.equal(JSON.parse(w.localStorage.getItem('vedator-caption-listening-size-v1')),1);

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
  assert.equal(lines.length,2);assert.equal(node.textContent.replace(/\s+/g,' '),captions.cues[4].text.cs.replace(/\s+/g,' '),'Reflow preserves all words');
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
  // Complete book pages preserve both language texts at every tested geometry.
  for(const file of fs.readdirSync('captions').filter(f=>/^episode-\d+\.json$/.test(f))){
    const real=JSON.parse(fs.readFileSync('captions/'+file,'utf8'));
    for(const lang of ['cs','sk'])for(const width of [180,320,900]){
      const document=w.__readerTest.captionBookDocument(real.cues,lang),measure=value=>Array.from(value).length*9;
      const pages=w.__readerTest.paginateCaptionBook(document,width,6,measure);
      assert.equal(pages.map(p=>document.value.slice(p.from,p.to)).join(''),document.value,'No missing or repeated text across pages');
      pages.forEach((page,i)=>{
        assert(page.lines.length>=1&&page.lines.length<=6);assert(page.to>page.from);if(i)assert.equal(page.from,pages[i-1].to);
        for(const line of page.lines)assert(measure(document.value.slice(line.from,line.to))<=width+1,'Book line fits viewport');
      });
    }
  }
  const tricky=w.__readerTest.captionBookDocument([cue(0,1,'🙂'.repeat(200)+' slovo. Další věta.')],'cs');
  const trickyPages=w.__readerTest.paginateCaptionBook(tricky,45,4,v=>Array.from(v).length*9);
  assert.equal(trickyPages.map(p=>tricky.value.slice(p.from,p.to)).join(''),tricky.value,'Long words and surrogate pairs survive page splits');
  assert(trickyPages.every(p=>p.lines.every(l=>!/^[\uDC00-\uDFFF]/.test(tricky.value.slice(l.from,l.to)))));
  // Keep book tests in a regular portrait layout, independent of MP3 progression.
  Object.defineProperty(node,'clientWidth',{configurable:true,get:()=>300});
  overlay.getBoundingClientRect=()=>({left:0,top:0,width:900,height:700});
  await t.click('#player-caption-reader-button-v2');await t.click('#player-caption-reader-overlay-v2');
  audio.currentTime=1;await t.click('#caption-reader-mode-v2');
  assert(audio.paused,'Book mode pauses audio');assert(overlay.classList.contains('caption-book-mode-v2'));
  assert(node.querySelectorAll('.caption-book-line-v2').length>8,'Book mode fills the available height without the old six/eight-line cap');
  assert($('#caption-reader-back-v2').hidden&&$('#caption-reader-forward-v2').hidden,'Book pages use swipe navigation');
  const firstPage=w.__readerTest.book().index,firstText=node.textContent;
  audio.currentTime=20;w.__readerTest.sync();assert.equal(node.textContent,firstText,'Reading pages never follow the playback clock');
  function pointer(type,x,y,id=1,primary=true){const e=new w.MouseEvent(type,{clientX:x,clientY:y,bubbles:true});Object.defineProperties(e,{pointerId:{value:id},isPrimary:{value:primary}});overlay.dispatchEvent(e)}
  pointer('pointerdown',750,350);pointer('pointermove',300,360);pointer('pointerup',300,360);
  assert.equal(w.__readerTest.book().index,firstPage+1,'Left swipe advances a whole page');
  assert.equal(audio.currentTime,w.__readerTest.book().pages[w.__readerTest.book().index].time,'Page turns update the shared playback position');
  overlay.dispatchEvent(new w.MouseEvent('click',{clientX:300,clientY:360,detail:1,bubbles:true}));await new Promise(r=>setTimeout(r,350));
  assert.equal(w.__readerTest.book().index,firstPage+1,'Synthetic click after swipe cannot turn a second page');
  pointer('pointerdown',300,350);pointer('pointermove',750,350);pointer('pointerup',750,350);assert.equal(w.__readerTest.book().index,firstPage,'Right swipe returns');
  pointer('pointerdown',600,250);pointer('pointermove',610,550);pointer('pointerup',610,550);assert.equal(w.__readerTest.book().index,firstPage,'Vertical motion does not turn pages');
  pointer('pointerdown',600,350);pointer('pointercancel',600,350);assert.equal(w.__readerTest.book().index,firstPage,'Cancelled gestures do nothing');
  await new Promise(r=>setTimeout(r,650));
  const controlsBefore=bar.hidden;
  node.dispatchEvent(new w.MouseEvent('click',{clientX:800,clientY:350,detail:1,bubbles:true}));await new Promise(r=>setTimeout(r,350));assert.equal(w.__readerTest.book().index,firstPage,'Right text tap does not turn a page');assert.equal(bar.hidden,!controlsBefore,'Right text tap toggles controls');
  node.dispatchEvent(new w.MouseEvent('click',{clientX:100,clientY:350,detail:1,bubbles:true}));await new Promise(r=>setTimeout(r,350));assert.equal(w.__readerTest.book().index,firstPage,'Left text tap does not turn a page');assert.equal(bar.hidden,controlsBefore,'Left text tap toggles controls');
  pointer('pointerdown',750,350);pointer('pointermove',300,350);pointer('pointerup',300,350);
  const anchor=w.__readerTest.book().pages[w.__readerTest.book().index].from;
  await t.click('#caption-book-larger-v2');const enlarged=w.__readerTest.book();assert(enlarged.pages[enlarged.index].from<=anchor&&enlarged.pages[enlarged.index].to>anchor,'Font changes retain the current passage');
  assert.equal(JSON.parse(w.localStorage.getItem('vedator-caption-book-size-v1')),1.1);
  const beforeResize=w.__readerTest.book(),resizeAnchor=beforeResize.pages[beforeResize.index].from;
  readingHeight=220;w.dispatchEvent(new w.Event('resize'));const shorter=w.__readerTest.book();
  assert(shorter.maxLines<beforeResize.maxLines,'Shorter screens show fewer lines');
  assert(shorter.pages[shorter.index].from<=resizeAnchor&&shorter.pages[shorter.index].to>resizeAnchor,'Resize retains current passage');
  readingHeight=550;w.dispatchEvent(new w.Event('resize'));
  await new Promise(r=>setTimeout(r,650)); // Let the preceding swipe's synthetic-click guard expire.
  const pageBeforeClose=node.textContent;node.dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));assert(overlay.hidden,'Double click in book text returns to the app');await wait();
  await t.click('#player-caption-reader-button-v2');await t.click('#player-caption-reader-overlay-v2');await t.click('#caption-reader-mode-v2');assert.equal(node.textContent,pageBeforeClose,'Book resumes saved place');
  const resumeTime=audio.currentTime;
  await t.click('#caption-reader-mode-v2');await wait();assert(!audio.paused);assert.equal(audio.currentTime,resumeTime,'Listening preserves the shared time after font changes and page reflow');
  pointer('pointerdown',450,350);await new Promise(r=>setTimeout(r,550));
  assert(audio.paused,'Playback pauses while center is held');assert(!$('#caption-reader-feedback-v2').hidden);
  pointer('pointerup',450,350);assert(!audio.paused,'Lifting the finger resumes the previously playing audio');
  pointer('pointerdown',450,350);await new Promise(r=>setTimeout(r,550));assert(audio.paused);
  pointer('pointerup',450,350);assert(!audio.paused,'Each hold is temporary');
  await t.click('#caption-reader-play-v2');assert(audio.paused);
  pointer('pointerdown',450,350);await new Promise(r=>setTimeout(r,550));assert(audio.paused,'Holding already paused audio never starts it');
  pointer('pointerup',450,350);assert(audio.paused,'Already paused audio stays paused on release');
  await t.click('#caption-reader-play-v2');assert(!audio.paused);
  pointer('pointerdown',450,350);pointer('pointerup',450,350);await new Promise(r=>setTimeout(r,550));assert(!audio.paused,'Short taps cannot leave a delayed pause');
  pointer('pointerdown',450,350);await new Promise(r=>setTimeout(r,550));assert(audio.paused);
  pointer('pointercancel',450,350);assert(!audio.paused,'Cancelling a held pointer releases the temporary pause');
  pointer('pointerdown',450,350);await new Promise(r=>setTimeout(r,550));assert(audio.paused);
  pointer('lostpointercapture',450,350);assert(!audio.paused,'Lost capture cannot leave playback stuck paused');
  pointer('pointerdown',450,350);await new Promise(r=>setTimeout(r,550));assert(audio.paused);
  await t.click('#caption-reader-mode-v2');assert(audio.paused,'Switching to book mode never resumes a held pause');
  await t.click('#caption-reader-mode-v2');await wait();assert(!audio.paused);
  pointer('pointerdown',450,350);await new Promise(r=>setTimeout(r,550));assert(audio.paused);
  await t.play(2);await t.click('#player-play-v2');assert(audio.paused);
  pointer('pointerup',450,350);assert(audio.paused,'Releasing an old hold cannot resume another episode');
  await new Promise(r=>setTimeout(r,650));
  overlay.dispatchEvent(new w.MouseEvent('click',{clientX:450,clientY:350,detail:1,bubbles:true}));
  overlay.dispatchEvent(new w.MouseEvent('click',{clientX:452,clientY:350,detail:2,bubbles:true}));assert(overlay.hidden,'Quick double tap closes reader');await wait();
  await t.click('#player-caption-reader-button-v2');assert(!overlay.hidden);await t.click('#player-caption-reader-overlay-v2');
  $('#caption-reader-back-v2').dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));assert(!overlay.hidden,'Toolbar double click never closes reader');
  await t.click('#caption-reader-close-v2');await wait();
  assert.equal(t.errors.length,0,t.errors.map(String).join('\n'));
  console.log('Caption reader OK: bilingual nonoverlapping reading windows, preserved timing/text, balanced two-line reflow, full-height book pages, swipe-only touch navigation, tap toolbar toggling, bookmarks, font sizes, playback resume, pause-only-while-held, double tap, Back and fullscreen navigation.');
}finally{t.dom.window.close()}
