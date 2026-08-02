(()=>{
  if(window.__vedatorEpisodeTranslationsLoader)return;
  window.__vedatorEpisodeTranslationsLoader=true;

  const VERSION='20260802-1237';
  const SOURCES=[
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
    ['episode-translations-147-140.js','data-vedator-episode-translations-147-140']
  ];

  const normalizeLanguage=value=>{
    const lang=String(value||'').toLowerCase();
    if(lang.startsWith('sk'))return 'sk';
    if(lang.startsWith('cs')||lang.startsWith('cz'))return 'cs';
    return '';
  };

  const language=()=>{
    try{
      const ui=normalizeLanguage(window.vedatorUiLanguage?.());
      if(ui)return ui;
    }catch(_){}
    const html=normalizeLanguage(document.documentElement.lang);
    if(html)return html;
    try{
      const stored=localStorage.getItem('vedator-ui-language-v1')
        ||localStorage.getItem('vedator-ui-language')
        ||localStorage.getItem('vedator-language');
      return normalizeLanguage(stored)||'cs';
    }catch(_){return 'cs'}
  };

  let labelScheduled=false;
  function applyReadMoreLabels(){
    const slovak=language()==='sk';
    document.querySelectorAll('button.vedator-read-more').forEach(button=>{
      const article=button.closest('article');
      const expanded=article?.dataset.descriptionExpanded==='true'
        ||button.getAttribute('aria-expanded')==='true';
      const next=slovak
        ?(expanded?'Čítať menej':'Čítať viac')
        :(expanded?'Číst méně':'Číst víc');
      if(button.textContent!==next)button.textContent=next;
    });
  }

  function scheduleReadMoreLabels(){
    if(labelScheduled)return;
    labelScheduled=true;
    queueMicrotask(()=>{
      labelScheduled=false;
      applyReadMoreLabels();
    });
  }

  let readMoreLocalizationStarted=false;
  function startReadMoreLocalization(){
    if(readMoreLocalizationStarted)return;
    readMoreLocalizationStarted=true;
    new MutationObserver(scheduleReadMoreLabels).observe(document.documentElement,{
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:['aria-expanded','data-description-expanded']
    });
    window.addEventListener('vedatorlanguagechange',scheduleReadMoreLabels);
    scheduleReadMoreLabels();
  }

  function waitForLanguageBatchController(timeout=8000){
    if(window.__vedatorLanguageBatchController)return Promise.resolve(true);
    return new Promise(resolve=>{
      const started=Date.now();
      const check=()=>{
        if(window.__vedatorLanguageBatchController){resolve(true);return}
        if(Date.now()-started>=timeout){resolve(false);return}
        setTimeout(check,16);
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
        scheduleReadMoreLabels();
        window.dispatchEvent(new Event('vedatorepisodetranslationsready'));
        return;
      }
      attempts+=1;
      if(attempts<400)setTimeout(check,25);
    };
    check();
  }

  (async()=>{
    await waitForLanguageBatchController();
    startReadMoreLocalization();
    for(const [source,marker] of SOURCES)await loadScript(source,marker);
    refreshCatalogWhenReady();
  })();
})();
