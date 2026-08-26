import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('v2.html','utf8').replace('<script src="./app-v2.js" defer></script>','');
let app=fs.readFileSync('app-v2.js','utf8');
app=app.replace('  const state={','  const state=window.__debugVedatorState={');
const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const faq=data.series.find(series=>series.name==='FAQ – dobré otázky');
const completedEpisode=faq.episodes.find(number=>number!==340);
const dom=new JSDOM(html,{url:'https://example.test/v2.html#episode=340',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.localStorage.setItem('vedator-ui-language-v1','cz');
window.localStorage.setItem('vedatorPlaybackProgressV1',JSON.stringify({
  'episode-340':{currentTime:600,duration:3600,completed:false,replaying:false,title:'Podcast 340',updatedAt:1},
  [`episode-${completedEpisode}`]:{currentTime:3600,duration:3600,completed:true,replaying:false,title:'Done',updatedAt:1}
}));
window.localStorage.setItem('vedatorCollectionProgressV1',JSON.stringify({
  [`series:${norm(faq.name)}`]:{type:'series',label:faq.name,lastItemId:'episode:340',updatedAt:1,items:{}}
}));
window.fetch=async()=>({ok:true,status:200,json:async()=>data});
window.HTMLMediaElement.prototype.play=()=>Promise.resolve();window.HTMLMediaElement.prototype.pause=()=>{};window.HTMLMediaElement.prototype.load=()=>{};
window.HTMLElement.prototype.scrollIntoView=()=>{};window.requestAnimationFrame=callback=>setTimeout(callback,0);
const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('ready timeout')),5000);window.addEventListener('vedator-v2-ready',()=>{clearTimeout(timer);resolve()},{once:true})});
window.eval(app);window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));await ready;await new Promise(resolve=>setTimeout(resolve,40));
const state=window.__debugVedatorState;
const progressKey=`episode-${completedEpisode}`;
console.log(JSON.stringify({completedEpisode,progressKey,progressRecord:state.progress[progressKey],progressKeys:Object.keys(state.progress),faqFirst:faq.episodes.slice(0,5),faqLength:faq.episodes.length,computedCompleted:faq.episodes.filter(number=>state.progress[`episode-${number}`]?.completed).length,collectionKeys:Object.keys(state.collectionProgress)},null,2));
const tab=[...window.document.querySelectorAll('.tab-v2')].find(node=>node.dataset.view==='series');tab.click();await new Promise(resolve=>setTimeout(resolve,30));
const index=data.series.indexOf(faq),card=window.document.querySelector(`#series-v2 .series[data-series-index="${index}"]`);
console.log(JSON.stringify({seriesIndex:index,label:card?.querySelector('.series-progress-label-v2')?.textContent||null,resume:card?.querySelector('.series-resume-v2')?.textContent||null},null,2));
