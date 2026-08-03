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

  const runWhenIdle=(callback,timeout=1500)=>{
    if('requestIdleCallback'in window)return requestIdleCallback(callback,{timeout});
    return setTimeout(()=>callback({didTimeout:true,timeRemaining:()=>0}),90);
  };

  function createSeriesBody(group){
    const body=document.createElement('div');
    body.className='series-body';
    const list=document.createElement('ol');
    const fragment=document.createDocumentFragment();
    for(const episode of group.items||[]){
      const item=document.createElement('li');
      const link=document.createElement('a');
      link.href=episode.link||episode.enclosure||'#';
      link.target='_blank';
      link.rel='noopener';
      if(group.people){
        const person=document.createElement('span');
        person.className='person-name';
        person.textContent=episode.person||'';
        const title=document.createElement('span');
        title.className='episode-title';
        title.textContent=episode.title||'';
        link.append(person,title);
      }else link.textContent=episode.title||'';
      item.appendChild(link);
      fragment.appendChild(item);
    }
    list.appendChild(fragment);
    body.appendChild(list);
    return body;
  }

  let seriesPreloadGeneration=0;
  function preloadSeriesBodies(){
    const box=document.querySelector('#series');
    if(!box||typeof seriesGroups!=='function')return;
    let groups=[];
    try{groups=seriesGroups()}catch{return}
    const byName=new Map(groups.map(group=>[String(group.name),group]));
    const queue=[...box.querySelectorAll('.series-card')]
      .filter(card=>card.dataset.loaded!=='1'&&!card.querySelector('.series-body'))
      .map(card=>({
        card,
        group:byName.get(card.querySelector('summary span')?.textContent?.trim()||'')
      }))
      .filter(item=>item.group);
    if(!queue.length)return;

    const generation=++seriesPreloadGeneration;
    let index=0;
    const step=()=>runWhenIdle(()=>{
      if(generation!==seriesPreloadGeneration)return;
      const item=queue[index++];
      if(item?.card.isConnected&&item.card.dataset.loaded!=='1'&&!item.card.querySelector('.series-body')){
        item.card.dataset.loaded='1';
        item.card.appendChild(createSeriesBody(item.group));
      }
      if(index<queue.length)step();
      else{
        window.__vedatorDecorateCollections?.();
        window.dispatchEvent(new Event('vedatorcontentchange'));
      }
    });
    step();
  }

  function installSeriesPreload(){
    const box=document.querySelector('#series');
    if(!box||box.dataset.vedatorBackgroundPreload==='1')return;
    box.dataset.vedatorBackgroundPreload='1';
    let pending=false;
    const schedule=()=>{
      if(pending)return;
      pending=true;
      queueMicrotask(()=>{
        pending=false;
        ++seriesPreloadGeneration;
        preloadSeriesBodies();
      });
    };
    new MutationObserver(schedule).observe(box,{childList:true});
    schedule();
  }

  function triggerPlaylistLoader(card){
    if(!card||card.dataset.loaded==='1'||card.dataset.loading==='1')return;
    let ownDescriptor;
    try{
      ownDescriptor=Object.getOwnPropertyDescriptor(card,'open');
      Object.defineProperty(card,'open',{configurable:true,get:()=>true,set:()=>{}});
      card.dispatchEvent(new Event('toggle'));
    }catch{
      const wasOpen=card.open;
      card.open=true;
      card.dispatchEvent(new Event('toggle'));
      card.open=wasOpen;
    }finally{
      try{
        if(ownDescriptor)Object.defineProperty(card,'open',ownDescriptor);
        else delete card.open;
      }catch{}
    }
  }

  function afterPlaylistLoad(card,callback){
    if(card.dataset.loaded==='1'||card.dataset.loading!=='1'){
      callback();
      return;
    }
    let finished=false;
    const finish=()=>{
      if(finished)return;
      finished=true;
      observer.disconnect();
      clearTimeout(timeout);
      callback();
    };
    const observer=new MutationObserver(()=>{
      if(card.dataset.loaded==='1'||card.dataset.loading!=='1')finish();
    });
    observer.observe(card,{attributes:true,attributeFilter:['data-loaded','data-loading']});
    const timeout=setTimeout(finish,20000);
  }

  let playlistPreloadGeneration=0;
  function preloadPlaylistBodies(list){
    const playlists=loadPlaylists();
    const byId=new Map(playlists.map(playlist=>[String(playlist.id),playlist]));
    const queue=[...list.querySelectorAll('.vedator-playlist-card')]
      .filter(card=>card.dataset.loaded!=='1'&&card.dataset.loading!=='1')
      .map(card=>{
        const playlist=byId.get(String(card.dataset.id));
        const refs=(playlist?.items||[]).map(normalizeReference).filter(Boolean);
        return {card,playlist,hasQuestions:refs.some(ref=>decodeNumber(ref)>=2048)};
      })
      .filter(item=>item.playlist)
      .sort((a,b)=>Number(a.hasQuestions)-Number(b.hasQuestions));
    if(!queue.length)return;

    const generation=++playlistPreloadGeneration;
    let index=0;
    const step=()=>runWhenIdle(()=>{
      if(generation!==playlistPreloadGeneration)return;
      const item=queue[index++];
      if(!item?.card.isConnected){
        if(index<queue.length)step();
        return;
      }
      triggerPlaylistLoader(item.card);
      afterPlaylistLoad(item.card,()=>{
        if(generation!==playlistPreloadGeneration)return;
        if(index<queue.length)step();
        else{
          window.__vedatorDecorateCollections?.();
          window.dispatchEvent(new Event('vedatorcontentchange'));
        }
      });
    },2200);
    step();
  }

  function installPlaylistPreload(){
    const list=document.querySelector('.vedator-playlist-list');
    if(!list||list.dataset.vedatorBackgroundPreload==='1')return false;
    list.dataset.vedatorBackgroundPreload='1';
    let pending=false;
    const schedule=()=>{
      if(pending)return;
      pending=true;
      queueMicrotask(()=>{
        pending=false;
        ++playlistPreloadGeneration;
        preloadPlaylistBodies(list);
      });
    };
    new MutationObserver(schedule).observe(list,{childList:true});
    schedule();
    return true;
  }

  installSeriesPreload();
  if(!installPlaylistPreload()){
    const observer=new MutationObserver(()=>{
      if(installPlaylistPreload())observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
})();