(()=>{
  if(window.__vedatorServiceWorkerUpdateFix)return;
  window.__vedatorServiceWorkerUpdateFix=true;
  if(!('serviceWorker' in navigator))return;

  const SERVICE_WORKER_URL='./sw.js?v=204';

  async function ensureLatestServiceWorker(){
    try{
      const registration=await navigator.serviceWorker.register(SERVICE_WORKER_URL,{
        scope:'./',
        updateViaCache:'none'
      });
      await registration.update();
      if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
    }catch(error){
      console.warn('Aktualizaci aplikace se nepodařilo ověřit.',error);
    }
  }

  ensureLatestServiceWorker();
  window.addEventListener('pageshow',event=>{
    if(event.persisted)ensureLatestServiceWorker();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)ensureLatestServiceWorker();
  });
})();
