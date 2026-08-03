(()=>{
  if(window.__vedatorViewLayoutFix)return;
  window.__vedatorViewLayoutFix=true;

  const PLAYLIST_KEY='vedator-user-playlists-v1';
  const PLAYLIST_HASH='playlist';
  const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const topics=document.querySelector('#topics');
  const tabs=document.querySelector('.tabs');
  if(!topics||!tabs)return;

  function isEpisodesTab(tab){
    if(!tab)return false;
    const view=String(tab.dataset.view||'').toLowerCase();
    const text=String(tab.textContent||'').trim().toLowerCase();
    return view==='episodes'||text==='epizódy'||text==='epizody';
  }

  function sync(){
    const show=isEpisodesTab(tabs.querySelector('.tab.active'));
    topics.classList.toggle('hidden',!show);
    topics.hidden=!show;
    topics.style.display=show?'':'none';
    topics.setAttribute('aria-hidden',String(!show));
  }

  tabs.addEventListener('click',()=>queueMicrotask(sync));
  new MutationObserver(sync).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  sync();

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const encodeNumber=value=>Number.isInteger(value)&&value>=0&&value<4096
    ? ALPHABET[(value>>6)&63]+ALPHABET[value&63]
    : '';
  const decodeNumber=value=>typeof value==='string'&&value.length===2
    ? ((ALPHABET.indexOf(value[0])<<6)|ALPHABET.indexOf(value[1]))
    : -1;
  const isReference=value=>typeof value==='string'&&value.length===2&&decodeNumber(value)>=0;
  const episodeList=()=>{try{return Array.isArray(episodes)?episodes:[]}catch(_){return[]}};
  const episodeId=episode=>String(episode?.id||episode?.number||episode?.title||'');
  const normalizeReference=value=>{
    if(isReference(value))return value;
    const episode=episodeList().find(item=>episodeId(item)===String(value));
    return episode?encodeNumber(Number(episode.number)):'';
  };
  const loadPlaylists=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(PLAYLIST_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch(_){return[]}
  };
  const savePlaylists=value=>localStorage.setItem(PLAYLIST_KEY,JSON.stringify(value));
  const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+Math.random().toString(36).slice(2);

  function base64Encode(value){
    const bytes=new TextEncoder().encode(value);
    let binary='';
    bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function base64Decode(value){
    let source=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
    while(source.length%4)source+='=';
    return new TextDecoder().decode(Uint8Array.from(atob(source),character=>character.charCodeAt(0)));
  }

  function playlistUrl(playlist){
    const items=(playlist.items||[]).map(normalizeReference).filter(Boolean).join('');
    const payload=base64Encode(JSON.stringify({v:3,n:playlist.name,x:items}));
    const url=new URL(location.href);
    url.hash=`${PLAYLIST_HASH}=${payload}`;
    return url.href;
  }

  async function shareOnlyUrl(playlist){
    const url=playlistUrl(playlist);
    try{
      if(navigator.share){
        await navigator.share({url});
        return;
      }
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(url);
        alert('Odkaz byl zkopírován.');
        return;
      }
    }catch(error){
      if(error?.name==='AbortError')return;
    }
    prompt('Zkopírujte odkaz:',url);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.vedator-playlist-icon.share');
    if(!button)return;
    const card=button.closest('[data-id]');
    const playlist=loadPlaylists().find(item=>String(item.id)===String(card?.dataset.id));
    if(!playlist)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void shareOnlyUrl(playlist);
  },true);

  function playlistParameter(){
    const raw=location.hash.replace(/^#/,'');
    if(!raw)return '';
    return new URLSearchParams(raw).get(PLAYLIST_HASH)||'';
  }

  function clearPlaylistParameter(){
    const params=new URLSearchParams(location.hash.replace(/^#/,''));
    params.delete(PLAYLIST_HASH);
    const hash=params.toString();
    history.replaceState(null,'',location.pathname+location.search+(hash?`#${hash}`:''));
  }

  function decodedPlaylist(payload){
    const data=JSON.parse(base64Decode(payload));
    let items=[];
    if(data?.v===3&&typeof data.x==='string'&&data.x.length%2===0){
      for(let index=0;index<data.x.length;index+=2)items.push(data.x.slice(index,index+2));
    }else if(data?.v===2&&typeof data.e==='string'&&data.e.length%2===0){
      for(let index=0;index<data.e.length;index+=2)items.push(data.e.slice(index,index+2));
    }else if(Array.isArray(data?.i)){
      items=data.i.map(normalizeReference).filter(Boolean);
    }else throw new Error('Neplatný formát playlistu.');
    return {name:String(data.n||'Sdílený playlist').trim()||'Sdílený playlist',items};
  }

  function openPlaylists(){
    const open=()=>{
      const tab=tabs.querySelector('.tab[data-view="playlists"]');
      if(!tab)return false;
      tab.click();
      return true;
    };
    if(open())return;
    const observer=new MutationObserver(()=>{if(open())observer.disconnect()});
    observer.observe(tabs,{childList:true,subtree:true});
  }

  let processingPayload='';
  async function importSharedPlaylist(){
    const payload=playlistParameter();
    if(!payload||payload===processingPayload)return;
    processingPayload=payload;
    clearPlaylistParameter();
    try{
      const shared=decodedPlaylist(payload);
      const approved=confirm(`Přidat sdílený playlist „${shared.name}“ do aplikace?`);
      if(!approved)return;
      const playlists=loadPlaylists();
      let finalName=shared.name;
      let suffix=2;
      while(playlists.some(item=>normalize(item.name)===normalize(finalName))){
        finalName=`${shared.name} (${suffix++})`;
      }
      playlists.push({id:uid(),name:finalName,items:shared.items});
      savePlaylists(playlists);
      openPlaylists();
    }catch(error){
      console.warn('Neplatný playlistový odkaz',error);
      alert('Tento odkaz neobsahuje platný playlist.');
    }finally{
      processingPayload='';
    }
  }

  window.addEventListener('hashchange',()=>void importSharedPlaylist());
  window.addEventListener('pageshow',()=>void importSharedPlaylist());
  window.addEventListener('focus',()=>void importSharedPlaylist());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void importSharedPlaylist()});
  queueMicrotask(()=>void importSharedPlaylist());
})();
