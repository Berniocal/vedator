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
  `;
  document.head.appendChild(style);

  const COLLECTION_PROGRESS_KEY='vedatorCollectionProgressV1';
  let refreshQueued=false;
  let refreshAttempts=0;

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

  document.addEventListener('click',event=>{
    if(!event.target.closest?.('.tab[data-view="series"],.tab[data-view="playlists"]'))return;
    queueCollectionRefresh();
    setTimeout(queueCollectionRefresh,80);
    setTimeout(queueCollectionRefresh,300);
  },true);

  window.addEventListener('vedatorcontentchange',queueCollectionRefresh);
  window.addEventListener('vedatorepisodetranslationsready',queueCollectionRefresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueCollectionRefresh()});

  installObservers();
  new MutationObserver(()=>{
    installObservers();
    queueCollectionRefresh();
  }).observe(document.body,{childList:true});

  queueCollectionRefresh();
  setTimeout(queueCollectionRefresh,500);
})();
