(()=>{
  if(window.__vedatorPlaylistPatch)return;
  window.__vedatorPlaylistPatch=true;

  const STORAGE_KEY='vedator-user-playlists-v1';
  const SHARE_KEY='playlist';
  const style=document.createElement('style');
  style.textContent=`
    .vedator-playlist-view{display:none}.vedator-playlist-view.active{display:block}
    .vedator-playlist-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0 12px}
    .vedator-playlist-add{width:44px;height:44px;border-radius:50%;border:0;background:var(--accent);color:#fff;font-size:1.8rem;line-height:1;cursor:pointer;box-shadow:0 8px 20px rgba(91,75,219,.28)}
    .vedator-playlist-list{display:grid;gap:12px}.vedator-playlist-card{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.06)}
    .vedator-playlist-head{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--line)}
    .vedator-playlist-title{font-weight:800;flex:1}.vedator-playlist-count{color:var(--muted);font-size:.85rem}
    .vedator-playlist-delete,.vedator-playlist-remove,.vedator-playlist-share,.vedator-playlist-move{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:1.05rem;padding:6px}
    .vedator-playlist-items{list-style:none;margin:0;padding:6px 16px 12px}.vedator-playlist-item{display:grid;grid-template-columns:auto 1fr auto auto;gap:7px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
    .vedator-playlist-item:last-child{border-bottom:0}.vedator-playlist-order{display:flex;flex-direction:column;gap:2px}
    .vedator-playlist-move{padding:1px 6px;line-height:1}.vedator-playlist-move:disabled{opacity:.25;cursor:not-allowed}
    .vedator-playlist-play{border:0;border-radius:10px;background:var(--accent);color:#fff;padding:8px 11px;font-weight:750;cursor:pointer}
    .vedator-add-to-playlist{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--accent);font-size:1.35rem;cursor:pointer;z-index:2}#episodes article{position:relative}
    .vedator-playlist-empty{padding:28px;text-align:center;color:var(--muted);background:var(--card);border:1px solid var(--line);border-radius:18px}
    @media(max-width:550px){.vedator-playlist-item{grid-template-columns:auto 1fr auto}.vedator-playlist-remove{grid-column:3}.vedator-playlist-play{grid-row:1 / span 2;grid-column:3}}
  `;
  document.head.appendChild(style);

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
  function loadPlaylists(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
  function savePlaylists(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v))}
  function allEpisodes(){try{return typeof episodes!=='undefined'&&Array.isArray(episodes)?episodes:[]}catch{return []}}
  function episodeId(e){return String(e.id||e.number||e.title)}
  function episodeById(id){return allEpisodes().find(e=>String(e.id||e.number||e.title)===String(id))||null}
  function episodeForArticle(article){
    const title=article.querySelector('h2')?.textContent?.trim()||'';
    const number=title.match(/\bpodcast\s+(\d+)\b/i)?.[1];
    if(number){const found=allEpisodes().find(e=>String(e.number)===number);if(found)return found}
    return allEpisodes().find(e=>String(e.title||'').trim()===title)||null;
  }
  function b64urlEncode(value){const bytes=new TextEncoder().encode(value);let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  function b64urlDecode(value){let s=value.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))}

  const tabs=document.querySelector('.tabs'),episodesSection=document.querySelector('#episodes'),seriesSection=document.querySelector('#series');
  const topics=document.querySelector('#topics'),episodeSort=document.querySelector('#episodeSort'),seriesSort=document.querySelector('#seriesSort'),count=document.querySelector('#count');
  if(!tabs||!episodesSection||!seriesSection)return;

  const playlistTab=document.createElement('button');playlistTab.type='button';playlistTab.className='tab';playlistTab.dataset.view='playlists';playlistTab.textContent='Playlisty';tabs.appendChild(playlistTab);
  const view=document.createElement('section');view.className='vedator-playlist-view';view.innerHTML='<div class="vedator-playlist-toolbar"><strong>Moje playlisty</strong><button class="vedator-playlist-add" type="button" aria-label="Nový playlist">+</button></div><div class="vedator-playlist-list"></div>';
  seriesSection.insertAdjacentElement('afterend',view);const list=view.querySelector('.vedator-playlist-list');

  function showPlaylistView(){document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.toggle('active',t===playlistTab));episodesSection.classList.add('hidden');seriesSection.classList.add('hidden');view.classList.add('active');topics?.classList.add('hidden');episodeSort?.classList.add('hidden');seriesSort?.classList.add('hidden');renderPlaylists()}
  document.querySelectorAll('.tabs .tab:not([data-view="playlists"])').forEach(t=>t.addEventListener('click',()=>view.classList.remove('active')));playlistTab.addEventListener('click',showPlaylistView);

  function createPlaylist(){const name=prompt('Názov nového playlistu:')?.trim();if(!name)return;const p=loadPlaylists();if(p.some(x=>x.name.toLocaleLowerCase('sk')===name.toLocaleLowerCase('sk'))){alert('Playlist s týmto názvom už existuje.');return}p.push({id:uid(),name,items:[]});savePlaylists(p);renderPlaylists()}
  function choosePlaylistForEpisode(episode){
    let p=loadPlaylists();if(!p.length){const name=prompt('Najprv vytvorte playlist. Zadajte jeho názov:')?.trim();if(!name)return;p=[{id:uid(),name,items:[]}]}
    const answer=prompt(`Do ktorého playlistu pridať diel?\n\n${p.map((x,i)=>`${i+1}. ${x.name}`).join('\n')}\n\nNapíšte číslo playlistu:`)?.trim();
    const i=Number(answer)-1;if(!Number.isInteger(i)||i<0||i>=p.length)return;const id=episodeId(episode);if(!p[i].items.includes(id))p[i].items.push(id);savePlaylists(p);alert(`Pridané do playlistu „${p[i].name}“.`)
  }
  function addEpisodeButtons(){episodesSection.querySelectorAll('article').forEach(article=>{if(article.querySelector('.vedator-add-to-playlist'))return;const episode=episodeForArticle(article);if(!episode)return;const b=document.createElement('button');b.type='button';b.className='vedator-add-to-playlist';b.title='Pridať do playlistu';b.setAttribute('aria-label','Pridať do playlistu');b.textContent='+';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();choosePlaylistForEpisode(episode)});article.appendChild(b)})}
  function playEpisode(episode,playlist){if(!episode?.enclosure)return;window.__vedatorPlaybackContext={type:'series',label:`Playlist: ${playlist.name}`,titles:playlist.items.map(episodeById).filter(Boolean).map(e=>e.title)};const proxy=document.createElement('article');proxy.hidden=true;proxy.innerHTML='<h2></h2><div class="links"><a class="primary"></a></div>';proxy.querySelector('h2').textContent=episode.title;const a=proxy.querySelector('a');a.href=episode.enclosure;a.dataset.vedatorEpisodeTitle=episode.title;document.body.appendChild(proxy);a.click();proxy.remove()}
  async function sharePlaylist(playlist){
    const payload=b64urlEncode(JSON.stringify({n:playlist.name,i:playlist.items}));const url=new URL(location.href);url.hash=`${SHARE_KEY}=${payload}`;
    const data={title:playlist.name,text:`Playlist Vedátorského podcastu: ${playlist.name}`,url:url.href};
    try{if(navigator.share){await navigator.share(data)}else{await navigator.clipboard.writeText(url.href);alert('Odkaz na playlist bol skopírovaný.')}}catch(error){if(error?.name!=='AbortError')prompt('Skopírujte odkaz:',url.href)}
  }
  function importSharedPlaylist(){
    const match=location.hash.match(new RegExp(`(?:^#|&)${SHARE_KEY}=([^&]+)`));if(!match)return;
    try{const data=JSON.parse(b64urlDecode(match[1]));if(!data||!Array.isArray(data.i))return;const name=String(data.n||'Zdieľaný playlist').trim();if(!confirm(`Uložiť zdieľaný playlist „${name}“?`))return;const p=loadPlaylists();let final=name,n=2;while(p.some(x=>x.name.toLocaleLowerCase('sk')===final.toLocaleLowerCase('sk')))final=`${name} (${n++})`;p.push({id:uid(),name:final,items:data.i.map(String)});savePlaylists(p);history.replaceState(null,'',location.pathname+location.search);setTimeout(showPlaylistView,0)}catch(error){console.warn('Neplatný playlistový odkaz',error)}
  }
  function renderPlaylists(){const p=loadPlaylists();if(count)count.textContent=`${p.length} ${p.length===1?'playlist':'playlistov'}`;if(!p.length){list.innerHTML='<div class="vedator-playlist-empty">Zatiaľ nemáte žiadny playlist. Klepnite na + a vytvorte prvý.</div>';return}list.innerHTML=p.map(pl=>{const items=pl.items.map(episodeById).filter(Boolean);return `<section class="vedator-playlist-card" data-playlist-id="${esc(pl.id)}"><div class="vedator-playlist-head"><div class="vedator-playlist-title">${esc(pl.name)}</div><div class="vedator-playlist-count">${items.length} dielov</div><button class="vedator-playlist-share" type="button" aria-label="Zdieľať playlist">🔗</button><button class="vedator-playlist-delete" type="button" aria-label="Zmazať playlist">🗑</button></div><ol class="vedator-playlist-items">${items.length?items.map((e,i)=>`<li class="vedator-playlist-item" data-episode-id="${esc(episodeId(e))}"><span class="vedator-playlist-order"><button class="vedator-playlist-move up" type="button" ${i===0?'disabled':''} aria-label="Posunúť hore">▲</button><button class="vedator-playlist-move down" type="button" ${i===items.length-1?'disabled':''} aria-label="Posunúť dole">▼</button></span><span>${esc(e.title)}</span><button class="vedator-playlist-play" type="button">Prehrať</button><button class="vedator-playlist-remove" type="button" aria-label="Odobrať z playlistu">✕</button></li>`).join(''):'<li class="vedator-playlist-empty">Playlist je prázdny.</li>'}</ol></section>`}).join('')}

  view.querySelector('.vedator-playlist-add').addEventListener('click',createPlaylist);
  list.addEventListener('click',event=>{const card=event.target.closest('.vedator-playlist-card');if(!card)return;const p=loadPlaylists(),pi=p.findIndex(x=>x.id===card.dataset.playlistId);if(pi<0)return;if(event.target.closest('.vedator-playlist-share')){sharePlaylist(p[pi]);return}if(event.target.closest('.vedator-playlist-delete')){if(confirm(`Zmazať playlist „${p[pi].name}“?`)){p.splice(pi,1);savePlaylists(p);renderPlaylists()}return}const item=event.target.closest('.vedator-playlist-item');if(!item)return;const ii=p[pi].items.indexOf(item.dataset.episodeId);if(event.target.closest('.vedator-playlist-remove')){p[pi].items=p[pi].items.filter(id=>id!==item.dataset.episodeId);savePlaylists(p);renderPlaylists();return}if(event.target.closest('.up')&&ii>0){[p[pi].items[ii-1],p[pi].items[ii]]=[p[pi].items[ii],p[pi].items[ii-1]];savePlaylists(p);renderPlaylists();return}if(event.target.closest('.down')&&ii>=0&&ii<p[pi].items.length-1){[p[pi].items[ii+1],p[pi].items[ii]]=[p[pi].items[ii],p[pi].items[ii+1]];savePlaylists(p);renderPlaylists();return}if(event.target.closest('.vedator-playlist-play'))playEpisode(episodeById(item.dataset.episodeId),p[pi])});

  const observer=new MutationObserver(addEpisodeButtons);observer.observe(episodesSection,{childList:true,subtree:true});addEpisodeButtons();view.querySelector('.vedator-playlist-add').addEventListener('click',createPlaylist);setTimeout(importSharedPlaylist,700);
})();