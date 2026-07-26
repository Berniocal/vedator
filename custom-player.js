(()=>{
  if(window.__vedatorCustomPlayer)return;
  window.__vedatorCustomPlayer=true;

  const RATES=[1,1.25,1.5,1.75,2,.8];
  let context={label:'Všechny epizody',titles:[]};
  let currentTitle='';
  let rate=1;

  const style=document.createElement('style');
  style.textContent=`
    .vedator-audio-card audio{display:none!important}
    .vedator-custom-controls{display:grid;gap:13px;margin-top:18px}
    .vedator-custom-main{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;align-items:center}
    .vedator-custom-secondary{display:grid;grid-template-columns:1fr 1fr;gap:11px}
    .vedator-custom-btn{border:1px solid #d8d1ff;background:linear-gradient(180deg,#f7f5ff,#ebe7ff);color:#392b9b;border-radius:17px;min-height:56px;padding:8px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 7px 18px rgba(91,75,219,.13)}
    .vedator-custom-btn:active{transform:translateY(1px)}
    .vedator-custom-btn:disabled{opacity:.38;cursor:not-allowed;box-shadow:none}
    .vedator-custom-btn.main{min-height:68px;border-radius:21px;background:linear-gradient(180deg,#7f70ed,#5b4bdb);border-color:#7565e3;color:#fff;font-size:1.65rem;box-shadow:0 10px 24px rgba(91,75,219,.28)}
    .vedator-custom-icon{font-size:1.3rem;line-height:1}.vedator-custom-label{font-size:.68rem;line-height:1.1;text-align:center}
    .vedator-custom-btn.main .vedator-custom-label{display:none}
    .vedator-custom-secondary .vedator-custom-btn{min-height:47px;flex-direction:row;font-size:.9rem}
    html.theme-dark .vedator-custom-btn{background:linear-gradient(180deg,#273147,#1d2534);border-color:#3c4963;color:#ece8ff;box-shadow:0 8px 18px rgba(0,0,0,.25)}
    html.theme-dark .vedator-custom-btn.main{background:linear-gradient(180deg,#8073eb,#5b4ed8);border-color:#8b7ee8;color:#fff;box-shadow:0 10px 24px rgba(91,78,216,.36)}
    @media(max-width:550px){.vedator-custom-main{gap:7px}.vedator-custom-btn{min-height:53px;border-radius:15px;padding:7px 3px}.vedator-custom-btn.main{min-height:65px}.vedator-custom-icon{font-size:1.18rem}.vedator-custom-label{font-size:.62rem}}
  `;
  document.head.appendChild(style);

  function episodeKey(title){
    const number=String(title||'').match(/\bpodcast\s+(\d+)\b/i)?.[1];
    return number?`episode-${number}`:`title-${String(title||'').trim().toLowerCase()}`;
  }
  function getEpisode(title){
    return typeof episodes!=='undefined'&&Array.isArray(episodes)?episodes.find(e=>episodeKey(e.title)===episodeKey(title)):null;
  }
  function visibleEpisodeTitles(){
    return [...document.querySelectorAll('#episodes article h2')].map(x=>x.textContent.trim()).filter(Boolean);
  }
  function setEpisodeContext(){
    const titles=visibleEpisodeTitles();
    const topic=typeof active==='string'?active:'Vše';
    const query=document.querySelector('#search')?.value?.trim();
    context={
      label:query?`Vyhledávání: ${query}`:(topic&&topic!=='Vše'?`Téma: ${topic}`:'Všechny epizody'),
      titles
    };
  }
  function setSeriesContext(link){
    const card=link.closest('.series-card');
    const links=[...card.querySelectorAll('.series-body a')];
    context={
      label:card.querySelector('summary span')?.textContent?.trim()||'Série',
      titles:links.map(a=>a.dataset.vedatorEpisodeTitle||a.querySelector('.episode-title')?.textContent||a.textContent).map(x=>x.trim()).filter(Boolean)
    };
  }
  function currentIndex(){return context.titles.findIndex(t=>episodeKey(t)===episodeKey(currentTitle))}

  function openEpisode(title){
    const episode=getEpisode(title);
    if(!episode?.enclosure)return false;
    const proxy=document.createElement('article');
    proxy.hidden=true;
    proxy.innerHTML=`<h2></h2><div class="links"><a class="primary"></a></div>`;
    proxy.querySelector('h2').textContent=episode.title;
    const play=proxy.querySelector('a');
    play.href=episode.enclosure;
    document.body.appendChild(proxy);
    play.click();
    proxy.remove();
    return true;
  }

  document.addEventListener('click',event=>{
    const series=event.target.closest('#series .series-body a');
    if(series){setSeriesContext(series);return}
    const play=event.target.closest('#episodes article .links .primary');
    if(play)setEpisodeContext();
  },true);

  function install(){
    const card=document.querySelector('.vedator-audio-card');
    const audio=card?.querySelector('audio');
    if(!card||!audio||card.querySelector('.vedator-custom-controls'))return false;

    const controls=document.createElement('div');
    controls.className='vedator-custom-controls';
    controls.innerHTML=`
      <div class="vedator-custom-main">
        <button class="vedator-custom-btn prev" type="button" aria-label="Předchozí díl"><span class="vedator-custom-icon">◀|</span><span class="vedator-custom-label">Předchozí</span></button>
        <button class="vedator-custom-btn back10" type="button" aria-label="O 10 sekund zpět"><span class="vedator-custom-icon">↶</span><span class="vedator-custom-label">−10 s</span></button>
        <button class="vedator-custom-btn main play" type="button" aria-label="Přehrát"><span class="vedator-custom-icon">▶</span><span class="vedator-custom-label">Přehrát</span></button>
        <button class="vedator-custom-btn forward10" type="button" aria-label="O 10 sekund dopředu"><span class="vedator-custom-icon">↷</span><span class="vedator-custom-label">+10 s</span></button>
        <button class="vedator-custom-btn next" type="button" aria-label="Další díl"><span class="vedator-custom-icon">|▶</span><span class="vedator-custom-label">Další</span></button>
      </div>
      <div class="vedator-custom-secondary">
        <a class="vedator-custom-btn download" href="#" download><span>⇩</span><span>Stáhnout</span></a>
        <button class="vedator-custom-btn speed" type="button"><span>Rychlost</span><span class="speed-value">1×</span></button>
      </div>`;
    audio.insertAdjacentElement('afterend',controls);

    const play=controls.querySelector('.play');
    const playIcon=play.querySelector('.vedator-custom-icon');
    const prev=controls.querySelector('.prev');
    const next=controls.querySelector('.next');
    const download=controls.querySelector('.download');
    const speed=controls.querySelector('.speed');
    const speedValue=controls.querySelector('.speed-value');
    const titleNode=card.querySelector('.vedator-audio-card__title');

    function sync(){
      currentTitle=titleNode?.textContent?.trim()||currentTitle;
      playIcon.textContent=audio.paused?'▶':'Ⅱ';
      play.setAttribute('aria-label',audio.paused?'Přehrát':'Pozastavit');
      download.href=audio.currentSrc||audio.src||'#';
      download.download=(currentTitle||'vedatorsky-podcast').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()+'.mp3';
      const i=currentIndex();
      prev.disabled=i<=0;
      next.disabled=i<0||i>=context.titles.length-1;
      speedValue.textContent=String(rate).replace('.',',')+'×';
    }
    function relative(delta){
      const i=currentIndex();
      const title=context.titles[i+delta];
      if(title)openEpisode(title);
    }
    play.onclick=()=>audio.paused?audio.play():audio.pause();
    controls.querySelector('.back10').onclick=()=>{audio.currentTime=Math.max(0,audio.currentTime-10)};
    controls.querySelector('.forward10').onclick=()=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+10)};
    prev.onclick=()=>relative(-1);
    next.onclick=()=>relative(1);
    speed.onclick=()=>{
      const i=RATES.findIndex(x=>Math.abs(x-rate)<.001);
      rate=RATES[(i+1)%RATES.length];
      audio.playbackRate=rate;
      sync();
    };
    audio.addEventListener('play',sync);
    audio.addEventListener('pause',sync);
    audio.addEventListener('loadedmetadata',()=>{audio.playbackRate=rate;sync()});
    audio.addEventListener('ratechange',()=>{rate=audio.playbackRate;sync()});
    audio.addEventListener('ended',()=>relative(1));
    new MutationObserver(sync).observe(titleNode,{childList:true,subtree:true,characterData:true});
    setInterval(sync,1000);
    sync();
    return true;
  }

  if(!install())new MutationObserver(()=>install()).observe(document.body,{childList:true,subtree:true});
})();
