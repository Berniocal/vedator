(()=>{
  if(window.__vedatorUiCleanup)return;
  window.__vedatorUiCleanup=true;

  let searchElement=null;
  let committedSearchValue='';
  let searchTimer=0;
  let lastViewportHeight=window.visualViewport?.height||0;

  function uiLanguage(){
    try{
      const lang=String(window.vedatorUiLanguage?.()||document.documentElement.lang||'').toLowerCase();
      return lang.startsWith('sk')?'sk':'cs';
    }catch(_){
      return String(document.documentElement.lang||'').toLowerCase().startsWith('sk')?'sk':'cs';
    }
  }

  function ensureSearchClearStyles(){
    if(document.querySelector('#vedator-search-clear-styles'))return;
    const style=document.createElement('style');
    style.id='vedator-search-clear-styles';
    style.textContent=`
      .search-clear-wrap{position:relative;width:100%;min-width:0}
      .search-clear-wrap .search{padding-right:48px}
      .search-clear-button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:999px;background:transparent;color:var(--muted,#64748b);font-size:1.65rem;line-height:1;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .12s ease,background .12s ease,color .12s ease}
      .search-clear-button.is-visible{opacity:1;pointer-events:auto}
      .search-clear-button:hover{background:var(--accent2,#ede9fe);color:var(--ink,#162033)}
      .search-clear-button:focus-visible{opacity:1;pointer-events:auto;outline:2px solid var(--accent,#5b4bdb);outline-offset:1px}
    `;
    document.head.appendChild(style);
  }

  function updateSearchClearButton(search,button){
    const hasText=search.value.length>0;
    button.classList.toggle('is-visible',hasText);
    button.tabIndex=hasText?0:-1;
    const label=uiLanguage()==='sk'?'Vymazať vyhľadávanie':'Smazat vyhledávání';
    button.setAttribute('aria-label',label);
    button.title=label;
  }

  function runSearch(search){
    if(!search?.isConnected||search.value===committedSearchValue)return;
    committedSearchValue=search.value;
    if(typeof window.render==='function')window.render();
    else document.querySelector('#episodeSort')?.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function scheduleSearch(search,delay=90){
    clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>runSearch(search),delay);
  }

  function prepareDeferredSearch(search){
    if(searchElement===search)return;
    searchElement=search;
    committedSearchValue=search.value;
    search.enterKeyHint='search';

    search.addEventListener('blur',()=>scheduleSearch(search));
    search.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.isComposing)return;
      event.preventDefault();
      search.blur();
    });
  }

  function ensureSearchClear(){
    const search=document.querySelector('#search');
    if(!search)return;

    prepareDeferredSearch(search);
    ensureSearchClearStyles();

    let wrap=search.parentElement;
    if(!wrap?.classList.contains('search-clear-wrap')){
      wrap=document.createElement('div');
      wrap.className='search-clear-wrap';
      search.before(wrap);
      wrap.appendChild(search);
    }

    let button=wrap.querySelector('.search-clear-button');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='search-clear-button';
      button.textContent='×';
      button.addEventListener('pointerdown',event=>event.preventDefault());
      button.addEventListener('click',()=>{
        if(!search.value)return;
        search.value='';
        updateSearchClearButton(search,button);
        runSearch(search);
        try{search.focus({preventScroll:true})}catch(_){search.focus()}
      });
      wrap.appendChild(button);
    }

    updateSearchClearButton(search,button);
  }

  function updateUi(){
    const refresh=document.querySelector('#refresh');
    if(refresh)refresh.remove();

    const controls=document.querySelector('.controls');
    if(controls){
      controls.style.gridTemplateColumns='1fr';
    }

    ensureSearchClear();

    const seriesTab=document.querySelector('.tab[data-view="series"]');
    const topics=document.querySelector('#topics');
    if(topics){
      const seriesActive=seriesTab?.classList.contains('active');
      topics.classList.toggle('hidden',Boolean(seriesActive));
    }
  }

  document.addEventListener('input',event=>{
    const search=event.target.closest?.('#search');
    if(!search)return;
    const button=search.parentElement?.querySelector('.search-clear-button');
    if(button)updateSearchClearButton(search,button);
    event.stopImmediatePropagation();
  },true);

  document.addEventListener('click',event=>{
    if(event.target.closest('.tab'))setTimeout(updateUi,0);
  },true);

  window.visualViewport?.addEventListener('resize',()=>{
    const height=window.visualViewport.height;
    const keyboardClosed=height>lastViewportHeight+60;
    lastViewportHeight=height;
    if(keyboardClosed&&searchElement&&document.activeElement===searchElement)scheduleSearch(searchElement,120);
  });

  window.addEventListener('vedatorlanguagechange',updateUi);
  new MutationObserver(updateUi).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  updateUi();
})();
