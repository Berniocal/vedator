(()=>{
  if(window.__vedatorFirstLoadRecovery)return;
  window.__vedatorFirstLoadRecovery=true;

  const RETRY_KEY='vedator-first-load-recovery-v1';
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

  async function waitForController(timeout=3000){
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
    if(sessionStorage.getItem(RETRY_KEY)==='1'){
      sessionStorage.removeItem(RETRY_KEY);
      return;
    }

    sessionStorage.setItem(RETRY_KEY,'1');
    try{
      const registration=await navigator.serviceWorker.register('./sw.js');
      registration.update().catch(()=>{});
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
      await navigator.serviceWorker.ready;
      await waitForController();
    }catch(error){
      console.warn('Nepodařilo se připravit aktuální verzi aplikace.',error);
    }
    location.reload();
  }

  setTimeout(recover,250);
})();
