(()=>{
  if(window.__vedatorEpisodeTranslationsLoader)return;
  window.__vedatorEpisodeTranslationsLoader=true;
  window.__vedatorEpisodeTranslationsReady=false;

  const VERSION='20260808-episode-343-summary-seek';
  const SOURCES=[
    ['episode-translations-347.js','data-vedator-episode-translations-347'],
    ['episode-343-summary.js','data-vedator-episode-343-summary'],
    ['episode-343-summary-interactive.js','data-vedator-episode-343-summary-interactive'],
    ['episode-translations-346-337.js','data-vedator-episode-translations-346-337'],
    ['episode-translations-336-330.js','data-vedator-episode-translations-336-330'],
    ['episode-translations-329-323.js','data-vedator-episode-translations-329-323'],
    ['episode-translations-322-316.js','data-vedator-episode-translations-322-316'],
    ['episode-translations-315-308.js','data-vedator-episode-translations-315-308'],
    ['episode-translations-307-300.js','data-vedator-episode-translations-307-300'],
    ['episode-translations-299-292.js','data-vedator-episode-translations-299-292'],
    ['episode-translations-291-284.js','data-vedator-episode-translations-291-284'],
    ['episode-translations-283-276.js','data-vedator-episode-translations-283-276'],
    ['episode-translations-275-268.js','data-vedator-episode-translations-275-268'],
    ['episode-translations-267-260.js','data-vedator-episode-translations-267-260'],
    ['episode-translations-259-252.js','data-vedator-episode-translations-259-252'],
    ['episode-translations-251-244.js','data-vedator-episode-translations-251-244'],
    ['episode-translations-243-236.js','data-vedator-episode-translations-243-236'],
    ['episode-translations-235-228.js','data-vedator-episode-translations-235-228'],
    ['episode-translations-227-220.js','data-vedator-episode-translations-227-220'],
    ['episode-translations-219-212.js','data-vedator-episode-translations-219-212'],
    ['episode-translations-211-204.js','data-vedator-episode-translations-211-204'],
    ['episode-translations-203-196.js','data-vedator-episode-translations-203-196'],
    ['episode-translations-195-188.js','data-vedator-episode-translations-195-188'],
    ['episode-translations-187-180.js','data-vedator-episode-translations-187-180'],
    ['episode-translations-179-172.js','data-vedator-episode-translations-179-172'],
    ['episode-translations-171-164.js','data-vedator-episode-translations-171-164'],
    ['episode-translations-163-156.js','data-vedator-episode-translations-163-156'],
    ['episode-translations-155-148.js','data-vedator-episode-translations-155-148'],
    ['episode-translations-147-140.js','data-vedator-episode-translations-147-140'],
    ['episode-translations-139-132.js','data-vedator-episode-translations-139-132'],
    ['episode-translations-131-124.js','data-vedator-episode-translations-131-124'],
    ['episode-translations-123-116.js','data-vedator-episode-translations-123-116'],
    ['episode-translations-115-108.js','data-vedator-episode-translations-115-108'],
    ['episode-translations-107-100.js','data-vedator-episode-translations-107-100'],
    ['episode-translations-99-92.js','data-vedator-episode-translations-99-92'],
    ['episode-translations-91-84.js','data-vedator-episode-translations-91-84'],
    ['episode-translations-83-76.js','data-vedator-episode-translations-83-76'],
    ['episode-translations-75-68.js','data-vedator-episode-translations-75-68'],
    ['episode-translations-67-60.js','data-vedator-episode-translations-67-60'],
    ['episode-translations-59-52.js','data-vedator-episode-translations-59-52'],
    ['episode-translations-51-44.js','data-vedator-episode-translations-51-44'],
    ['episode-translations-43-36.js','data-vedator-episode-translations-43-36'],
    ['episode-translations-35-28.js','data-vedator-episode-translations-35-28'],
    ['episode-translations-27-20.js','data-vedator-episode-translations-27-20'],
    ['episode-translations-19-12.js','data-vedator-episode-translations-19-12'],
    ['episode-translations-11-4.js','data-vedator-episode-translations-11-4'],
    ['episode-translations-3-1.js','data-vedator-episode-translations-3-1'],
    ['episode-translations-space-talks-1-7.js','data-vedator-episode-translations-space-talks-1-7'],
    ['episode-translations-space-talks-8-15.js','data-vedator-episode-translations-space-talks-8-15']
  ];

  function waitForLanguageBatchController(timeout=8000){
    if(window.__vedatorLanguageBatchController)return Promise.resolve(true);
    return new Promise(resolve=>{
      const started=Date.now();
      const check=()=>{
        if(window.__vedatorLanguageBatchController){resolve(true);return}
        if(Date.now()-started>=timeout){resolve(false);return}
        setTimeout(check,50);
      };
      check();
    });
  }

  function loadScript(source,marker){
    return new Promise(resolve=>{
      const existing=document.querySelector(`script[${marker}]`);
      if(existing){
        if(existing.dataset.vedatorLoaded==='1'){resolve();return}
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',resolve,{once:true});
        setTimeout(resolve,3000);return;
      }
      const script=document.createElement('script');
      script.src=`./${source}?v=${VERSION}`;
      script.async=false;
      script.setAttribute(marker,'1');
      script.addEventListener('load',()=>{script.dataset.vedatorLoaded='1';resolve()},{once:true});
      script.addEventListener('error',resolve,{once:true});
      document.head.appendChild(script);
    });
  }

  function finishWhenCatalogReady(){
    let attempts=0;
    const check=()=>{
      let dataReady=false;
      try{dataReady=Array.isArray(episodes)&&episodes.length>0}catch(_){}
      if(dataReady){
        window.__vedatorEpisodeTranslationsReady=true;
        window.dispatchEvent(new Event('vedatorepisodetranslationsready'));
        if(typeof render==='function')render();
        return;
      }
      attempts+=1;
      if(attempts<100)setTimeout(check,100);
    };
    check();
  }

  (async()=>{
    await waitForLanguageBatchController();
    for(const [source,marker] of SOURCES)await loadScript(source,marker);
    finishWhenCatalogReady();
  })();
})();
