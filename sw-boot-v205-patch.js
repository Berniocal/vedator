(()=>{
  if(self.__vedatorBootV206Patch)return;
  self.__vedatorBootV206Patch=true;

  const nativeFetch=self.fetch.bind(self);

  function responseFrom(response,body,contentType){
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    if(contentType)headers.set('content-type',contentType);
    return new Response(body,{status:response.status,statusText:response.statusText,headers});
  }

  function patchHtml(html){
    html=html.replace(
      "navigator.serviceWorker.register('sw.js')",
      "navigator.serviceWorker.register('./sw-fast.js')"
    );

    if(!html.includes('window.__vedatorDirectBoot=true')){
      const marker='<script>window.__vedatorDirectBoot=true;window.__vedatorSwUpdater=true;</script>';
      html=html.replace(
        '<script src="./first-load-recovery.js" defer></script>',
        `${marker}<script src="./first-load-recovery.js" defer></script>`
      );
    }

    if(!html.includes('direct-app-loader.js')){
      html=html.replace(
        '<script src="./first-load-recovery.js" defer></script>',
        '<script src="./first-load-recovery.js" defer></script><script src="./direct-app-loader.js?v=206" defer data-vedator-direct-loader="1"></script>'
      );
    }
    return html;
  }

  function patchRecovery(code){
    return code.replace(
      'setTimeout(recover,25);',
      'if(!window.__vedatorDirectBoot)setTimeout(recover,25);'
    );
  }

  self.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const raw=typeof input==='string'?input:input?.url;
      const url=new URL(raw,self.location.href);
      if(url.origin!==self.location.origin)return response;
      const type=response.headers.get('content-type')||'';
      const name=url.pathname.split('/').pop();
      if(type.includes('text/html'))return responseFrom(response,patchHtml(await response.text()),'text/html; charset=utf-8');
      if(name==='first-load-recovery.js')return responseFrom(response,patchRecovery(await response.text()),'application/javascript; charset=utf-8');
      return response;
    }catch{
      return response;
    }
  };
})();
