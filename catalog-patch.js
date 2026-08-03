(()=>{
  if(window.__vedatorCatalogPatch)return;
  window.__vedatorCatalogPatch=true;

  const COLLECTION_PROGRESS_KEY='vedatorCollectionProgressV1';
  const STARTED_SERIES_KEY='vedatorStartedSeriesV1';
  const SERIES_ALIAS_GROUPS=[
    ['series:cerne diry','series:cierne diery']
  ];
  const openSeriesKeys=new Set();
  let seriesRenderInProgress=false;
  let aliasSyncInProgress=false;

  function readStoredObject(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch(_){return {}}
  }

  function writeStoredObject(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}
  }

  function normalizedSeriesLabel(value){
    return String(value||'')
      .replace(/Čierne diery/gi,'Černé díry')
      .replace(/Hledání mimozemského života/gi,'Hľadanie mimozemského života')
      .replace(/Rozhovory o vesmíru/gi,'Rozhovory o vesmíre')
      .replace(/(?:Žiji|Žiju) vědu/gi,'Žijem vedu')
      .replace(/Genetický speciál/gi,'Genetický špeciál')
      .replace(/Vedátorský speciál/gi,'Vedátorský špeciál')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,' ')
      .trim();
  }

  function seriesCardKey(card){
    const title=card?.querySelector(':scope>summary>span:first-child')?.textContent||'';
    return normalizedSeriesLabel(title);
  }

  function mergeItemRecord(left,right){
    if(!left)return right;
    if(!right)return left;
    const leftUpdated=Number(left.updatedAt)||0;
    const rightUpdated=Number(right.updatedAt)||0;
    const newer=rightUpdated>=leftUpdated?right:left;
    return {
      ...left,
      ...right,
      ...newer,
      currentTime:Math.max(Number(left.currentTime)||0,Number(right.currentTime)||0),
      duration:Math.max(Number(left.duration)||0,Number(right.duration)||0),
      percent:Math.max(Number(left.percent)||0,Number(right.percent)||0),
      completed:Boolean(left.completed)||Boolean(right.completed),
      updatedAt:Math.max(leftUpdated,rightUpdated)
    };
  }

  function mergeCollectionRecord(left,right){
    if(!left)return right;
    if(!right)return left;
    const items={};
    const leftItems=left.items&&typeof left.items==='object'?left.items:{};
    const rightItems=right.items&&typeof right.items==='object'?right.items:{};
    for(const id of new Set([...Object.keys(leftItems),...Object.keys(rightItems)]))items[id]=mergeItemRecord(leftItems[id],rightItems[id]);
    const newer=(Number(right.updatedAt)||0)>=(Number(left.updatedAt)||0)?right:left;
    return {
      ...left,
      ...right,
      ...newer,
      items,
      started:Boolean(left.started)||Boolean(right.started),
      updatedAt:Math.max(Number(left.updatedAt)||0,Number(right.updatedAt)||0)
    };
  }

  function hasRealCollectionProgress(record){
    const items=record&&typeof record.items==='object'&&record.items?Object.values(record.items):[];
    return items.some(item=>item&&(item.completed||Number(item.percent)>0||Number(item.currentTime)>Number(item.start||0)+3));
  }

  function dispatchStoredRefresh(key){
    setTimeout(()=>{
      let event;
      try{
        event=new StorageEvent('storage',{
          key,
          newValue:localStorage.getItem(key),
          storageArea:localStorage,
          url:location.href
        });
      }catch(_){
        event=new Event('storage');
        Object.defineProperty(event,'key',{value:key});
      }
      window.dispatchEvent(event);
    },0);
  }

  function syncLocalizedSeriesProgress(notify=false){
    if(aliasSyncInProgress)return false;
    aliasSyncInProgress=true;
    let changed=false;
    try{
      const progress=readStoredObject(COLLECTION_PROGRESS_KEY);
      const started=readStoredObject(STARTED_SERIES_KEY);

      for(const aliases of SERIES_ALIAS_GROUPS){
        let merged=null;
        for(const id of aliases)merged=mergeCollectionRecord(merged,progress[id]);
        if(merged){
          const encoded=JSON.stringify(merged);
          for(const id of aliases){
            if(JSON.stringify(progress[id]||null)!==encoded){progress[id]=merged;changed=true}
          }
        }
        const isStarted=aliases.some(id=>Boolean(started[id]))||hasRealCollectionProgress(merged);
        for(const id of aliases){
          if(isStarted&&!started[id]){started[id]=true;changed=true}
          if(!isStarted&&started[id]){delete started[id];changed=true}
        }
      }

      for(const id of Object.keys(started)){
        if(!hasRealCollectionProgress(progress[id])){
          delete started[id];
          changed=true;
        }
      }

      if(changed){
        writeStoredObject(COLLECTION_PROGRESS_KEY,progress);
        writeStoredObject(STARTED_SERIES_KEY,started);
      }
    }finally{
      aliasSyncInProgress=false;
    }
    if(changed&&notify){
      dispatchStoredRefresh(COLLECTION_PROGRESS_KEY);
      dispatchStoredRefresh(STARTED_SERIES_KEY);
    }
    return changed;
  }

  syncLocalizedSeriesProgress(false);

  function rememberOpenSeries(){
    document.querySelectorAll('#series .series-card[open]').forEach(card=>{
      const key=seriesCardKey(card);
      if(key)openSeriesKeys.add(key);
    });
  }

  function restoreOpenSeries(){
    document.querySelectorAll('#series .series-card').forEach(card=>{
      const key=seriesCardKey(card);
      if(!key||!openSeriesKeys.has(key)||card.open)return;
      card.open=true;
      queueMicrotask(()=>{
        if(card.open&&!card.querySelector(':scope>.series-body'))card.dispatchEvent(new Event('toggle'));
      });
    });
  }

  function installSeriesRenderPersistence(){
    const current=window.renderSeries;
    if(typeof current!=='function'||current.__vedatorOpenSeriesWrapped)return;
    const wrapped=function(...args){
      rememberOpenSeries();
      seriesRenderInProgress=true;
      let result;
      try{result=current.apply(this,args)}finally{seriesRenderInProgress=false}
      restoreOpenSeries();
      requestAnimationFrame(restoreOpenSeries);
      return result;
    };
    wrapped.__vedatorOpenSeriesWrapped=true;
    window.renderSeries=wrapped;
  }

  function installPlainSeriesTextStyle(){
    document.querySelector('style[data-vedator-plain-series-text]')?.remove();
    const plainStyle=document.createElement('style');
    plainStyle.dataset.vedatorPlainSeriesText='1';
    plainStyle.textContent=`
      #series .series-card>summary>span:first-child,
      #series .series-card>summary>span:first-child.vedator-collection-title-active,
      #series .series-card>summary>span:first-child.vedator-collection-title-complete,
      #series .series-card>summary>span:first-child.vedator-series-started-persisted{
        color:var(--ink,#e5e7eb)!important;
        background:none!important;
        text-decoration:none!important;
        -webkit-background-clip:border-box!important;
        background-clip:border-box!important;
        -webkit-text-fill-color:currentColor!important;
      }

      #series .series-body a,
      #series .series-body a:visited,
      #series .series-body a:hover,
      #series .series-body a:active{
        color:#392b9b!important;
        background:none!important;
        text-decoration:none!important;
        -webkit-background-clip:border-box!important;
        background-clip:border-box!important;
        -webkit-text-fill-color:currentColor!important;
      }

      #series .series-body a>.vedator-collection-item-title,
      #series .series-body a>.person-name,
      #series .series-body a>.episode-title,
      #series .series-body a>.vedator-collection-progress-text,
      #series .series-body a>.vedator-collection-complete-text{
        color:#392b9b!important;
        background:none!important;
        text-decoration:underline!important;
        text-decoration-thickness:from-font!important;
        text-underline-offset:.12em;
        -webkit-background-clip:border-box!important;
        background-clip:border-box!important;
        -webkit-text-fill-color:currentColor!important;
      }

      #series .series-body a>.vedator-series-item-status-badge{
        text-decoration:none!important;
        -webkit-text-fill-color:currentColor!important;
      }

      html.theme-dark #series .series-body a,
      html.theme-dark #series .series-body a:visited,
      html.theme-dark #series .series-body a:hover,
      html.theme-dark #series .series-body a:active,
      html.theme-dark #series .series-body a>.vedator-collection-item-title,
      html.theme-dark #series .series-body a>.person-name,
      html.theme-dark #series .series-body a>.episode-title,
      html.theme-dark #series .series-body a>.vedator-collection-progress-text,
      html.theme-dark #series .series-body a>.vedator-collection-complete-text{
        color:#c4b5fd!important;
      }

      @media(max-width:650px){
        #series .series-card>summary{
          display:grid!important;
          grid-template-columns:minmax(0,1fr) auto auto auto;
          align-items:center;
          column-gap:10px;
          row-gap:7px;
        }
        #series .series-card>summary>span:first-child{grid-column:1;grid-row:1;min-width:0}
        #series .series-card>summary>.series-count{grid-column:2;grid-row:1;margin-left:0!important}
        #series .series-card>summary>.vedator-deep-share{grid-column:3;grid-row:1;margin-left:0!important}
        #series .series-card>summary::after{grid-column:4;grid-row:1}
        #series .series-card>summary>.vedator-series-status-badge{
          grid-column:1/-1;
          grid-row:2;
          justify-self:start;
          margin:0!important;
          width:max-content!important;
          max-width:100%;
        }
      }
    `;
    document.head.appendChild(plainStyle);
  }

  function loadCollectionProgress(){
    if(window.__vedatorCollectionProgressBootstrap)return;
    window.__vedatorCollectionProgressBootstrap=true;
    if(document.querySelector('script[data-vedator-collection-progress-bootstrap]'))return;
    const script=document.createElement('script');
    script.src='./collection-progress.js?v=20260803-1828';
    script.async=false;
    script.dataset.vedatorCollectionProgressBootstrap='1';
    script.addEventListener('load',installPlainSeriesTextStyle,{once:true});
    document.head.appendChild(script);
  }
  loadCollectionProgress();
  setTimeout(installPlainSeriesTextStyle,1200);

  const MATHEMATICS_EPISODES=[91,93,98,113,115,116,117,118,156,181,198,201,216,249,282,286,328,329,336];
  const MATHEMATICS_SET=new Set(MATHEMATICS_EPISODES);
  const FAQ_EXTRA_EPISODES=new Set([138,300]);
  const SERIES_TITLE_REWRITES=[
    [/Hledání mimozemského života/gi,'Hľadanie mimozemského života'],
    [/Rozhovory o vesmíru/gi,'Rozhovory o vesmíre'],
    [/(?:Žiji|Žiju) vědu/gi,'Žijem vedu'],
    [/Genetický speciál/gi,'Genetický špeciál'],
    [/Vedátorský speciál/gi,'Vedátorský špeciál'],
    [/Nobelovy ceny/gi,'Nobelove ceny']
  ];

  const style=document.createElement('style');
  style.textContent=`
    .series-card>summary{justify-content:flex-start!important}
    .series-count{margin-left:auto!important;text-align:right;min-width:4.6rem}
  `;
  document.head.appendChild(style);

  function loadEpisodeTranslations(){
    if(window.__vedatorEpisodeTranslationBootstrap)return;
    window.__vedatorEpisodeTranslationBootstrap=true;
    if(document.querySelector('script[data-vedator-episode-translation-bootstrap]'))return;
    const script=document.createElement('script');
    script.src='./episode-translations-loader.js?v=20260802-2236';
    script.async=false;
    script.dataset.vedatorEpisodeTranslationBootstrap='1';
    document.head.appendChild(script);
  }
  loadEpisodeTranslations();

  function loadDeepLinks(){
    if(window.__vedatorDeepLinksBootstrap)return;
    window.__vedatorDeepLinksBootstrap=true;
    if(document.querySelector('script[data-vedator-deep-links-bootstrap]'))return;
    const script=document.createElement('script');
    script.src='./deep-links.js?v=20260802-1603';
    script.async=false;
    script.dataset.vedatorDeepLinksBootstrap='1';
    document.head.appendChild(script);
  }
  loadDeepLinks();

  function ensureSearchHighlighting(){
    const version='20260802-1940';
    const ensure=(source,flag,marker)=>{
      if(window[flag]||document.querySelector(`script[${marker}]`))return;
      const script=document.createElement('script');
      script.src=`./${source}?v=${version}`;
      script.async=false;
      script.setAttribute(marker,'1');
      document.head.appendChild(script);
    };
    const check=()=>{
      ensure('highlight-patch.js','__vedatorHighlightPatch','data-vedator-highlight-bootstrap');
      ensure('question-highlight-translated.js','__vedatorTranslatedQuestionHighlight','data-vedator-question-highlight-bootstrap');
    };
    setTimeout(check,600);
    window.addEventListener('vedatorcontentchange',check);
    window.addEventListener('vedatorepisodetranslationsready',check);
  }
  ensureSearchHighlighting();

  if(typeof FIXED_SERIES==='undefined'||typeof filtered!=='function'||typeof categories!=='function')return;

  const faqSeries=FIXED_SERIES.find(series=>series.name==='FAQ – dobré otázky');
  if(faqSeries){
    const originalFaqTest=faqSeries.test;
    faqSeries.test=episode=>originalFaqTest(episode)||FAQ_EXTRA_EPISODES.has(Number(episode.number));
  }

  if(!FIXED_SERIES.some(series=>series.name==='Matematika')){
    FIXED_SERIES.push({
      name:'Matematika',
      test:episode=>MATHEMATICS_SET.has(Number(episode.number))
    });
  }

  function slovakSeriesTitle(value){
    let title=String(value||'');
    for(const [pattern,replacement] of SERIES_TITLE_REWRITES)title=title.replace(pattern,replacement);
    return title;
  }

  for(const series of FIXED_SERIES){
    if(series.__vedatorBilingualSeriesTest||typeof series.test!=='function')continue;
    const originalTest=series.test;
    series.test=episode=>{
      try{if(originalTest(episode))return true}catch(_){}
      const title=String(episode?.title||'');
      const slovakTitle=slovakSeriesTitle(title);
      if(slovakTitle===title)return false;
      try{return originalTest({...episode,title:slovakTitle})}catch(_){return false}
    };
    series.__vedatorBilingualSeriesTest=true;
  }

  const originalCategories=categories;
  categories=function(episode){
    const result=originalCategories(episode);
    if(MATHEMATICS_SET.has(Number(episode.number))&&!result.includes('Matematika'))result.push('Matematika');
    return result;
  };

  const originalFiltered=filtered;
  filtered=function(){
    if(active!=='Matematika')return originalFiltered();

    const queries=expandedQuery(document.querySelector('#search').value);
    return episodes
      .filter(episode=>MATHEMATICS_EPISODES.includes(Number(episode.number)))
      .map(episode=>{
        const searchMatch=matchLevel(episode,queries);
        return {...episode,cats:categories(episode),searchMatch,topicMatch:0};
      })
      .filter(episode=>!queries.length||episode.searchMatch<99);
  };

  const absoluteUrl=value=>{
    try{return new URL(value,location.href).href}catch(error){return String(value||'')}
  };

  function stripSeriesStatusSuffix(value){
    let text=String(value||'').trim();
    const suffix=/(?:\s*(?:✓\s*)?Poslechnuto|\s*Rozposloucháno\s*·?\s*\d+\s*%)+\s*$/i;
    let previous='';
    while(text&&text!==previous){
      previous=text;
      text=text.replace(suffix,'').trim();
    }
    return text;
  }

  function findSeriesEpisode(link){
    if(!Array.isArray(episodes))return null;
    const href=absoluteUrl(link.getAttribute('href'));
    const visibleTitle=link.querySelector('.episode-title')?.textContent||link.querySelector('.vedator-collection-item-title')?.textContent||link.textContent||'';
    const title=stripSeriesStatusSuffix(visibleTitle);
    return episodes.find(episode=>
      absoluteUrl(episode.link)===href||
      absoluteUrl(episode.enclosure)===href||
      episode.title===title
    )||null;
  }

  function normalizeSeriesLinkTitle(link,episode){
    const canonical=String(episode?.title||link.dataset.vedatorEpisodeTitle||'').trim();
    if(!canonical)return;

    const badges=[...link.querySelectorAll(':scope > .vedator-series-item-status-badge')];
    badges.slice(1).forEach(badge=>badge.remove());

    const person=link.querySelector(':scope > .person-name');
    const episodeTitle=link.querySelector(':scope > .episode-title');
    if(person||episodeTitle){
      if(episodeTitle&&episodeTitle.textContent!==canonical)episodeTitle.textContent=canonical;
      return;
    }

    let title=link.querySelector(':scope > .vedator-collection-item-title');
    if(!title){
      title=document.createElement('span');
      title.className='vedator-collection-item-title';
      const badge=link.querySelector(':scope > .vedator-series-item-status-badge');
      link.insertBefore(title,badge||link.firstChild);
    }
    if(title.textContent!==canonical)title.textContent=canonical;

    for(const child of [...link.childNodes]){
      if(child===title)continue;
      if(child.nodeType===1&&child.classList?.contains('vedator-series-item-status-badge'))continue;
      if(child.nodeType===3&&child.textContent.trim())child.remove();
    }
  }

  function prepareSeriesLinks(){
    document.querySelectorAll('#series .series-body a').forEach(link=>{
      const episode=findSeriesEpisode(link);
      if(!episode)return;
      if(episode.enclosure){
        link.dataset.vedatorAudioUrl=episode.enclosure;
        link.dataset.vedatorEpisodeTitle=episode.title;
        link.href=episode.enclosure;
        link.removeAttribute('target');
        link.removeAttribute('rel');
      }
      normalizeSeriesLinkTitle(link,episode);
    });
  }

  function seriesPlaybackContext(link){
    const card=link.closest('.series-card');
    const links=[...(card?.querySelectorAll('.series-body a')||[])];
    return {
      label:card?.querySelector('summary span')?.textContent?.trim()||'Série',
      titles:links
        .map(item=>item.dataset.vedatorEpisodeTitle||item.querySelector('.episode-title')?.textContent||item.querySelector('.vedator-collection-item-title')?.textContent||stripSeriesStatusSuffix(item.textContent))
        .map(title=>String(title||'').trim())
        .filter(Boolean)
    };
  }

  function openSeriesEpisodeInPlayer(link){
    const url=link.dataset.vedatorAudioUrl;
    const title=link.dataset.vedatorEpisodeTitle;
    if(!url||!title)return false;

    window.__vedatorPlaybackContext=seriesPlaybackContext(link);

    const proxy=document.createElement('article');
    proxy.hidden=true;
    const heading=document.createElement('h2');
    heading.textContent=title;
    const links=document.createElement('div');
    links.className='links';
    const play=document.createElement('a');
    play.className='primary';
    play.href=url;
    play.dataset.vedatorEpisodeTitle=title;
    play.textContent='Přehrát';
    links.appendChild(play);
    proxy.append(heading,links);
    document.body.appendChild(proxy);
    play.click();
    proxy.remove();
    return true;
  }

  document.addEventListener('toggle',event=>{
    const card=event.target;
    if(!card?.matches?.('#series .series-card')||seriesRenderInProgress)return;
    const key=seriesCardKey(card);
    if(!key)return;
    if(card.open)openSeriesKeys.add(key);
    else openSeriesKeys.delete(key);
  },true);

  document.addEventListener('click',event=>{
    const link=event.target.closest('#series .series-body a[data-vedator-audio-url]');
    if(!link)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openSeriesEpisodeInPlayer(link);
  },true);

  window.addEventListener('storage',event=>{
    if(event.key===COLLECTION_PROGRESS_KEY||event.key===STARTED_SERIES_KEY)syncLocalizedSeriesProgress(false);
  });
  window.addEventListener('vedatorlanguagechange',()=>{
    syncLocalizedSeriesProgress(true);
    rememberOpenSeries();
    setTimeout(restoreOpenSeries,0);
    setTimeout(restoreOpenSeries,160);
  });
  window.addEventListener('vedatorcontentchange',()=>{
    syncLocalizedSeriesProgress(true);
    installSeriesRenderPersistence();
    restoreOpenSeries();
  });
  window.addEventListener('vedatorepisodetranslationsready',()=>{
    installSeriesRenderPersistence();
    restoreOpenSeries();
  });

  const seriesBox=document.querySelector('#series');
  if(seriesBox)new MutationObserver(()=>{
    prepareSeriesLinks();
    installSeriesRenderPersistence();
    restoreOpenSeries();
  }).observe(seriesBox,{childList:true,subtree:true});
  prepareSeriesLinks();

  installSeriesRenderPersistence();
  for(const delay of [0,80,250,700,1500,3000])setTimeout(()=>{
    installSeriesRenderPersistence();
    restoreOpenSeries();
  },delay);

  if(Array.isArray(episodes)&&episodes.length&&typeof render==='function')render();
})();