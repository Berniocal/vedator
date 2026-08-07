(()=>{
  if(window.__vedatorOfflineAudio)return;
  window.__vedatorOfflineAudio=true;

  const CACHE='vedator-offline-audio-v1';
  const INDEX_KEY='vedatorOfflineAudioIndexV1';
  const CLEAR_NOTICE_KEY='vedatorDataClearedNoticeV1';
  let index=loadIndex();
  let verifyStarted=false;

  function loadIndex(){
    try{
      const value=JSON.parse(localStorage.getItem(INDEX_KEY)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {}}
  }
  function persistIndex(){
    try{localStorage.setItem(INDEX_KEY,JSON.stringify(index))}catch{}
  }
  function absoluteUrl(value){
    try{return new URL(value,location.href).href}catch{return String(value||'')}
  }
  function episodeNumber(title){
    const match=String(title||'').match(/\bpodcast\s+(\d+)\b/i);
    return match?Number(match[1]):0;
  }
  function episodeKey(title,url){
    const number=episodeNumber(title);
    if(number)return `episode-${number}`;
    const text=absoluteUrl(url);
    let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
    return `audio-${(hash>>>0).toString(36)}`;
  }
  function cacheUrlFor(key){
    return new URL(`./__vedator_offline_audio__/${encodeURIComponent(key)}.mp3`,location.href).href;
  }
  function getEpisodes(){
    try{return Array.isArray(episodes)?episodes:[]}catch{return []}
  }
  function episodeFor(title,url){
    const raw=absoluteUrl(url);
    const number=episodeNumber(title);
    return getEpisodes().find(item=>
      (raw&&absoluteUrl(item.enclosure)===raw)||
      (number&&Number(item.number)===number)
    )||null;
  }
  function recordFor(title,url){
    const raw=absoluteUrl(url);
    const number=episodeNumber(title);
    if(number&&index[`episode-${number}`])return index[`episode-${number}`];
    return Object.values(index).find(record=>record&&(
      (raw&&absoluteUrl(record.originalUrl)===raw)||
      (raw&&absoluteUrl(record.cacheUrl)===raw)
    ))||null;
  }
  function currentInfo(){
    const card=document.querySelector('.vedator-audio-card');
    const audio=card?.querySelector('audio');
    const title=card?.querySelector('.vedator-audio-card__title')?.textContent?.trim()||'';
    const current=audio?.currentSrc||audio?.src||'';
    const stored=recordFor(title,current);
    if(stored)return {audio,title,episode:episodeFor(title,stored.originalUrl),record:stored,originalUrl:stored.originalUrl};
    const episode=episodeFor(title,current);
    const originalUrl=episode?.enclosure||current;
    return {audio,title,episode,record:recordFor(title,originalUrl),originalUrl};
  }
  function formatMb(bytes){
    return `${(Number(bytes||0)/1048576).toFixed(1).replace('.',',')} MB`;
  }
  async function fetchBlob(url,onProgress){
    const response=await fetch(url,{mode:'cors',cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const total=Number(response.headers.get('content-length'))||0;
    const type=response.headers.get('content-type')||'audio/mpeg';
    const reader=response.body?.getReader();
    let loaded=0,blob;
    if(reader){
      const chunks=[];
      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        chunks.push(value);
        loaded+=value.byteLength;
        onProgress?.(loaded,total);
      }
      blob=new Blob(chunks,{type});
    }else{
      blob=await response.blob();
      loaded=blob.size;
      onProgress?.(loaded,total||loaded);
    }
    return {blob,type,total:loaded||blob.size};
  }
  async function verifyIndex(){
    if(verifyStarted)return;
    verifyStarted=true;
    try{
      const cache=await caches.open(CACHE);
      let changed=false;
      for(const [key,record] of Object.entries(index)){
        if(!record?.cacheUrl||!(await cache.match(record.cacheUrl))){
          delete index[key];
          changed=true;
        }
      }
      if(changed)persistIndex();
    }catch{}
    syncButton();
  }
  function sourceFor(title,url){
    const record=recordFor(title,url);
    return record?.cacheUrl||url;
  }
  window.__vedatorOfflineSource=sourceFor;

  const style=document.createElement('style');
  style.textContent=`
    .vedator-custom-secondary{grid-template-columns:repeat(3,minmax(0,1fr))!important}
    .vedator-offline-btn.saved{border-color:#86c79a}
    html.theme-dark .vedator-offline-btn.saved{border-color:#4ade80}
    @media(max-width:550px){
      .vedator-custom-secondary{gap:7px!important}
      .vedator-custom-secondary .vedator-custom-btn{font-size:.78rem!important;padding-left:3px!important;padding-right:3px!important}
    }
  `;
  document.head.appendChild(style);

  function ensureButton(){
    const secondary=document.querySelector('.vedator-custom-secondary');
    if(!secondary)return false;
    let button=secondary.querySelector('.vedator-offline-btn');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='vedator-custom-btn vedator-offline-btn';
      button.innerHTML='<span>📱</span><span class="vedator-offline-label">Uložit offline</span>';
      const download=secondary.querySelector('.download');
      secondary.insertBefore(button,download||secondary.firstChild);
      button.addEventListener('click',handleOfflineClick);
    }
    const downloadLabel=secondary.querySelector('.download-label');
    if(downloadLabel&&['Stáhnout','Stiahnuť'].includes(downloadLabel.textContent.trim()))downloadLabel.textContent='MP3';
    if(downloadLabel&&!downloadLabel.__vedatorOfflineObserver){
      downloadLabel.__vedatorOfflineObserver=true;
      new MutationObserver(()=>{
        if(['Stáhnout','Stiahnuť'].includes(downloadLabel.textContent.trim()))downloadLabel.textContent='MP3';
      }).observe(downloadLabel,{childList:true,characterData:true,subtree:true});
    }
    syncButton();
    return true;
  }
  function setHelp(text){
    const help=document.querySelector('.vedator-audio-card__help');
    if(help)help.textContent=text;
  }
  function syncButton(){
    const button=document.querySelector('.vedator-offline-btn');
    if(!button)return;
    const label=button.querySelector('.vedator-offline-label');
    const info=currentInfo();
    const saved=Boolean(info.record);
    button.classList.toggle('saved',saved);
    button.disabled=false;
    if(label)label.textContent=saved?'✓ Offline':'Uložit offline';
    button.title=saved?'Epizoda je uložená pro poslech bez internetu':'Uložit epizodu do této aplikace pro poslech bez internetu';
  }

  async function saveCurrent(button,info){
    const label=button.querySelector('.vedator-offline-label');
    const originalUrl=absoluteUrl(info.episode?.enclosure||info.originalUrl);
    if(!originalUrl||originalUrl.includes('/__vedator_offline_audio__/')){
      setHelp('Zdroj této epizody se nepodařilo určit.');
      return;
    }
    const title=info.episode?.title||info.title||'Vedátorský podcast';
    const key=episodeKey(title,originalUrl);
    const cacheUrl=cacheUrlFor(key);
    button.disabled=true;
    if(label)label.textContent='Připravuji…';
    try{
      try{await navigator.storage?.persist?.()}catch{}
      const {blob,type}=await fetchBlob(originalUrl,(loaded,total)=>{
        if(label){
          if(total)label.textContent=`${Math.min(99,Math.floor(loaded/total*100))} %`;
          else label.textContent=formatMb(loaded);
        }
        if(total)setHelp(`Ukládám offline: ${formatMb(loaded)} z ${formatMb(total)}.`);
        else setHelp(`Ukládám offline: ${formatMb(loaded)}.`);
      });
      const cache=await caches.open(CACHE);
      const headers=new Headers({
        'Content-Type':type||blob.type||'audio/mpeg',
        'Content-Length':String(blob.size),
        'Accept-Ranges':'bytes',
        'X-Vedator-Original-Url':originalUrl
      });
      await cache.put(cacheUrl,new Response(blob,{status:200,headers}));
      index[key]={
        key,
        title,
        number:Number(info.episode?.number)||episodeNumber(title)||0,
        originalUrl,
        cacheUrl,
        size:blob.size,
        type:type||blob.type||'audio/mpeg',
        savedAt:Date.now()
      };
      persistIndex();
      setHelp(`Epizoda je uložená offline (${formatMb(blob.size)}).`);
    }catch(error){
      console.warn('Offline uložení se nepodařilo',error);
      if(error?.name==='QuotaExceededError')setHelp('Pro offline uložení není v zařízení dostatek místa.');
      else setHelp('Offline uložení se nepodařilo. Zkontrolujte připojení a zkuste to znovu.');
    }finally{
      button.disabled=false;
      syncButton();
    }
  }

  async function removeCurrent(button,record){
    const approved=confirm('Smazat offline kopii této epizody?\n\nPokud ji právě přehráváte bez internetu, přehrávání se může zastavit.');
    if(!approved)return;
    const label=button.querySelector('.vedator-offline-label');
    button.disabled=true;
    if(label)label.textContent='Mažu…';
    try{
      const cache=await caches.open(CACHE);
      await cache.delete(record.cacheUrl);
      delete index[record.key];
      persistIndex();
      setHelp('Offline kopie byla smazána. Epizodu lze dál přehrávat přes internet.');
    }catch(error){
      console.warn('Offline kopii se nepodařilo smazat',error);
      setHelp('Offline kopii se nepodařilo smazat.');
    }finally{
      button.disabled=false;
      syncButton();
    }
  }

  async function handleOfflineClick(){
    const button=this;
    const info=currentInfo();
    if(info.record)return removeCurrent(button,info.record);
    return saveCurrent(button,info);
  }

  // Window capture proběhne před stávajícím document-capture přehrávačem.
  // Odkaz změníme jen po dobu jednoho kliknutí a hned jej vrátíme zpět.
  window.addEventListener('click',event=>{
    const play=event.target?.closest?.('.links .primary');
    if(!play)return;
    const raw=play.getAttribute('href')||play.dataset.url||'';
    if(!raw)return;
    const title=play.closest('article')?.querySelector('h2')?.textContent?.trim()||'';
    const offline=sourceFor(title,raw);
    if(!offline||offline===raw)return;
    play.setAttribute('href',offline);
    queueMicrotask(()=>{
      if(play.isConnected)play.setAttribute('href',raw);
    });
  },true);

  // „Smazat veškerá data“ už používá tento marker. Proto smažeme i velkou
  // offline cache, ale do existujícího data-backup.js nemusíme zasahovat.
  if(sessionStorage.getItem(CLEAR_NOTICE_KEY)==='1'){
    index={};
    try{localStorage.removeItem(INDEX_KEY)}catch{}
    caches.delete(CACHE).catch(()=>{});
  }

  if(!ensureButton()){
    const observer=new MutationObserver(()=>{if(ensureButton())observer.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  const titleNode=document.querySelector('.vedator-audio-card__title');
  if(titleNode)new MutationObserver(syncButton).observe(titleNode,{childList:true,characterData:true,subtree:true});
  window.addEventListener('vedatorlanguagechange',syncButton);
  verifyIndex();
})();