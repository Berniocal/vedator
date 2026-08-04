(()=>{
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
  importScripts('./sw-346-patch.js');
  importScripts('./sw.js');
})();
