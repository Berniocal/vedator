(()=>{
  if(window.__vedatorDirectAppLoader)return;
  window.__vedatorDirectAppLoader=true;

  const VERSION='direct-v206';
  const knownPath=src=>{
    try{return new URL(src,location.href).pathname.split('/').pop()}
    catch{return''}
  };
  const hasScript=name=>[...document.scripts].some(script=>knownPath(script.src)===name);
  const hasStyle=name=>[...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>knownPath(link.href)===name);

  function installStyle(name){
    if(hasStyle(name))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`./${name}`;
    document.head.appendChild(link);
  }

  function installScripts(names){
    for(const name of names){
      if(name==='first-load-recovery.js'||hasScript(name))continue;
      const script=document.createElement('script');
      script.async=false;
      script.src=`./${name}`;
      script.dataset.vedatorDirectAsset='1';
      document.head.appendChild(script);
    }
  }

  async function assetsFromWorker(){
    const response=await fetch(`./sw.js?assets=${VERSION}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const source=await response.text();
    const match=source.match(/const ASSETS=\[([\s\S]*?)\];/);
    if(!match)throw new Error('Seznam souborů nebyl ve workeru nalezen.');
    return [...match[1].matchAll(/'([^']+)'/g)].map(item=>item[1]);
  }

  async function start(){
    // Řízená stránka už má všechny moduly vložené přímo ve výsledném HTML.
    if(hasScript('questions-view.js')&&hasScript('playlist-patch.js'))return;
    try{
      const assets=await assetsFromWorker();
      const styles=assets.filter(name=>name.endsWith('.css'));
      const scripts=assets.filter(name=>name.endsWith('.js'));
      if(!scripts.includes('episode-346-summary.js')){
        const before=Math.max(0,scripts.indexOf('episode-340-summary.js'));
        scripts.splice(before,0,'episode-346-summary.js');
      }
      styles.forEach(installStyle);
      installScripts(scripts);
    }catch(error){
      console.warn('Přímé načtení aktuální verze se nezdařilo.',error);
    }
  }

  void start();
})();
