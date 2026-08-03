(()=>{
  if(window.__vedatorTitleTruncate)return;
  window.__vedatorTitleTruncate=true;

  const style=document.createElement('style');
  style.textContent=`
    .series-card>summary>span:first-child,
    details.vedator-playlist-card>summary .vedator-playlist-title{
      flex:1;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .series-card[open]>summary>span:first-child,
    details.vedator-playlist-card[open]>summary .vedator-playlist-title{
      overflow:visible;
      text-overflow:clip;
      white-space:normal;
      overflow-wrap:anywhere;
    }

    .vedator-series-started-persisted:not(.vedator-collection-title-complete){
      color:#d97706!important;
    }
    html.theme-dark .vedator-series-started-persisted:not(.vedator-collection-title-complete){
      color:#fbbf24!important;
    }
  `;
  document.head.appendChild(style);

  const COLLECTION_PROGRESS_KEY='vedatorCollectionProgressV1';
  const STARTED_SERIES_KEY='vedatorStartedSeriesV1';
  let startedSeries=loadObject(STARTED_SERIES_KEY);
  let refreshQueued=false;
  let refreshAttempts=0;

  function loadObject(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch(_){return {}}
  }

  function saveStartedSeries(){
    try{localStorage.setItem(STARTED_SERIES_KEY,JSON.stringify(startedSeries))}catch(_){}
  }

  function norm(value){
    return String(value||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function canonicalSeriesLabel(value){
    return norm(String(value||'')
      .replace(/Hledání mimozemského života/gi,'Hľadanie mimozemského života')
      .replace(/Rozhovory o vesmíru/gi,'Rozhovory o vesmíre')
      .replace(/(?:Žiji|Žiju) vědu/gi,'Žijem vedu')
      .replace(/Genetický speciál/gi,'Genetický špeciál')
      .replace(/Vedátorský speciál/gi,'Vedátorský špeciál')
      .replace(/Nobelovy ceny/gi,'Nobelove ceny'));
  }

  function seriesId(card){
    const label=card?.querySelector('summary span:first-child')?.textContent?.trim();
    return label?`series:${canonicalSeriesLabel(label)}`:'';
  }

  function migrateCollectionProgress(){
    const progress=loadObject(COLLECTION_PROGRESS_KEY);
    let changed=false;
    for(const [id,record] of Object.entries(progress)){
      if(!id.startsWith('series:')||startedSeries[id])continue;
      const items=record&&typeof record==='object'&&record.items&&typeof record.items==='object'?record.items:{};
      if(record?.started||record?.lastItemId||Object.keys(items).length){
        startedSeries[id]=true;
        changed=true;
      }
    }
    if(changed)saveStartedSeries();
  }

  function markSeriesStarted(card){
    const id=seriesId(card);
    if(!id||startedSeries[id])return;
    startedSeries[id]=true;
    saveStartedSeries();
    decorateStartedSeries();
  }

  function decorateStartedSeries(){
    document.querySelectorAll('#series .series-card').forEach(card=>{
      const title=card.querySelector('summary span:first-child');
      if(!title)return;
      title.classList.toggle('vedator-series-started-persisted',Boolean(startedSeries[seriesId(card)]));
    });
  }

  function dispatchCollectionRefresh(){
    if(!window.__vedatorCollectionProgress)return false;
    let event;
    try{
      event=new StorageEvent('storage',{
        key:COLLECTION_PROGRESS_KEY,
        newValue:localStorage.getItem(COLLECTION_PROGRESS_KEY),
        storageArea:localStorage,
        url:location.href
      });
    }catch(_){
      event=new Event('storage');
      Object.defineProperty(event,'key',{value:COLLECTION_PROGRESS_KEY});
    }
    window.dispatchEvent(event);
    return true;
  }

  function refreshCollectionProgress(){
    refreshQueued=false;
    decorateStartedSeries();
    if(!dispatchCollectionRefresh()){
      if(refreshAttempts++<100)setTimeout(queueCollectionRefresh,80);
      return;
    }
    refreshAttempts=0;
    setTimeout(dispatchCollectionRefresh,60);
    setTimeout(dispatchCollectionRefresh,220);
  }

  function queueCollectionRefresh(){
    if(refreshQueued)return;
    refreshQueued=true;
    requestAnimationFrame(refreshCollectionProgress);
  }

  function observeView(view){
    if(!view||view.dataset.vedatorCollectionRefreshObserved==='1')return;
    view.dataset.vedatorCollectionRefreshObserved='1';
    new MutationObserver(queueCollectionRefresh).observe(view,{
      attributes:true,
      attributeFilter:['class'],
      childList:true
    });
  }

  function installObservers(){
    observeView(document.querySelector('#series'));
    const playlistView=document.querySelector('.vedator-playlist-view');
    observeView(playlistView);
    observeView(playlistView?.querySelector('.vedator-playlist-list'));
  }

  window.addEventListener('click',event=>{
    const seriesLink=event.target.closest?.('#series .series-card .series-body a');
    if(seriesLink)markSeriesStarted(seriesLink.closest('.series-card'));

    if(!event.target.closest?.('.tab[data-view="series"],.tab[data-view="playlists"]'))return;
    queueCollectionRefresh();
    setTimeout(queueCollectionRefresh,80);
    setTimeout(queueCollectionRefresh,300);
  },true);

  window.addEventListener('storage',event=>{
    if(event.key===STARTED_SERIES_KEY){
      startedSeries=loadObject(STARTED_SERIES_KEY);
      decorateStartedSeries();
      return;
    }
    if(event.key===COLLECTION_PROGRESS_KEY){
      migrateCollectionProgress();
      decorateStartedSeries();
    }
  });
  window.addEventListener('vedatorcontentchange',queueCollectionRefresh);
  window.addEventListener('vedatorepisodetranslationsready',queueCollectionRefresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueCollectionRefresh()});

  migrateCollectionProgress();
  installObservers();
  new MutationObserver(()=>{
    installObservers();
    queueCollectionRefresh();
  }).observe(document.body,{childList:true});

  queueCollectionRefresh();
  setTimeout(queueCollectionRefresh,500);
})();
