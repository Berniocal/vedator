(()=>{
  const VEDATOR_SW_WRAPPER_VERSION='v204-layout-2';
  const VEDATOR_BOOTSTRAP_VERSION='v204-reload-fix-1';
  const HAD_ACTIVE_WORKER=Boolean(self.registration.active);
  self.__vedatorSwWrapperVersion=VEDATOR_SW_WRAPPER_VERSION;
  self.__vedatorBootstrapVersion=VEDATOR_BOOTSTRAP_VERSION;

  const INSTALL_UI_FILES=['./theme-toggle.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
  const originalAddAll=typeof Cache!=='undefined'?Cache.prototype.addAll:null;
  if(originalAddAll){
    const CORE_FILES=new Set(['index.html','manifest.webmanifest','icon.svg','theme-toggle.js','icon-192.png','icon-512.png']);
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

  const nativeAddEventListener=self.addEventListener.bind(self);
  const bootstrapKey=`vedator-bootstrap-${VEDATOR_BOOTSTRAP_VERSION}`;

  function responseFrom(response,body){
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-store');
    return new Response(body,{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }

  function removeAutomaticUpdater(html){
    const marker='window.__vedatorSwUpdater';
    const markerAt=html.indexOf(marker);
    if(markerAt<0)return html;
    const start=html.lastIndexOf('<script>',markerAt);
    const end=html.indexOf('</script>',markerAt);
    if(start<0||end<0)return html;
    return html.slice(0,start)+html.slice(end+'</script>'.length);
  }

  async function stabilizePageResponse(response){
    if(!response)return response;
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes('text/html'))return response;
    let html=await response.text();
    html=html.replace(/navigator\.serviceWorker\.register\((['"])(?:\.\/)?sw\.js\1\)/g,"navigator.serviceWorker.register('sw-fast.js')");
    html=removeAutomaticUpdater(html);
    if(!html.includes('data-vedator-bootstrap-ready')){
      const marker=`<script data-vedator-bootstrap-ready>try{localStorage.setItem(${JSON.stringify(bootstrapKey)},'1')}catch{}</script>`;
      html=html.replace('</head>',marker+'</head>');
    }
    return responseFrom(response,html);
  }

  self.addEventListener=function(type,listener,options){
    // Aktivaci řídí obal níže. Původní vrstvy by jinak převzaly otevřenou
    // stránku a poslaly několik zpráv, na které starší verze reaguje reloadem.
    if(type==='activate')return;
    if(type==='fetch'){
      return nativeAddEventListener('fetch',event=>{
        const wrappedEvent={
          request:event.request,
          respondWith(value){
            event.respondWith(Promise.resolve(value).then(stabilizePageResponse));
          }
        };
        return listener.call(self,wrappedEvent);
      },options);
    }
    return nativeAddEventListener(type,listener,options);
  };

  importScripts('./sw-v204-overlay.js');
  importScripts('./sw-346-patch.js');
  importScripts('./sw.js');
  self.addEventListener=nativeAddEventListener;

  nativeAddEventListener('install',event=>event.waitUntil(
    caches.open('vedator-temata-v203').then(cache=>cache.addAll(INSTALL_UI_FILES))
  ));

  nativeAddEventListener('activate',event=>event.waitUntil((async()=>{
    const keep='vedator-temata-v203';
    await Promise.all((await caches.keys()).filter(name=>name!==keep).map(name=>caches.delete(name)));
    // Při úplně první instalaci musí worker převzít stránku, aby následoval
    // jediný bootstrap reload. Při aktualizaci nechá rozehraný podcast doběhnout
    // a nová verze se použije až při příštím otevření nebo ručním obnovení.
    if(!HAD_ACTIVE_WORKER)await self.clients.claim();
  })()));
})();