import fs from 'node:fs';

const path='app-v2.js';
let source=fs.readFileSync(path,'utf8');
const marker='/* V2_LAST_PLAYBACK_RESTORE_V1 */';
if(source.includes(marker)){
  console.log('Last playback restore already present.');
  process.exit(0);
}

const oldSignature="async function openPlayback(episode,{start=null,context=null,itemRef=''}={}){";
const newSignature="async function openPlayback(episode,{start=null,context=null,itemRef='',autoplay=true}={}){";
if(!source.includes(oldSignature))throw new Error('openPlayback signature not found');
source=source.replace(oldSignature,newSignature);

const oldMetadata="audio.addEventListener('loadedmetadata',()=>{if(state.current?.key!==key)return;if(Number.isFinite(target)&&target>0){try{audio.currentTime=Math.min(target,Math.max(0,(audio.duration||target)-1))}catch{}}syncPlayer();audio.play().catch(()=>{n.help.textContent=target>0?`${text('Pozice','Pozícia')} ${fmtTime(target)} ${text('je připravená. Klepněte na Přehrát.','je pripravená. Klepnite na Prehrať.')}`:text('Klepněte na Přehrát.','Klepnite na Prehrať.')})},{once:true});";
const newMetadata="audio.addEventListener('loadedmetadata',()=>{if(state.current?.key!==key)return;if(Number.isFinite(target)&&target>0){try{audio.currentTime=Math.min(target,Math.max(0,(audio.duration||target)-1))}catch{}}syncPlayer();if(autoplay)audio.play().catch(()=>{n.help.textContent=target>0?`${text('Pozice','Pozícia')} ${fmtTime(target)} ${text('je připravená. Klepněte na Přehrát.','je pripravená. Klepnite na Prehrať.')}`:text('Klepněte na Přehrát.','Klepnite na Prehrať.')});else n.help.textContent=target>0?`${text('Pozice','Pozícia')} ${fmtTime(target)} ${text('je připravená. Klepněte na Přehrát.','je pripravená. Klepnite na Prehrať.')}`:text('Klepněte na Přehrát.','Klepnite na Prehrať.')},{once:true});";
if(!source.includes(oldMetadata))throw new Error('openPlayback loadedmetadata block not found');
source=source.replace(oldMetadata,newMetadata);

const oldTail="audio.load();n.shell.classList.remove('hidden');syncPlayer();audio.play().catch(()=>{});";
const newTail="audio.load();n.shell.classList.remove('hidden');syncPlayer();if(autoplay)audio.play().catch(()=>{});";
if(!source.includes(oldTail))throw new Error('openPlayback autoplay tail not found');
source=source.replace(oldTail,newTail);

