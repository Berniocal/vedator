(()=>{
  if(window.__vedatorEpisodeTranslationsLoader)return;
  window.__vedatorEpisodeTranslationsLoader=true;

  const VERSION='20260801-2330';
  const SOURCES=[
    ['episode-translations-346-337.js','data-vedator-episode-translations-346-337'],
    ['episode-translations-336-330.js','data-vedator-episode-translations-336-330'],
    ['episode-translations-329-323.js','data-vedator-episode-translations-329-323'],
    ['episode-translations-322-316.js','data-vedator-episode-translations-322-316'],
    ['episode-translations-315-308.js','data-vedator-episode-translations-315-308'],
    ['episode-translations-307-300.js','data-vedator-episode-translations-307-300'],
    ['episode-translations-299-292.js','data-vedator-episode-translations-299-292'],
    ['episode-translations-291-284.js','data-vedator-episode-translations-291-284']
  ];

  function loadScript(source,marker){
    return new Promise(resolve=>{
      const existing=document.querySelector(`script[${marker}]`);
      if(existing){
        if(existing.dataset.vedatorLoaded==='1'){resolve();return}
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',resolve,{once:true});
        setTimeout(resolve,3000);
        return;
      }

      const script=document.createElement('script');
      script.src=`./${source}?v=${VERSION}`;
      script.async=false;
      script.setAttribute(marker,'1');
      script.addEventListener('load',()=>{
        script.dataset.vedatorLoaded='1';
        resolve();
      },{once:true});
      script.addEventListener('error',resolve,{once:true});
      document.head.appendChild(script);
    });
  }

  function refreshCatalogWhenReady(){
    let attempts=0;
    const check=()=>{
      let dataReady=false;
      try{dataReady=Array.isArray(episodes)&&episodes.length>0}catch(_){}
      if(dataReady&&typeof render==='function'){
        render();
        window.dispatchEvent(new Event('vedatorepisodetranslationsready'));
        return;
      }
      attempts+=1;
      if(attempts<400)setTimeout(check,25);
    };
    check();
  }

  (async()=>{
    for(const [source,marker] of SOURCES)await loadScript(source,marker);
    refreshCatalogWhenReady();
  })();
})();