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
html=html.replace(appScript,`<script src="./app-v2.js?v=${appHash}" defer></script>`);

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
