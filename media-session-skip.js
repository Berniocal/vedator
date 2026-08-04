(()=>{
  if(window.__vedatorMediaSessionSkip)return;
  window.__vedatorMediaSessionSkip=true;
  if(!('mediaSession'in navigator))return;

  function install(){
    const audio=document.querySelector('.vedator-audio-card audio');
    if(!audio)return false;

    const seek=delta=>{
      const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:Infinity;
      audio.currentTime=Math.max(0,Math.min(duration,audio.currentTime+delta));
    };

    try{navigator.mediaSession.setActionHandler('seekbackward',details=>seek(-(details.seekOffset||10)))}catch(error){}
    try{navigator.mediaSession.setActionHandler('seekforward',details=>seek(details.seekOffset||10))}catch(error){}
    try{navigator.mediaSession.setActionHandler('previoustrack',()=>seek(-10))}catch(error){}
    try{navigator.mediaSession.setActionHandler('nexttrack',()=>seek(10))}catch(error){}
    try{navigator.mediaSession.setActionHandler('seekto',details=>{
      if(typeof details.seekTime!=='number')return;
      const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:Infinity;
      audio.currentTime=Math.max(0,Math.min(duration,details.seekTime));
    })}catch(error){}
    return true;
  }

  if(!install())new MutationObserver((_,observer)=>{if(install())observer.disconnect()}).observe(document.body,{childList:true,subtree:true});
})();

(()=>{
  if(window.__vedatorStartedPlaylistColor)return;
  window.__vedatorStartedPlaylistColor=true;

  const STARTED_KEY='vedatorStartedPlaylistsV1';
  const PROGRESS_KEY='vedatorCollectionProgressV1';
  let started=loadObject(STARTED_KEY);

  const style=document.createElement('style');
  style.textContent=`
    .vedator-playlist-started-persisted:not(.vedator-collection-title-complete){color:#d97706!important}
    html.theme-dark .vedator-playlist-started-persisted:not(.vedator-collection-title-complete){color:#fbbf24!important}
  `;
  document.head.appendChild(style);

  function loadObject(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {}}
  }

  function save(){
    try{localStorage.setItem(STARTED_KEY,JSON.stringify(started))}catch{}
  }

  function playlistKey(card){
    const id=String(card?.dataset.id||'').trim();
    return id?`playlist:${id}`:'';
  }

  function mark(card){
    const key=playlistKey(card);
    if(!key||started[key])return;
    started[key]=true;
    save();
    decorateCard(card);
  }

  function decorateCard(card){
    const title=card?.querySelector('.vedator-playlist-title');
    if(!title)return;
    title.classList.toggle('vedator-playlist-started-persisted',Boolean(started[playlistKey(card)]));
  }

  function decorateAll(){
    document.querySelectorAll('.vedator-playlist-list .vedator-playlist-card[data-id]').forEach(decorateCard);
  }

  function migrateExistingProgress(){
    const progress=loadObject(PROGRESS_KEY);
    let changed=false;
    for(const [key,record] of Object.entries(progress)){
      if(!key.startsWith('playlist:')||started[key])continue;
      const items=record&&typeof record==='object'&&record.items&&typeof record.items==='object'?record.items:{};
      if(record?.started||record?.lastItemId||Object.keys(items).length){
        started[key]=true;
        changed=true;
      }
    }
    if(changed)save();
  }

  const markFromEvent=event=>{
    const item=event.target.closest?.('.vedator-playlist-open[data-ref]');
    if(item)mark(item.closest('.vedator-playlist-card[data-id]'));
  };
  document.addEventListener('pointerdown',markFromEvent,true);
  document.addEventListener('click',markFromEvent,true);

  window.addEventListener('storage',event=>{
    if(event.key===STARTED_KEY){
      started=loadObject(STARTED_KEY);
      decorateAll();
    }else if(event.key===PROGRESS_KEY){
      migrateExistingProgress();
      decorateAll();
    }
  });
  window.addEventListener('vedatorcontentchange',decorateAll);

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.addedNodes.length||record.removedNodes.length))decorateAll();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  migrateExistingProgress();
  decorateAll();
})();
