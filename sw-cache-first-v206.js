(()=>{
  if(self.__vedatorCacheFirstV206)return;
  self.__vedatorCacheFirstV206=true;

  const nativeFetch=self.fetch.bind(self);
  const NETWORK_ONLY=new Set([
    'sw-fast.js','sw.js','sw-boot-v205-patch.js','sw-v204-overlay.js',
    'sw-346-patch.js','sw-cache-first-v206.js','direct-app-loader.js',
    'first-load-recovery.js','episodes.json','index.html'
  ]);

  const fileName=url=>url.pathname.split('/').pop();
  const isReusableAsset=(request,url)=>{
    if(request.method!=='GET'||url.origin!==self.location.origin)return false;
    const name=fileName(url);
    if(!name||NETWORK_ONLY.has(name))return false;
    return request.destination==='script'||request.destination==='style'||
      /\.(?:js|css|webmanifest)$/i.test(url.pathname);
  };

  self.fetch=async function(input,init){
    let request;
    let url;
    try{
      request=input instanceof Request?input:new Request(input,init);
      url=new URL(request.url,self.location.href);
    }catch{
      return nativeFetch(input,init);
    }

    if(!isReusableAsset(request,url))return nativeFetch(input,init);

    try{
      const cached=await caches.match(request,{ignoreSearch:true});
      if(cached)return cached;
    }catch{}

    return nativeFetch(input,init);
  };
})();
