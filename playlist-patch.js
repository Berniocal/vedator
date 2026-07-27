(()=>{
  if(window.__vedatorPlaylistPatch)return;
  window.__vedatorPlaylistPatch=true;

  const STORAGE_KEY='vedator-user-playlists-v1';
  const SHARE_KEY='playlist';
  const style=document.createElement('style');
  style.textContent=`
    .vedator-playlist-view{display:none}.vedator-playlist-view.active{display:block}
    .vedator-playlist-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0 12px}
    .vedator-playlist-add{width:44px;height:44px;border-radius:50%;border:0;background:var(--accent);color:#fff;font-size:1.8rem;cursor:pointer;box-shadow:0 8px 20px rgba(91,75,219,.28)}
    .vedator-playlist-list{display:grid;gap:12px}
    details.vedator-playlist-card{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
    .vedator-playlist-card summary{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;list-style:none}
    .vedator-playlist-card summary::-webkit-details-marker{display:none}
    .vedator-playlist-title{font-weight:800;flex:1}.vedator-playlist-count{color:var(--muted);font-size:.9rem}
    .vedator-playlist-actions{display:flex;gap:4px;align-items:center}.vedator-playlist-icon{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:1.05rem;padding:7px;border-radius:8px}.vedator-playlist-icon:hover{background:rgba(127,127,127,.12)}
    .vedator-playlist-body{border-top:1px solid var(--line);padding:6px 16px 12px}
    .vedator-playlist-items{list-style:none;margin:0;padding:0}.vedator-playlist-item{border-bottom:1px solid var(--line)}.vedator-playlist-item:last-child{border-bottom:0}
    .vedator-playlist-episode{display:block;width:100%;border:0;background:transparent;color:var(--ink);text-align:left;padding:12px 4px;cursor:pointer;font:inherit}.vedator-playlist-episode:hover{color:var(--accent)}
    .vedator-playlist-empty{padding:24px;text-align:center;color:var(--muted)}
    .vedator-editor{position:fixed;inset:0;z-index:10000;background:rgba(3,7,18,.72);display:flex;align-items:center;justify-content:center;padding:16px}.vedator-editor.hidden{display:none}
    .vedator-editor-box{width:min(760px,100%);max-height:88vh;display:flex;flex-direction:column;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:20px;overflow:hidden}
    .vedator-editor-head,.vedator-editor-foot{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}.vedator-editor-foot{border-top:1px solid var(--line);border-bottom:0;justify-content:flex-end}
    .vedator-editor-head strong{flex:1}.vedator-editor-close{border:0;background:transparent;color:var(--muted);font-size:1.3rem;cursor:pointer}
    .vedator-editor-search{margin:12px 16px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font:inherit}
    .vedator-editor-list{overflow:auto;padding:0 16px 16px;display:grid;gap:8px}
    .vedator-editor-choice{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer}.vedator-editor-choice.selected{border-color:var(--accent);background:rgba(124,92,255,.12)}
    .vedator-editor-choice input{width:20px;height:20px}.vedator-editor-choice small{color:var(--muted)}
    .vedator-edit-order{display:grid;gap:6px;margin:0 16px 12px}.vedator-edit-row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:8px}.vedator-edit-move,.vedator-edit-remove{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:5px}
    .vedator-editor-save,.vedator-editor-cancel{border:0;border-radius:10px;padding:10px 16px;font-weight:750;cursor:pointer}.vedator-editor-save{background:var(--accent);color:#fff}.vedator-editor-cancel{background:transparent;color:var(--ink);border:1px solid var(--line)}
  `;
  document.head.appendChild(style);

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const loadPlaylists=()=>{try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
  const savePlaylists=v=>localStorage.setItem(STORAGE_KEY,JSON.stringify(v));
  const allEpisodes=()=>{try{return typeof episodes!=='undefined'&&Array.isArray(episodes)?episodes:[]}catch{return []}};
  const episodeId=e=>String(e.id||e.number||e.title);
  const episodeById=id=>allEpisodes().find(e=>episodeId(e)===String(id))||null;
  const b64urlEncode=value=>{const bytes=new TextEncoder().encode(value);let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
  const b64urlDecode=value=>{let s=value.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))};

  const tabs=document.querySelector('.tabs'),episodesSection=document.querySelector('#episodes'),seriesSection=document.querySelector('#series');
  const topics=document.querySelector('#topics'),episodeSort=document.querySelector('#episodeSort'),seriesSort=document.querySelector('#seriesSort'),count=document.querySelector('#count');
  if(!tabs||!episodesSection||!seriesSection)return;

  const playlistTab=document.createElement('button');playlistTab.type='button';playlistTab.className='tab';playlistTab.dataset.view='playlists';playlistTab.textContent='Playlisty';tabs.appendChild(playlistTab);
  const view=document.createElement('section');view.className='vedator-playlist-view';view.innerHTML='<div class="vedator-playlist-toolbar"><strong>Moje playlisty</strong><button class="vedator-playlist-add" type="button" aria-label="Nový playlist">+</button></div><div class="vedator-playlist-list"></div>';
  seriesSection.insertAdjacentElement('afterend',view);const list=view.querySelector('.vedator-playlist-list');

  const editor=document.createElement('div');editor.className='vedator-editor hidden';editor.innerHTML='<div class="vedator-editor-box"><div class="vedator-editor-head"><strong>Upraviť playlist</strong><button class="vedator-editor-close" type="button">✕</button></div><div class="vedator-edit-order"></div><input class="vedator-editor-search" type="search" placeholder="Hľadať epizódu…"><div class="vedator-editor-list"></div><div class="vedator-editor-foot"><button class="vedator-editor-cancel" type="button">Zrušiť</button><button class="vedator-editor-save" type="button">Uložiť</button></div></div>';
  document.body.appendChild(editor);
  const editorTitle=editor.querySelector('.vedator-editor-head strong'),editorSearch=editor.querySelector('.vedator-editor-search'),editorList=editor.querySelector('.vedator-editor-list'),editorOrder=editor.querySelector('.vedator-edit-order');
  let editingId='',draftItems=[];

  function showPlaylistView(){document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.toggle('active',t===playlistTab));episodesSection.classList.add('hidden');seriesSection.classList.add('hidden');view.classList.add('active');topics?.classList.add('hidden');episodeSort?.classList.add('hidden');seriesSort?.classList.add('hidden');renderPlaylists()}
  document.querySelectorAll('.tabs .tab:not([data-view="playlists"])').forEach(t=>t.addEventListener('click',()=>view.classList.remove('active')));playlistTab.addEventListener('click',showPlaylistView);

  function createPlaylist(){const name=prompt('Názov nového playlistu:')?.trim();if(!name)return;const p=loadPlaylists();if(p.some(x=>x.name.toLocaleLowerCase('sk')===name.toLocaleLowerCase('sk'))){alert('Playlist s týmto názvom už existuje.');return}p.push({id:uid(),name,items:[]});savePlaylists(p);renderPlaylists()}

  function openEditor(id){const p=loadPlaylists().find(x=>x.id===id);if(!p)return;editingId=id;draftItems=[...p.items];editorTitle.textContent=`Upraviť: ${p.name}`;editorSearch.value='';editor.classList.remove('hidden');renderEditor();setTimeout(()=>editorSearch.focus(),0)}
  function closeEditor(){editor.classList.add('hidden');editingId='';draftItems=[]}
  function renderEditor(){
    editorOrder.innerHTML=draftItems.length?draftItems.map((id,i)=>{const e=episodeById(id);if(!e)return'';return `<div class="vedator-edit-row" data-id="${esc(id)}"><span><button class="vedator-edit-move up" ${i===0?'disabled':''}>▲</button><button class="vedator-edit-move down" ${i===draftItems.length-1?'disabled':''}>▼</button></span><span>${esc(e.title)}</span><button class="vedator-edit-remove">✕</button></div>`}).join(''):'';
    const q=normalize(editorSearch.value.trim());
    const matches=allEpisodes().filter(e=>!q||normalize(`${e.number||''} ${e.title||''} ${e.description||''}`).includes(q)).slice(0,200);
    const selected=new Set(draftItems);
    editorList.innerHTML=matches.map(e=>{const id=episodeId(e),checked=selected.has(id);return `<label class="vedator-editor-choice${checked?' selected':''}" data-id="${esc(id)}"><input type="checkbox" ${checked?'checked':''}><span>${esc(e.title)}</span><small>${e.number?'#'+esc(e.number):''}</small></label>`}).join('')||'<div class="vedator-playlist-empty">Nenašla sa žiadna epizóda.</div>';
  }

  editorSearch.addEventListener('input',renderEditor);
  editorList.addEventListener('change',e=>{const row=e.target.closest('.vedator-editor-choice');if(!row)return;const id=row.dataset.id;if(e.target.checked){if(!draftItems.includes(id))draftItems.push(id)}else draftItems=draftItems.filter(x=>x!==id);renderEditor()});
  editorOrder.addEventListener('click',e=>{const row=e.target.closest('.vedator-edit-row');if(!row)return;const i=draftItems.indexOf(row.dataset.id);if(e.target.closest('.vedator-edit-remove'))draftItems.splice(i,1);else if(e.target.closest('.up')&&i>0)[draftItems[i-1],draftItems[i]]=[draftItems[i],draftItems[i-1]];else if(e.target.closest('.down')&&i<draftItems.length-1)[draftItems[i+1],draftItems[i]]=[draftItems[i],draftItems[i+1]];renderEditor()});
  editor.querySelector('.vedator-editor-save').addEventListener('click',()=>{const p=loadPlaylists(),i=p.findIndex(x=>x.id===editingId);if(i>=0){p[i].items=[...draftItems];savePlaylists(p)}closeEditor();renderPlaylists()});
  editor.querySelector('.vedator-editor-cancel').addEventListener('click',closeEditor);editor.querySelector('.vedator-editor-close').addEventListener('click',closeEditor);editor.addEventListener('click',e=>{if(e.target===editor)closeEditor()});

  function playEpisode(episode,playlist){if(!episode?.enclosure)return;window.__vedatorPlaybackContext={type:'series',label:`Playlist: ${playlist.name}`,titles:playlist.items.map(episodeById).filter(Boolean).map(e=>e.title)};const proxy=document.createElement('article');proxy.hidden=true;proxy.innerHTML='<h2></h2><div class="links"><a class="primary"></a></div>';proxy.querySelector('h2').textContent=episode.title;const a=proxy.querySelector('a');a.href=episode.enclosure;a.dataset.vedatorEpisodeTitle=episode.title;document.body.appendChild(proxy);a.click();proxy.remove()}
  async function sharePlaylist(p){const payload=b64urlEncode(JSON.stringify({n:p.name,i:p.items}));const url=new URL(location.href);url.hash=`${SHARE_KEY}=${payload}`;try{if(navigator.share)await navigator.share({title:p.name,text:`Playlist Vedátorského podcastu: ${p.name}`,url:url.href});else{await navigator.clipboard.writeText(url.href);alert('Odkaz bol skopírovaný.')}}catch(error){if(error?.name!=='AbortError')prompt('Skopírujte odkaz:',url.href)}}
  function importSharedPlaylist(){const m=location.hash.match(new RegExp(`(?:^#|&)${SHARE_KEY}=([^&]+)`));if(!m)return;try{const d=JSON.parse(b64urlDecode(m[1]));if(!d||!Array.isArray(d.i))return;const name=String(d.n||'Zdieľaný playlist').trim();if(!confirm(`Uložiť zdieľaný playlist „${name}“?`))return;const p=loadPlaylists();let final=name,n=2;while(p.some(x=>x.name.toLocaleLowerCase('sk')===final.toLocaleLowerCase('sk')))final=`${name} (${n++})`;p.push({id:uid(),name:final,items:d.i.map(String)});savePlaylists(p);history.replaceState(null,'',location.pathname+location.search);setTimeout(showPlaylistView,0)}catch{}}

  function renderPlaylists(){const p=loadPlaylists();if(count)count.textContent=`${p.length} ${p.length===1?'playlist':'playlistov'}`;if(!p.length){list.innerHTML='<div class="vedator-playlist-empty">Zatiaľ nemáte žiadny playlist.</div>';return}list.innerHTML=p.map(pl=>{const items=pl.items.map(episodeById).filter(Boolean);return `<details class="vedator-playlist-card" data-id="${esc(pl.id)}"><summary><span class="vedator-playlist-title">${esc(pl.name)}</span><span class="vedator-playlist-count">${items.length} dielov</span><span class="vedator-playlist-actions"><button class="vedator-playlist-icon edit" title="Upraviť">✎</button><button class="vedator-playlist-icon share" title="Zdieľať">🔗</button><button class="vedator-playlist-icon delete" title="Zmazať">🗑</button></span></summary><div class="vedator-playlist-body"><ol class="vedator-playlist-items">${items.length?items.map(e=>`<li class="vedator-playlist-item"><button class="vedator-playlist-episode" data-id="${esc(episodeId(e))}">${esc(e.title)}</button></li>`).join(''):'<li class="vedator-playlist-empty">Playlist je prázdny.</li>'}</ol></div></details>`}).join('')}

  view.querySelector('.vedator-playlist-add').addEventListener('click',createPlaylist);
  list.addEventListener('click',e=>{const card=e.target.closest('.vedator-playlist-card');if(!card)return;const p=loadPlaylists(),i=p.findIndex(x=>x.id===card.dataset.id);if(i<0)return;if(e.target.closest('.edit')){e.preventDefault();openEditor(p[i].id);return}if(e.target.closest('.share')){e.preventDefault();sharePlaylist(p[i]);return}if(e.target.closest('.delete')){e.preventDefault();if(confirm(`Zmazať playlist „${p[i].name}“?`)){p.splice(i,1);savePlaylists(p);renderPlaylists()}return}const ep=e.target.closest('.vedator-playlist-episode');if(ep){e.preventDefault();playEpisode(episodeById(ep.dataset.id),p[i])}});

  setTimeout(importSharedPlaylist,700);
})();