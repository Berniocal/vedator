(()=>{
  if(window.__vedatorFirstLoadRecovery)return;
  window.__vedatorFirstLoadRecovery=true;

  // Obnoví otázky z trvalé cache synchronně při vložení skryté epizody.
  // Původní vyhledávač tak po restartu nemusí čekat jeden snímek na každý díl.
  if(!window.__vedatorQuestionCacheStartupBridge){
    window.__vedatorQuestionCacheStartupBridge=true;
    const CACHE_VERSION='q719-20260804-v1';
    const CACHE_PREFIX=`vedatorQuestionEpisodeCache:${CACHE_VERSION}:`;
    const FAQ=new Set([340,337,332,326,319,313,300,295,289,284,278,272,270,263,257,248,244,226,218,211,203,190,179,170,158,143,138,133,128,119,112,100,89,82,75,69,60,51,35,26,17]);
    const PREROLL=5;

    const questionCacheLanguage=()=>{
      try{
        const value=String(window.vedatorUiLanguage?.()||'').toLowerCase();
        if(value==='sk'||value.startsWith('sk'))return'sk';
        if(value==='cz'||value==='cs'||value.startsWith('cs'))return'cz';
      }catch{}
      try{
        const stored=String(localStorage.getItem('vedator-ui-language-v1')||localStorage.getItem('vedator-ui-language')||'').toLowerCase();
        if(stored.startsWith('sk'))return'sk';
        if(stored.startsWith('cz')||stored.startsWith('cs'))return'cz';
      }catch{}
      return String(document.documentElement.lang||'cs').toLowerCase().startsWith('sk')?'sk':'cz';
    };

    const questionEpisodeNumber=article=>{
      if(!(article instanceof HTMLElement)||!article.hidden)return 0;
      const heading=article.querySelector('h2')?.textContent||'';
      const number=Number(heading.match(/\bpodcast\s+(\d+)\b/i)?.[1]||0);
      return FAQ.has(number)?number:0;
    };

    const readQuestionCache=episode=>{
      const lang=questionCacheLanguage();
      try{
        const saved=JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${lang}:${episode}`)||'null');
        if(saved?.version!==CACHE_VERSION||saved?.language!==lang||Number(saved?.episode)!==Number(episode)||!Array.isArray(saved?.items)||!saved.items.length)return null;
        return saved.items;
      }catch{return null}
    };

    const hydrateQuestionArticle=(article,items)=>{
      if(!article||article.querySelector('.summary-block')||!items?.length)return;
      const details=document.createElement('details');
      details.className='episode-summary';
      const summary=document.createElement('summary');
      summary.textContent='Shrnutí dílu';
      const body=document.createElement('div');
      body.className='episode-summary-body';
      items.forEach((item,index)=>{
        if(!item||!Array.isArray(item.points))return;
        const block=document.createElement('div');
        block.className='summary-block';
        if(item.endRaw!=null)block.dataset.end=String(item.endRaw);
        const time=document.createElement('div');
        time.className='summary-time';
        time.textContent=String(item.time||'0:00');
        time.dataset.vedatorPreroll=String(PREROLL);
        const title=document.createElement('div');
        title.className='summary-title';
        title.textContent=String(item.title||`Otázka ${index+1}`);
        const list=document.createElement('ul');
        item.points.forEach(point=>{
          const li=document.createElement('li');
          li.textContent=String(point||'').trim();
          if(li.textContent)list.appendChild(li);
        });
        block.append(time,title,list);
        body.appendChild(block);
      });
      if(!body.querySelector('.summary-block'))return;
      details.append(summary,body);
      article.appendChild(details);
      article.dataset.vedatorQuestionCacheHit='1';
    };

    const hydrateAddedQuestionNode=(container,node)=>{
      if(!(container instanceof HTMLElement)||container.id!=='episodes'||!(node instanceof HTMLElement)||!node.matches('article')||!node.hidden)return;
      const episode=questionEpisodeNumber(node);
      if(!episode||episode===300)return;
      const cached=readQuestionCache(episode);
      if(cached)hydrateQuestionArticle(node,cached);
    };

    if(!Element.prototype.__vedatorQuestionCacheSyncAppend){
      const nativeAppend=Element.prototype.append;
      Object.defineProperty(Element.prototype,'__vedatorQuestionCacheSyncAppend',{value:true,configurable:true});
      Element.prototype.append=function(...nodes){
        const result=nativeAppend.apply(this,nodes);
        nodes.forEach(node=>hydrateAddedQuestionNode(this,node));
        return result;
      };
    }
    if(!Node.prototype.__vedatorQuestionCacheSyncAppendChild){
      const nativeAppendChild=Node.prototype.appendChild;
      Object.defineProperty(Node.prototype,'__vedatorQuestionCacheSyncAppendChild',{value:true,configurable:true});
      Node.prototype.appendChild=function(node){
        const result=nativeAppendChild.call(this,node);
        hydrateAddedQuestionNode(this,node);
        return result;
      };
    }
  }

  // Cache otázek se instaluje co nejdříve, aby zachytila i první vyhledávání.
  if(!window.__vedatorQuestionCacheBoostLoading&&!window.__vedatorQuestionCacheBoost){
    window.__vedatorQuestionCacheBoostLoading=true;
    const questionCacheScript=document.createElement('script');
    questionCacheScript.src='./questions-performance-cache.js';
    questionCacheScript.async=false;
    questionCacheScript.onload=()=>{window.__vedatorQuestionCacheBoostLoading=false};
    questionCacheScript.onerror=()=>{window.__vedatorQuestionCacheBoostLoading=false};
    document.head.appendChild(questionCacheScript);
  }

  // Původní zvýrazňovač zůstane vypnutý, aby neběžely dva současně.
  // Výkonnostní moduly se načtou po dokončení všech stávajících defer skriptů.
  window.__vedatorHighlightPatch=true;
  const loadPerformanceBoost=()=>{
    if(window.__vedatorPerformanceBoostLoading||window.__vedatorPerformanceBoost)return;
    window.__vedatorPerformanceBoostLoading=true;
    const performanceScript=document.createElement('script');
    performanceScript.src='./performance-boost.js';
    performanceScript.async=false;
    performanceScript.onload=()=>{
      window.__vedatorPerformanceBoostLoading=false;
      setTimeout(()=>{
        if(window.__vedatorPersistentPerformanceCache||document.querySelector('script[data-vedator-persistent-performance]'))return;
        const persistentScript=document.createElement('script');
        persistentScript.src='./performance-persistent-cache.js';
        persistentScript.async=false;
        persistentScript.dataset.vedatorPersistentPerformance='1';
        document.head.appendChild(persistentScript);
      },100);
    };
    performanceScript.onerror=()=>{
      window.__vedatorPerformanceBoostLoading=false;
      window.__vedatorHighlightPatch=false;
      if(!document.querySelector('script[data-vedator-highlight-fallback]')){
        const fallback=document.createElement('script');
        fallback.src='./highlight-patch.js';
        fallback.dataset.vedatorHighlightFallback='1';
        document.head.appendChild(fallback);
      }
    };
    document.head.appendChild(performanceScript);
  };
  if(document.readyState==='complete')loadPerformanceBoost();
  else document.addEventListener('DOMContentLoaded',loadPerformanceBoost,{once:true});

  // Posluchače rozbalení sérií zaregistrované později přesune do dalšího snímku.
  // Šipka a otevření karty se tak vykreslí ihned, obsah se doplní vzápětí.
  const nativeAddEventListener=EventTarget.prototype.addEventListener;
  if(!EventTarget.prototype.__vedatorDeferredSeriesToggle){
    Object.defineProperty(EventTarget.prototype,'__vedatorDeferredSeriesToggle',{value:true,configurable:true});
    EventTarget.prototype.addEventListener=function(type,listener,options){
      if(type==='toggle'&&typeof listener==='function'&&this instanceof HTMLElement&&this.classList.contains('series-card')){
        const deferred=function(event){requestAnimationFrame(()=>listener.call(this,event))};
        return nativeAddEventListener.call(this,type,deferred,options);
      }
      return nativeAddEventListener.call(this,type,listener,options);
    };
  }

  const SW_URL='./sw-fast.js';
  const RETRY_KEY='vedator-first-load-recovery-v3';
  const hasEnhancedUi=()=>Boolean(
    document.querySelector('.tab[data-view="questions"]')&&
    document.querySelector('.tab[data-view="playlists"]')
  );
  const enhancementsAreQueued=()=>[...document.scripts].some(script=>{
    try{return new URL(script.src,location.href).pathname.endsWith('/questions-view.js')}
    catch{return false}
  });
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function waitForEnhancedUi(timeout=1800){
    const started=performance.now();
    while(performance.now()-started<timeout){
      if(hasEnhancedUi())return true;
      await wait(50);
    }
    return hasEnhancedUi();
  }

  async function waitForController(timeout=1600){
    if(navigator.serviceWorker.controller)return true;
    return new Promise(resolve=>{
      let settled=false;
      const finish=value=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('controllerchange',onChange);
        resolve(value);
      };
      const onChange=()=>finish(Boolean(navigator.serviceWorker.controller));
      const timer=setTimeout(()=>finish(Boolean(navigator.serviceWorker.controller)),timeout);
      navigator.serviceWorker.addEventListener('controllerchange',onChange);
    });
  }

  async function removeCompetingFirstRegistration(){
    if(navigator.serviceWorker.controller)return;
    const registration=await navigator.serviceWorker.getRegistration();
    if(!registration)return;
    const workers=[registration.installing,registration.waiting,registration.active].filter(Boolean);
    const names=workers.map(worker=>{
      try{return new URL(worker.scriptURL).pathname.split('/').pop()}
      catch{return''}
    });
    if(names.includes('sw.js')&&!names.includes('sw-fast.js'))await registration.unregister();
  }

  async function recover(){
    if(hasEnhancedUi()){
      sessionStorage.removeItem(RETRY_KEY);
      return;
    }

    if(enhancementsAreQueued()&&await waitForEnhancedUi()){
      sessionStorage.removeItem(RETRY_KEY);
      return;
    }

    if(!('serviceWorker'in navigator))return;
    if(sessionStorage.getItem(RETRY_KEY)==='1')return;

    sessionStorage.setItem(RETRY_KEY,'1');
    try{
      await removeCompetingFirstRegistration();
      const registration=await navigator.serviceWorker.register(SW_URL);
      registration.update().catch(()=>{});
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
      await navigator.serviceWorker.ready;
      const controlled=await waitForController();
      if(!controlled){
        sessionStorage.removeItem(RETRY_KEY);
        setTimeout(recover,250);
        return;
      }
    }catch(error){
      sessionStorage.removeItem(RETRY_KEY);
      console.warn('Nepodařilo se připravit aktuální verzi aplikace.',error);
      return;
    }
    location.replace(location.href);
  }

  setTimeout(recover,25);
})();
