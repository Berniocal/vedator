(()=>{
  if(window.__vedatorFirstLoadRecovery)return;
  window.__vedatorFirstLoadRecovery=true;

  // Výkonnostní modul se načte ještě před ostatními rozšířeními aplikace.
  // Původní zvýrazňovač mezitím zůstane vypnutý, aby neběžely dva současně.
  window.__vedatorHighlightPatch=true;
  if(!window.__vedatorPerformanceBoostLoading&&!window.__vedatorPerformanceBoost){
    window.__vedatorPerformanceBoostLoading=true;
    const performanceScript=document.createElement('script');
    performanceScript.src='./performance-boost.js';
    performanceScript.async=false;
    performanceScript.onload=()=>{window.__vedatorPerformanceBoostLoading=false};
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
  }

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
