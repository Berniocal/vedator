import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const data=JSON.parse(fs.readFileSync('content-v2.json','utf8'));
const html=fs.readFileSync('index.html','utf8').replace('<script src="./app-v2.js" defer></script>','');
const app=fs.readFileSync('app-v2.js','utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const ref=number=>alphabet[(number>>6)&63]+alphabet[number&63];

for(const language of ['cz','sk']){
  const dom=new JSDOM(html,{url:'https://example.test/v2.html#episode=1142',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom,document=window.document;
  window.localStorage.setItem('vedator-ui-language-v1',language);
  window.localStorage.setItem('vedatorPlaybackProgressV1',JSON.stringify({'episode-142':{currentTime:123,duration:3600,completed:false,updatedAt:1}}));
  window.localStorage.setItem('vedator-user-playlists-v1',JSON.stringify([{id:'both-142',name:'Oba díly 142',items:[ref(142),ref(1142)]}]));
  window.fetch=async()=>({ok:true,status:200,json:async()=>data});
  window.HTMLMediaElement.prototype.play=()=>Promise.resolve();
  window.HTMLMediaElement.prototype.pause=()=>{};
  window.HTMLMediaElement.prototype.load=()=>{};
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  window.requestAnimationFrame=callback=>setTimeout(callback,0);
  window.alert=()=>{};
  const shares=[];
  Object.defineProperty(window.navigator,'share',{value:async value=>shares.push(value.url)});
  const ready=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('V2 ready timeout')),5000);
    window.addEventListener('vedator-v2-ready',()=>{clearTimeout(timer);resolve()},{once:true});
  });
  try{
    window.eval(app);document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));await ready;await tick();
    const cards=[142,1142].map(number=>document.querySelector(`#episodes-v2 article[data-episode="${number}"]`));
    assert(cards.every(Boolean),'Both 142 cards must have distinct identities');
    assert(cards.every(card=>/\b142\b/.test(card.querySelector('.meta').textContent)),'Both cards must display publisher number 142');
    assert(cards[1].classList.contains('deep-target'),'Shared Webb link must target Webb');
    assert(!cards[1].querySelector('.listen-status').textContent.trim(),'Nuclear progress must not appear on Webb');
    for(const [index,number] of [142,1142].entries()){
      cards[index].querySelector('.deep-share').click();await tick();
      assert(new URL(shares.at(-1)).hash===`#episode=${number}`,'Share links must distinguish the two recordings');
      cards[index].querySelector('.play').click();await tick();
      assert(document.querySelector('#audio-v2').src===data.episodes.find(episode=>episode.number===number).enclosure,`Wrong recording on card ${number}`);
      assert(!document.querySelector('#player-title-v2').textContent.includes('1142'),'Internal identity must not appear in player title');
    }
    const audio=document.querySelector('#audio-v2');
    Object.defineProperty(audio,'readyState',{configurable:true,get:()=>1});
    Object.defineProperty(audio,'duration',{configurable:true,get:()=>3600});
    audio.currentTime=456;audio.dispatchEvent(new window.Event('timeupdate'));await tick();
    const progress=JSON.parse(window.localStorage.getItem('vedatorPlaybackProgressV1'));
    assert(progress['episode-142'].currentTime===123,'Existing nuclear progress changed while listening to Webb');
    assert(progress['episode-1142'].currentTime===456,'Webb progress must use its own key');
    document.querySelector('.tab-v2[data-view="playlists"]').click();await tick();
    const rows=[...document.querySelectorAll('#playlists-v2 .playlist-open')];
    assert(rows.length===2&&rows[0].textContent!==rows[1].textContent,'Both recordings must resolve separately in playlists');
    assert(rows.every(row=>/\b142\b/.test(row.textContent)&&!row.textContent.includes('1142')),'Playlist must show publisher number 142');
    for(const [index,number] of [142,1142].entries()){
      document.querySelectorAll('#playlists-v2 .playlist-open')[index].click();await tick();
      assert(audio.src===data.episodes.find(episode=>episode.number===number).enclosure,`Wrong playlist recording ${number}`);
    }
  }finally{window.close()}
}
console.log(JSON.stringify({ok:true,duplicateNumber:142,languages:['cs','sk'],cardPlayback:true,playlistPlayback:true,separateProgress:true,distinctShareLinks:true}));
