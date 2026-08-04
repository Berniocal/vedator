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

  function isSlovak(){
    try{
      if(typeof window.vedatorUiLanguage==='function')return window.vedatorUiLanguage()!=='cz';
    }catch{}
    return document.documentElement.lang!=='cs';
  }

  function translateCollectionButtons(){
    const sk=isSlovak();
    document.querySelectorAll('.vedator-collection-continue').forEach(button=>{
      const raw=button.textContent.trim();
      let next='';
      if(/^(?:Začít sérii|Začať sériu)$/i.test(raw))next=sk?'Začať sériu':'Začít sérii';
      else if(/^(?:Pokračovat v sérii|Pokračovať v sérii)$/i.test(raw))next=sk?'Pokračovať v sérii':'Pokračovat v sérii';
      else if(/^(?:Začít playlist|Začať playlist)$/i.test(raw))next=sk?'Začať playlist':'Začít playlist';
      else if(/^(?:Pokračovat v playlistu|Pokračovať v playliste)$/i.test(raw))next=sk?'Pokračovať v playliste':'Pokračovat v playlistu';
      if(next&&button.textContent!==next)button.textContent=next;
    });
  }

  function decorateAll(){
    document.querySelectorAll('.vedator-playlist-list .vedator-playlist-card[data-id]').forEach(decorateCard);
    translateCollectionButtons();
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
  window.addEventListener('vedatorlanguagechange',decorateAll);

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.addedNodes.length||record.removedNodes.length))decorateAll();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  migrateExistingProgress();
  decorateAll();
})();