const block=String.raw`

  /* V2_LAST_PLAYBACK_RESTORE_V1 */
  const LAST_PLAYBACK_KEY='vedatorLastPlaybackV1';

  function lastPlaybackContextSnapshot(context){
    if(!context||!Array.isArray(context.items)||!context.items.length)return null;
    return {
      type:String(context.type||''),
      id:String(context.id||''),
      label:String(context.label||''),
      index:Math.max(0,Number(context.index)||0),
      items:context.items.map(item=>({
        n:Number(item?.episode?.number)||0,
        s:Math.max(0,Number(item?.start)||0),
        r:String(item?.ref||''),
        i:String(item?.id||'')
      })).filter(item=>item.n>0)
    };
  }

  function rememberLastPlayback(preferredTime=null){
    const current=state.current;if(!current?.episode)return;
    const audio=playerNodes().audio,record=state.progress[current.key]||{};
    let time=Number(preferredTime);
    if(!Number.isFinite(time)){
      const live=audio&&audio.readyState>0?Number(audio.currentTime):NaN;
      time=Number.isFinite(live)?live:Number(record.currentTime)||0;
    }
    const contextItem=state.context?.items?.[state.context.index];
    writeJson(LAST_PLAYBACK_KEY,{
      version:1,
      episode:Number(current.episode.number)||0,
      time:Math.max(0,time||0),
      itemRef:String(current.itemRef||contextItem?.ref||epRef(current.episode.number)||''),
      context:lastPlaybackContextSnapshot(state.context),
      updatedAt:Date.now()
    });
  }

  function rebuildLastPlaybackContext(snapshot,episodeNumber,itemRef){
    if(!snapshot||typeof snapshot!=='object')return null;
    const type=String(snapshot.type||'');
    if(type==='series'){
      const series=(state.data?.series||[]).find(item=>'series:'+norm(item.name)===snapshot.id)||null;
      if(!series)return null;
      const context=seriesContext(series,0);
      let index=context.items.findIndex(item=>String(item.ref||'')===String(itemRef||'')&&Number(item.episode?.number)===Number(episodeNumber));
      if(index<0)index=context.items.findIndex(item=>Number(item.episode?.number)===Number(episodeNumber));
      if(index<0)index=Math.min(Math.max(0,Number(snapshot.index)||0),Math.max(0,context.items.length-1));
      context.index=index;return context;
    }
    if(type==='playlist'){
      const id=String(snapshot.id||'').replace(/^playlist:/,'');
      const playlist=state.playlists.find(item=>String(item.id)===id)||null;
      if(!playlist)return null;
      const context=playlistContext(playlist,0);
      let index=context.items.findIndex(item=>String(item.ref||'')===String(itemRef||'')&&Number(item.episode?.number)===Number(episodeNumber));
      if(index<0)index=context.items.findIndex(item=>Number(item.episode?.number)===Number(episodeNumber));
      if(index<0)index=Math.min(Math.max(0,Number(snapshot.index)||0),Math.max(0,context.items.length-1));
      context.index=index;return context;
    }
    if(!['episodes','questions','nonquestions'].includes(type)||!Array.isArray(snapshot.items))return null;
    const items=snapshot.items.map(saved=>{
      const episode=episodeByNumber(Number(saved?.n));if(!episode)return null;
      return {id:String(saved?.i||type+':episode:'+episode.number),episode,start:Math.max(0,Number(saved?.s)||0),ref:String(saved?.r||epRef(episode.number))};
    }).filter(Boolean);
    if(!items.length)return null;
    let index=items.findIndex(item=>String(item.ref||'')===String(itemRef||'')&&Number(item.episode?.number)===Number(episodeNumber));
    if(index<0)index=items.findIndex(item=>Number(item.episode?.number)===Number(episodeNumber));
    if(index<0)index=Math.min(Math.max(0,Number(snapshot.index)||0),items.length-1);
    return {type,id:String(snapshot.id||'navigation:'+type),label:String(snapshot.label||''),items,index};
  }

  const lastPlaybackOriginalOpenPlayback=openPlayback;
  openPlayback=async function(episode,options={}){
    const result=await lastPlaybackOriginalOpenPlayback(episode,options);
    const requested=options&&options.start!==null&&options.start!==undefined?Number(options.start):null;
    rememberLastPlayback(Number.isFinite(requested)?requested:null);
    return result;
  };

  const lastPlaybackOriginalSaveProgress=saveProgress;
  saveProgress=function(...args){
    const result=lastPlaybackOriginalSaveProgress(...args);
    rememberLastPlayback();
    return result;
  };

  async function restoreLastPlayback(){
    if(state.current||!state.data)return false;
    const saved=readJson(LAST_PLAYBACK_KEY,null);if(!saved||Number(saved.version)!==1)return false;
    const episode=episodeByNumber(Number(saved.episode));if(!episode)return false;
    const context=rebuildLastPlaybackContext(saved.context,episode.number,saved.itemRef);
    const record=state.progress[episodeKey(episode.number)]||{};
    const savedTime=Number(saved.time),time=savedTime>0?savedTime:Math.max(0,Number(record.currentTime)||0);
    await openPlayback(episode,{start:time,context,itemRef:String(saved.itemRef||epRef(episode.number)),autoplay:false});
    const audio=playerNodes().audio;if(audio&&!audio.paused)audio.pause();
    legacyVisualSetPlayerCollapsed(true);syncCollapsedPlayerIcon();queuePlayerFloatingPositions();
    return true;
  }

  window.addEventListener('vedator-v2-ready',()=>{setTimeout(()=>{restoreLastPlayback().catch(error=>console.warn('Last playback restore failed',error))},0)},{once:true});
`;

const end='\n})();';
const at=source.lastIndexOf(end);
if(at<0)throw new Error('Could not find final app closure');
source=source.slice(0,at)+block+source.slice(at);
fs.writeFileSync(path,source);
console.log('Last playback context restore patched.');
