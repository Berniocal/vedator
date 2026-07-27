(()=>{
  if(window.__vedatorPlaylistPatch)return;
  window.__vedatorPlaylistPatch=true;

  const STORAGE_KEY='vedator-user-playlists-v1';
  const style=document.createElement('style');
  style.textContent=`
    .vedator-playlist-view{display:none}
    .vedator-playlist-view.active{display:block}
    .vedator-playlist-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0 12px}
    .vedator-playlist-add{width:44px;height:44px;border-radius:50%;border:0;background:var(--accent);color:#fff;font-size:1.8rem;line-height:1;cursor:pointer;font-weight:500;box-shadow:0 8px 20px rgba(91,75,219,.28)}
    .vedator-playlist-list{display:grid;gap:12px}
    .vedator-playlist-card{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.06)}
    .vedator-playlist-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
    .vedator-playlist-title{font-weight:800;flex:1}
    .vedator-playlist-count{color:var(--muted);font-size:.85rem}
    .vedator-playlist-delete,.vedator-playlist-remove{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:1.1rem;padding:6px}
    .vedator-playlist-items{list-style:none;margin:0;padding:6px 16px 12px}
    .vedator-playlist-item{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
    .vedator-playlist-item:last-child{border-bottom:0}
    .vedator-playlist-play{border:0;border-radius:10px;background:var(--accent);color:#fff;padding:8px 11px;font-weight:750;cursor:pointer}
    .vedator-add-to-playlist{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--accent);font-size:1.35rem;cursor:pointer;z-index:2}
    #episodes article{position:relative}
    .vedator-playlist-empty{padding:28px;text-align:center;color:var(--muted);background:var(--card);border:1px solid var(--line);border-radius:18px}
    @media(max-width:550px){.vedator-playlist-item{grid-template-columns:1fr auto}.vedator-playlist-remove{grid-column:2}.vedator-playlist-play{grid-row:1 / span 2;grid-column:2}}
  `;
  document.head.appendChild(style);

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function loadPlaylists(){
    try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[]}catch(error){return []}
  }
  function savePlaylists(value){localStorage.setItem(STORAGE_KEY,JSON.stringify(value))}
  function allEpisodes(){try{return typeof episodes!=='undefined'&&Array.isArray(episodes)?episodes:[]}catch(error){return []}}
  function episodeByTitle(title){return allEpisodes().find(e=>String(e.title||'').trim()===String(title||'').trim())||null}
  function episodeById(id){return allEpisodes().find(e=>String(e.id||e.number||e.title)===String(id))||null}
  function episodeId(e){return String(e.id||e.number||e.title)}

  const tabs=document.querySelector('.tabs');
  const episodesSection=document.querySelector('#episodes');
  const seriesSection=document.querySelector('#series');
  const topics=document.querySelector('#topics');
  const episodeSort=document.querySelector('#episodeSort');
  const seriesSort=document.querySelector('#seriesSort');
  const count=document.querySelector('#count');
  if(!tabs||!episodesSection||!seriesSection)return;

  const playlistTab=document.createElement('button');
  playlistTab.type='button';
  playlistTab.className='tab';
  playlistTab.dataset.view='playlists';
  playlistTab.textContent='Playlisty';
  tabs.appendChild(playlistTab);

  const view=document.createElement('section');
  view.className='vedator-playlist-view';
  view.innerHTML=`<div class="vedator-playlist-toolbar"><strong>Moje playlisty</strong><button class="vedator-playlist-add" type="button" aria-label="Nový playlist">+</button></div><div class="vedator-playlist-list"></div>`;
  seriesSection.insertAdjacentElement('afterend',view);
  const list=view.querySelector('.vedator-playlist-list');

  function showPlaylistView(){
    document.querySelectorAll('.tabs .tab').forEach(tab=>tab.classList.toggle('active',tab===playlistTab));
    episodesSection.classList.add('hidden');
    seriesSection.classList.add('hidden');
    view.classList.add('active');
    topics?.classList.add('hidden');
    episodeSort?.classList.add('hidden');
    seriesSort?.classList.add('hidden');
    renderPlaylists();
  }

  document.querySelectorAll('.tabs .tab:not([data-view="playlists"])').forEach(tab=>tab.addEventListener('click',()=>{
    view.classList.remove('active');
  }));
  playlistTab.addEventListener('click',showPlaylistView);

  function createPlaylist(){
    const name=prompt('Název nového playlistu:')?.trim();
    if(!name)return;
    const playlists=loadPlaylists();
    if(playlists.some(p=>p.name.toLocaleLowerCase('cs')===name.toLocaleLowerCase('cs'))){alert('Playlist s tímto názvem už existuje.');return}
    playlists.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,items:[]});
    savePlaylists(playlists);
    renderPlaylists();
  }

  function choosePlaylistForEpisode(episode){
    let playlists=loadPlaylists();
    if(!playlists.length){
      const name=prompt('Nejdřív vytvořte playlist. Zadejte jeho název:')?.trim();
      if(!name)return;
      playlists=[{id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,items:[]}];
    }
    const options=playlists.map((p,i)=>`${i+1}. ${p.name}`).join('\n');
    const answer=prompt(`Do kterého playlistu přidat díl?\n\n${options}\n\nNapište číslo playlistu:`)?.trim();
    const index=Number(answer)-1;
    if(!Number.isInteger(index)||index<0||index>=playlists.length)return;
    const id=episodeId(episode);
    if(!playlists[index].items.includes(id))playlists[index].items.push(id);
    savePlaylists(playlists);
    alert(`Přidáno do playlistu „${playlists[index].name}“.`);
  }

  function addEpisodeButtons(){
    episodesSection.querySelectorAll('article').forEach(article=>{
      if(article.querySelector('.vedator-add-to-playlist'))return;
      const title=article.querySelector('h2')?.textContent?.trim();
      const episode=episodeByTitle(title);
      if(!episode)return;
      const button=document.createElement('button');
      button.type='button';
      button.className='vedator-add-to-playlist';
      button.title='Přidat do playlistu';
      button.setAttribute('aria-label','Přidat do playlistu');
      button.textContent='+';
      button.addEventListener('click',event=>{event.stopPropagation();choosePlaylistForEpisode(episode)});
      article.appendChild(button);
    });
  }

  function playEpisode(episode,playlist){
    if(!episode?.enclosure)return;
    window.__vedatorPlaybackContext={type:'series',label:`Playlist: ${playlist.name}`,titles:playlist.items.map(episodeById).filter(Boolean).map(e=>e.title)};
    const proxy=document.createElement('article');
    proxy.hidden=true;
    proxy.innerHTML='<h2></h2><div class="links"><a class="primary"></a></div>';
    proxy.querySelector('h2').textContent=episode.title;
    const link=proxy.querySelector('a');
    link.href=episode.enclosure;
    link.dataset.vedatorEpisodeTitle=episode.title;
    document.body.appendChild(proxy);
    link.click();
    proxy.remove();
  }

  function renderPlaylists(){
    const playlists=loadPlaylists();
    if(count)count.textContent=`${playlists.length} ${playlists.length===1?'playlist':'playlistů'}`;
    if(!playlists.length){list.innerHTML='<div class="vedator-playlist-empty">Zatím nemáte žádný playlist. Klepněte na + a vytvořte první.</div>';return}
    list.innerHTML=playlists.map(p=>{
      const items=p.items.map(episodeById).filter(Boolean);
      return `<section class="vedator-playlist-card" data-playlist-id="${esc(p.id)}"><div class="vedator-playlist-head"><div class="vedator-playlist-title">${esc(p.name)}</div><div class="vedator-playlist-count">${items.length} dílů</div><button class="vedator-playlist-delete" type="button" aria-label="Smazat playlist">🗑</button></div><ol class="vedator-playlist-items">${items.length?items.map(e=>`<li class="vedator-playlist-item" data-episode-id="${esc(episodeId(e))}"><span>${esc(e.title)}</span><button class="vedator-playlist-play" type="button">Přehrát</button><button class="vedator-playlist-remove" type="button" aria-label="Odebrat z playlistu">✕</button></li>`).join(''):'<li class="vedator-playlist-empty">Playlist je prázdný.</li>'}</ol></section>`;
    }).join('');
  }

  view.querySelector('.vedator-playlist-add').addEventListener('click',createPlaylist);
  list.addEventListener('click',event=>{
    const card=event.target.closest('.vedator-playlist-card');
    if(!card)return;
    const playlists=loadPlaylists();
    const index=playlists.findIndex(p=>p.id===card.dataset.playlistId);
    if(index<0)return;
    if(event.target.closest('.vedator-playlist-delete')){
      if(confirm(`Smazat playlist „${playlists[index].name}“?`)){playlists.splice(index,1);savePlaylists(playlists);renderPlaylists()}
      return;
    }
    const item=event.target.closest('.vedator-playlist-item');
    if(!item)return;
    if(event.target.closest('.vedator-playlist-remove')){
      playlists[index].items=playlists[index].items.filter(id=>id!==item.dataset.episodeId);
      savePlaylists(playlists);renderPlaylists();return;
    }
    if(event.target.closest('.vedator-playlist-play'))playEpisode(episodeById(item.dataset.episodeId),playlists[index]);
  });

  const observer=new MutationObserver(addEpisodeButtons);
  observer.observe(episodesSection,{childList:true,subtree:true});
  addEpisodeButtons();
})();