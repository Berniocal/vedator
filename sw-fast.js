(()=>{
  const VEDATOR_SW_WRAPPER_VERSION='v206';
  self.__vedatorSwWrapperVersion=VEDATOR_SW_WRAPPER_VERSION;

  const originalAddAll=typeof Cache!=='undefined'?Cache.prototype.addAll:null;
  if(originalAddAll){
    const CORE_FILES=new Set(['index.html','manifest.webmanifest','icon.svg']);
    Cache.prototype.addAll=function(requests){
      const core=[...(requests||[])].filter(request=>{
        try{
          const raw=typeof request==='string'?request:request.url;
          const url=new URL(raw,self.location.href);
          const name=url.pathname.split('/').pop();
          return url.pathname.endsWith('/vedator/')||CORE_FILES.has(name);
        }catch{return false}
      });
      return originalAddAll.call(this,core);
    };
  }
  importScripts('./sw-boot-v205-patch.js');
  importScripts('./sw-v204-overlay.js');
  importScripts('./sw-346-patch.js');
  importScripts('./sw-cache-first-v206.js');
  importScripts('./sw.js');
})();
