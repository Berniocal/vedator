// Small first-paint layer. Never mutates the full podcast/FAQ/promises data.
// It shows meaningful text while large data files are downloading/parsing.
(()=>{
  const previewUrl='./first-paint.json';
  const slibyReady=()=>document.getElementById('sliby-frame-v2')?.dataset.slibyReady==='true';
  const fullReady=()=>document.documentElement.dataset.vedatorV2Ready==='1';
  const clearFirstPaint=()=>{
    document.querySelectorAll('.vedator-first-paint-episodes').forEach(node=>node.remove());
  };
  const style=document.createElement('style');
  style.id='vedator-first-paint-style';
  style.textContent='.vedator-first-paint-note{padding:10px 12px;border:1px solid var(--line);background:var(--raised);border-radius:12px;color:var(--muted);font-size:.88rem;margin:0 0 12px}.vedator-first-paint-episodes .card{min-height:0}.vedator-first-paint-episodes .card h2{margin:.2rem 0 .55rem}.vedator-first-paint-episodes .card p{margin:0;color:var(--muted);line-height:1.45}#sliby-first-paint-v2:not([hidden]){display:block;position:absolute;z-index:2;inset:0;overflow-y:auto;padding:10px;background:var(--bg);border:1px solid var(--line);border-radius:12px}#sliby-first-paint-v2 .fast-sliby-card{padding:13px 14px;margin:0 0 8px;background:var(--card);border:1px solid var(--line);border-radius:12px}#sliby-first-paint-v2 .fast-sliby-card strong{display:block;font-size:.95rem;line-height:1.4}#sliby-first-paint-v2 .fast-sliby-card small{color:var(--muted)}';
  document.head.appendChild(style);
  const append=(parent,tag,value,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    el.textContent=String(value??'');
    parent.appendChild(el);
    return el;
  };
  const renderEpisodes=(data)=>{
    const parent=document.getElementById('episodes-v2');
    if(!parent||fullReady()||parent.querySelector('article'))return;
    const fragment=document.createDocumentFragment();
    append(fragment,'p','Rychlý náhled · 20 epizod. Kompletní katalog a přehrávání se připravují…','vedator-first-paint-note');
    for(const item of data.episodes){
      const card=append(fragment,'article','', 'card');
      append(card,'div','Díl '+item.number+' · '+String(item.date||'').slice(0,10),'meta');
      append(card,'h2',item.title);
      append(card,'p',item.description);
    }
    const host=document.createElement('div');
    host.className='vedator-first-paint-episodes';
    host.style.display='contents';
    host.appendChild(fragment);
    parent.appendChild(host);
  };
  const renderSliby=(data)=>{
    const host=document.getElementById('sliby-first-paint-v2');
    if(!host||slibyReady())return;
    const fragment=document.createDocumentFragment();
    append(fragment,'p','Rychlý náhled · 20 položek. Kompletní seznam a filtry se připravují…','vedator-first-paint-note');
    for(const item of data.sliby){
      const card=append(fragment,'div','', 'fast-sliby-card');
      append(card,'strong',item.title);
      append(card,'small',item.type);
    }
    host.replaceChildren(fragment);
    host.hidden=false;
  };
  fetch(previewUrl,{cache:'no-store'})
    .then(response=>{if(!response.ok)throw new Error('Preview HTTP '+response.status);return response.json()})
    .then(data=>{
      if(data?.schema!==1||!Array.isArray(data.episodes)||!Array.isArray(data.sliby))return;
      window.VedatorFirstPaint=data;
      renderEpisodes(data);
      renderSliby(data);
      window.dispatchEvent(new Event('vedator-first-paint-ready'));
    })
    .catch(error=>console.warn('Fast preview unavailable; full catalog remains available',error));
  window.addEventListener('vedator-v2-ready',clearFirstPaint);
  window.addEventListener('vedator-sliby-ready',()=>document.getElementById('sliby-first-paint-v2')?.setAttribute('hidden',''));
})();