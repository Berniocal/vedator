import fs from 'node:fs';
import crypto from 'node:crypto';

const indexPath='index.html';
const appPath='app-v2.js';
if(!fs.existsSync(indexPath)||!fs.existsSync(appPath))throw new Error('Missing index.html or app-v2.js');

let html=fs.readFileSync(indexPath,'utf8');
const seriesTab=/<button class="tab-v2" data-view="series" type="button">Série(?: a témata)?<\/button>/;
if(!seriesTab.test(html))throw new Error('Series tab marker in index.html was not found');
html=html.replace(seriesTab,'<button class="tab-v2" data-view="series" type="button">Série a témata</button>');

const appHash=crypto.createHash('sha256').update(fs.readFileSync(appPath)).digest('hex').slice(0,12);
const appScript=/<script src="\.\/app-v2\.js(?:\?v=[0-9a-f]+)?" defer><\/script>/;
if(!appScript.test(html))throw new Error('app-v2.js script marker in index.html was not found');
const versionedAppScript=`<script src="./app-v2.js?v=${appHash}" defer></script>`;
html=html.replace(appScript,versionedAppScript);

const summaryOpenState=`<script id="v2-summary-open-state">
(()=>{
  const root=document.getElementById('episodes-v2');
  if(!root||!('MutationObserver' in window))return;
  const selector='details.episode-summary-v2';
  const openEpisodes=new Set();
  const episodeOf=details=>details.closest('article[data-episode]')?.dataset.episode||'';
  const remember=details=>{
    if(!(details instanceof Element)||!details.matches(selector))return;
    const episode=episodeOf(details);if(!episode)return;
    if(details.open)openEpisodes.add(episode);else openEpisodes.delete(episode);
  };
  const restore=node=>{
    if(!(node instanceof Element))return;
    const summaries=[];
    if(node.matches(selector))summaries.push(node);
    summaries.push(...node.querySelectorAll(selector));
    for(const details of summaries){const episode=episodeOf(details);if(episode&&openEpisodes.has(episode))details.open=true}
  };
  root.querySelectorAll(selector+'[open]').forEach(remember);
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='attributes'){remember(record.target);continue}
      for(const node of record.addedNodes)restore(node);
    }
  }).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
})();
</script>`;
if(html.includes('id="v2-summary-open-state"')){
  html=html.replace(/<script id="v2-summary-open-state">[\s\S]*?<\/script>/,summaryOpenState);
}else{
  html=html.replace(versionedAppScript,`${versionedAppScript}\n${summaryOpenState}`);
}

const swBootstrap=/<script>\s*\(\(\)=>\{if\(!\('serviceWorker' in navigator\)\)return;window\.addEventListener\('load',\(\)=>\{navigator\.serviceWorker\.register\('\.\/sw\.js',\{scope:'\.\/'\}\)\.then\(reg=>reg\.update\(\)\)\.catch\(err=>console\.warn\('SW registration failed',err\)\);\}\);\}\)\(\);\s*<\/script>/;
const productionBootstrap=`<script id="v2-service-worker-bootstrap">
(()=>{
  if(!('serviceWorker' in navigator))return;
  const CHECK_INTERVAL=30*60*1000;
  const MIN_CHECK_GAP=60*1000;
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      const safeUpdate=()=>reg.update().catch(err=>console.warn('SW update check failed',err));
      await safeUpdate();
      let lastCheck=Date.now();
      const check=()=>{
        const now=Date.now();
        if(now-lastCheck<MIN_CHECK_GAP)return;
        lastCheck=now;
        safeUpdate();
      };
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
      window.addEventListener('online',check);
      window.addEventListener('pageshow',check);
      setInterval(safeUpdate,CHECK_INTERVAL);
    }catch(err){console.warn('SW registration failed',err)}
  });
})();
</script>`;
if(html.includes('id="v2-service-worker-bootstrap"')){
  html=html.replace(/<script id="v2-service-worker-bootstrap">[\s\S]*?<\/script>/,productionBootstrap);
}else{
  if(!swBootstrap.test(html))throw new Error('Service worker bootstrap marker in index.html was not found');
  html=html.replace(swBootstrap,productionBootstrap);
}

fs.writeFileSync(indexPath,html);
console.log(`Prepared production index (app-v2.js?v=${appHash}).`);
