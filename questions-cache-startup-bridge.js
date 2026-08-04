(()=>{
  if(window.__vedatorQuestionCacheStartupBridge)return;
  window.__vedatorQuestionCacheStartupBridge=true;

  const CACHE_VERSION='q719-20260804-v1';
  const CACHE_PREFIX=`vedatorQuestionEpisodeCache:${CACHE_VERSION}:`;
  const FAQ=new Set([340,337,332,326,319,313,300,295,289,284,278,272,270,263,257,248,244,226,218,211,203,190,179,170,158,143,138,133,128,119,112,100,89,82,75,69,60,51,35,26,17]);
  const PREROLL=5;

  function language(){
    try{
      const value=String(window.vedatorUiLanguage?.()||'').toLowerCase();
      if(value==='sk'||value.startsWith('sk'))return'sk';
      if(value==='cz'||value==='cs'||value.startsWith('cs'))return'cz';
    }catch{}
    try{
      const stored=String(localStorage.getItem('vedator-ui-language-v1')||localStorage.getItem('vedator-ui-language')||'').toLowerCase();
      if(stored.startsWith('sk'))return'sk';
      if(stored.startsWith('cz')||stored.startsWith('cs'))return'cz';
    }catch{}
    return String(document.documentElement.lang||'cs').toLowerCase().startsWith('sk')?'sk':'cz';
  }

  function episodeNumber(article){
    if(!(article instanceof HTMLElement)||!article.hidden)return 0;
    const heading=article.querySelector('h2')?.textContent||'';
    const number=Number(heading.match(/\bpodcast\s+(\d+)\b/i)?.[1]||0);
    return FAQ.has(number)?number:0;
  }

  function validItems(value,episode){
    if(!Array.isArray(value)||!value.length)return null;
    const items=[];
    for(let index=0;index<value.length;index++){
      const item=value[index];
      if(!item||typeof item!=='object'||!Array.isArray(item.points))return null;
      items.push({
        episode:Number(episode),
        order:Number.isFinite(Number(item.order))?Number(item.order):index,
        time:String(item.time||'0:00'),
        endRaw:item.endRaw==null?null:String(item.endRaw),
        title:String(item.title||`Otázka ${index+1}`),
        points:item.points.map(point=>String(point||'').trim()).filter(Boolean)
      });
    }
    return items;
  }

  function readCache(episode){
    const lang=language();
    const key=`${CACHE_PREFIX}${lang}:${episode}`;
    try{
      const saved=JSON.parse(localStorage.getItem(key)||'null');
      if(saved?.version!==CACHE_VERSION||saved?.language!==lang||Number(saved?.episode)!==Number(episode))return null;
      return validItems(saved.items,episode);
    }catch{return null}
  }

  function hydrate(article,items){
    if(!article||article.querySelector('.summary-block')||!items?.length)return false;
    const details=document.createElement('details');
    details.className='episode-summary';
    const summary=document.createElement('summary');
    summary.textContent='Shrnutí dílu';
    const body=document.createElement('div');
    body.className='episode-summary-body';

    for(const item of items){
      const block=document.createElement('div');
      block.className='summary-block';
      if(item.endRaw!=null)block.dataset.end=item.endRaw;
      const time=document.createElement('div');
      time.className='summary-time';
      time.textContent=item.time;
      time.dataset.vedatorPreroll=String(PREROLL);
      const title=document.createElement('div');
      title.className='summary-title';
      title.textContent=item.title;
      const list=document.createElement('ul');
      for(const point of item.points){
        const li=document.createElement('li');
        li.textContent=point;
        list.appendChild(li);
      }
      block.append(time,title,list);
      body.appendChild(block);
    }
    details.append(summary,body);
    article.appendChild(details);
    article.dataset.vedatorQuestionCacheHit='1';
    return true;
  }

  function hydrateAddedNode(container,node){
    if(!(container instanceof HTMLElement)||container.id!=='episodes')return;
    if(!(node instanceof HTMLElement)||!node.matches('article')||!node.hidden)return;
    const episode=episodeNumber(node);
    if(!episode||episode===300)return;
    const cached=readCache(episode);
    if(cached)hydrate(node,cached);
  }

  if(!Element.prototype.__vedatorQuestionCacheSyncAppend){
    const nativeAppend=Element.prototype.append;
    Object.defineProperty(Element.prototype,'__vedatorQuestionCacheSyncAppend',{value:true,configurable:true});
    Element.prototype.append=function(...nodes){
      const result=nativeAppend.apply(this,nodes);
      for(const node of nodes)hydrateAddedNode(this,node);
      return result;
    };
  }

  if(!Node.prototype.__vedatorQuestionCacheSyncAppendChild){
    const nativeAppendChild=Node.prototype.appendChild;
    Object.defineProperty(Node.prototype,'__vedatorQuestionCacheSyncAppendChild',{value:true,configurable:true});
    Node.prototype.appendChild=function(node){
      const result=nativeAppendChild.call(this,node);
      hydrateAddedNode(this,node);
      return result;
    };
  }
})();
