(()=>{
  if(window.__vedatorViewLayoutFix)return;
  window.__vedatorViewLayoutFix=true;

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

  tabs.addEventListener('click',()=>setTimeout(sync,0));
  new MutationObserver(sync).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  sync();

  const PLAYLIST_KEY='vedator-user-playlists-v1';
  const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const loadPlaylists=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(PLAYLIST_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch{return []}
  };
  const episodeList=()=>{try{return Array.isArray(episodes)?episodes:[]}catch{return []}};
  const episodeId=episode=>String(episode?.id||episode?.number||episode?.title||'');
  const encodeNumber=value=>Number.isInteger(value)&&value>=0&&value<4096
    ? ALPHABET[(value>>6)&63]+ALPHABET[value&63]
    : '';
  const decodeNumber=value=>typeof value==='string'&&value.length===2
    ? ((ALPHABET.indexOf(value[0])<<6)|ALPHABET.indexOf(value[1]))
    : -1;
  const normalizeReference=value=>{
    if(typeof value==='string'&&value.length===2&&decodeNumber(value)>=0)return value;
    const episode=episodeList().find(item=>episodeId(item)===String(value));
    return episode?encodeNumber(Number(episode.number)):'';
  };
  function base64Encode(value){
    const bytes=new TextEncoder().encode(value);
    let binary='';
    bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function playlistUrl(playlist){
    const items=(playlist.items||[]).map(normalizeReference).filter(Boolean).join('');
    const payload=base64Encode(JSON.stringify({v:3,n:playlist.name,x:items}));
    const url=new URL(location.href);
    url.hash=`playlist=${payload}`;
    return url.href;
  }
  async function shareUrlOnly(playlist){
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
    void shareUrlOnly(playlist);
  },true);
})();