import {ContinuousAudio} from './continuous-audio.mjs?v=20261108-1';
const $=id=>document.getElementById(id),audio=$('audio');
const LOG_KEY='vedator-continuous-test-log-v1';
let lines=[];try{lines=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');if(!Array.isArray(lines))lines=[]}catch{}
let collections=[],selected=[],activeQueue=[];
const fmt=seconds=>{const value=Math.max(0,Math.floor(seconds||0));return Math.floor(value/60)+':'+String(value%60).padStart(2,'0')};
function log(message){
  lines.push(new Date().toISOString()+' | '+message);lines=lines.slice(-500);
  try{localStorage.setItem(LOG_KEY,JSON.stringify(lines))}catch{}
  $('log').textContent=lines.join('\n');
}
const player=new ContinuousAudio(audio,{log});
// A small read-only diagnostic surface also lets real-browser tests inspect the stream.
window.vedatorContinuousTest={player,get log(){return [...lines]},get queue(){return [...activeQueue]}};
function problem(message){$('problem').textContent=message;$('problem').hidden=!message}
function renderQueue(items,index=-1){
  $('queue').replaceChildren(...items.map((item,i)=>{const li=document.createElement('li');li.textContent=item.title;li.classList.toggle('active',i===index);return li}));
}
function update(){
  const s=player.session,p=player.part(),time=player.position();
  for(const id of ['toggle','stop','back','forward','seek'])$(id).disabled=!s;
  $('toggle').textContent=audio.paused?'Přehrát':'Pauza';
  $('retry').hidden=!s?.failed;$('retry').disabled=Boolean(audio.error);
  if(!s){$('status').textContent='Připraveno. Zvol rychlý test nebo celé díly.';return}
  const end=p?.end==null?Math.max(time,player.bufferEnd()-(p?.start||0)):p.end-p.start;
  $('seek').max=String(Math.max(.1,end));if(document.activeElement!==$('seek'))$('seek').value=String(time);
  $('time').textContent=fmt(time);$('duration').textContent=p?.end==null?'Načteno '+fmt(end):fmt(end);
  const current=s.items[s.index];$('title').textContent=current.title;
  $('mode').textContent=(s.quick&&s.index===0?'Závěrečná část prvního dílu':'Celý díl')+' · '+(s.index+1)+' / '+s.items.length;
  const state=audio.ended?'Dokončeno':s.failed?'Chyba načítání':audio.paused?'Pozastaveno':audio.readyState<3?'Načítám zvuk…':'Přehrávám';
  $('status').textContent=state+' · dopředu připraveno '+fmt(player.ahead())+' · přechodů '+s.transitionCount;
}
player.addEventListener('update',update);
player.addEventListener('track',()=>{renderQueue(activeQueue,player.session?.index??-1);problem('');update()});
player.addEventListener('problem',event=>{problem(event.detail.message);update()});
function chooseFirst(){
  const first=Number($('first').value)||0,count=Number($('count').value)||selected.length;
  if(!player.session)renderQueue(selected.slice(first,first+count));
}
function chooseCollection(){
  selected=collections[Number($('collection').value)]?.items||[];
  $('first').replaceChildren(...selected.map((item,index)=>{const option=new Option(item.title,String(index));return option}));
  $('first').disabled=!selected.length;chooseFirst();
  for(const id of ['quick','start'])$(id).disabled=!selected.length||!ContinuousAudio.supported();
}
function start(quick){
  problem('');const first=Number($('first').value)||0,count=Number($('count').value)||selected.length;
  activeQueue=selected.slice(first,first+count);renderQueue(activeQueue,0);
  try{player.start(activeQueue,{quick});audio.playbackRate=Number($('speed').value)||1;update()}catch(error){problem(error.message)}
}
$('collection').addEventListener('change',chooseCollection);$('first').addEventListener('change',chooseFirst);$('count').addEventListener('change',chooseFirst);
$('quick').addEventListener('click',()=>start(true));$('start').addEventListener('click',()=>start(false));
$('toggle').addEventListener('click',()=>{if(audio.paused)player.play();else player.pause()});
$('stop').addEventListener('click',()=>{player.stop();problem('');update()});
$('back').addEventListener('click',()=>player.seekBy(-10));$('forward').addEventListener('click',()=>player.seekBy(10));
$('seek').addEventListener('change',()=>player.seek(Number($('seek').value)));
$('speed').addEventListener('change',()=>{audio.playbackRate=Number($('speed').value)||1});
$('retry').addEventListener('click',()=>{problem('');player.retry()});
$('copy').addEventListener('click',async()=>{
  const s=player.session,text='Vedátor — souvislý proud v1\n'+navigator.userAgent+'\n'+location.href+'\n'+lines.join('\n')+'\nStav: '+JSON.stringify({episode:s?.items[s.index]?.number,paused:audio.paused,time:audio.currentTime,error:audio.error&&{code:audio.error.code,message:audio.error.message},ranges:player.ranges(),sourceChanges:s?.sourceChanges,transitions:s?.transitionCount});
  try{await navigator.clipboard.writeText(text);$('copy').textContent='Zkopírováno'}catch{
    const box=document.createElement('textarea');box.value=text;document.body.appendChild(box);box.select();const copied=document.execCommand('copy');box.remove();$('copy').textContent=copied?'Zkopírováno':'Kopírování se nepodařilo';
  }
});
$('clear').addEventListener('click',()=>{lines=[];log('Záznam vymazán')});
document.addEventListener('visibilitychange',()=>{log('VIDITELNOST hidden='+document.hidden);update()});
async function load(){
  log('OTEVŘENO '+navigator.userAgent);
  const response=await fetch('./content-v2.json',{cache:'no-store'});if(!response.ok)throw Error('Katalog: HTTP '+response.status);
  const data=await response.json(),byNumber=new Map(data.episodes.map(e=>[Number(e.number),e]));
  const item=e=>({number:e.number,title:e.i18n?.cs?.title||e.title,url:e.enclosure});
  collections=data.series.map(series=>({label:'Série: '+(series.i18n?.cs||series.name),items:series.episodes.map(n=>byNumber.get(Number(n))).filter(Boolean).map(item)}));
  const alpha='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let playlists=[];try{playlists=JSON.parse(localStorage.getItem('vedator-user-playlists-v1')||'[]')}catch{}
  if(Array.isArray(playlists))for(const playlist of playlists){
    if(!Array.isArray(playlist.items))continue;
    const resolved=playlist.items.map(ref=>{
      const value=String(ref),n=value.length===2&&[...value].every(c=>alpha.includes(c))?alpha.indexOf(value[0])*64+alpha.indexOf(value[1]):-1;
      return n>=0&&n<2048?byNumber.get(n):data.episodes.find(e=>String(e.id)===value||String(e.number)===value||e.title===value);
    });
    if(resolved.length&&resolved.every(Boolean))collections.unshift({label:'Playlist: '+playlist.name,items:resolved.map(item)});
  }
  collections=collections.filter(c=>c.items.length>1);
  $('collection').replaceChildren(...collections.map((c,i)=>new Option(c.label,String(i))));$('collection').disabled=false;
  const defaultIndex=collections.findIndex(c=>c.label==='Série: Černé díry');if(defaultIndex>=0)$('collection').value=String(defaultIndex);
  chooseCollection();update();
  if(!ContinuousAudio.supported())problem('Tento prohlížeč nepodporuje souvislé MP3 přes MSE. Otevři test v Chrome.');
  document.documentElement.dataset.continuousReady='1';
}
load().catch(error=>{problem(error.message);log('KATALOG CHYBA '+error.message);$('status').textContent='Katalog se nepodařilo načíst. Zkus stránku obnovit.'});
