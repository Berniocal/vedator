(()=>{
  if(window.__vedatorAudioPlayer)return;
  window.__vedatorAudioPlayer=true;

  const STORAGE_KEY='vedatorPlaybackProgressV1';
  let progress={};
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    if(saved&&typeof saved==='object')progress=saved;
  }catch(error){
    progress={};
  }

  const modal=document.createElement('section');
  modal.className='vedator-audio-modal';
  modal.hidden=true;
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.innerHTML=`
    <div class="vedator-audio-modal__shell">
      <div class="vedator-audio-modal__bar">
        <button class="vedator-audio-modal__back" type="button" aria-label="Zavřít">←</button>
        <div class="vedator-audio-modal__title">Vedátorský podcast</div>
      </div>
      <div class="vedator-audio-modal__content">
        <div class="vedator-audio-card">
          <div class="vedator-audio-card__kicker">Vedátorský podcast</div>
          <div class="vedator-audio-card__title"></div>
          <audio controls playsinline preload="metadata"></audio>
          <p class="vedator-audio-card__help">Pozice se ukládá do tohoto zařízení. Při příštím spuštění bude epizoda pokračovat od posledního místa.</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const back=modal.querySelector('.vedator-audio-modal__back');
  const barTitle=modal.querySelector('.vedator-audio-modal__title');
  const cardTitle=modal.querySelector('.vedator-audio-card__title');
  const help=modal.querySelector('.vedator-audio-card__help');
  const audio=modal.querySelector('audio');

  let historyEntry=false;
  let currentKey='';
  let currentTitle='';
  let currentUrl='';
  let currentSession=0;
  let switchingSource=false;
  let lastSavedSecond=-1;
  let resumeGuard=0;

  const visible=()=>!modal.hidden;
  const episodeTitle=element=>element.closest('article')?.querySelector('h2')?.textContent?.trim()||'Vedátorský podcast';
  const episodeKey=title=>{
    const number=String(title||'').match(/\bpodcast\s+(\d+)\b/i)?.[1];
    return number?`episode-${number}`:`title-${String(title||'').trim().toLowerCase()}`;
  };
  const absoluteUrl=url=>{
    try{return new URL(url,location.href).href}catch(error){return url}
  };
  const formatTime=seconds=>{
    const total=Math.max(0,Math.floor(Number(seconds)||0));
    const hours=Math.floor(total/3600);
    const minutes=Math.floor((total%3600)/60);
    const secs=total%60;
    return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${minutes}:${String(secs).padStart(2,'0')}`;
  };
  const isCompleted=(time,duration,ended=false)=>ended||(duration>0&&(time/duration>=.9||duration-time<=120));

  function persistProgress(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress))}catch(error){}
  }

  function saveCurrentProgress(force=false,ended=false){
    if(!currentKey||switchingSource||audio.readyState===0)return;
    if(currentUrl&&audio.currentSrc&&absoluteUrl(currentUrl)!==audio.currentSrc)return;

    const duration=Number.isFinite(audio.duration)?audio.duration:(progress[currentKey]?.duration||0);
    const time=ended&&duration>0?duration:audio.currentTime;
    if(!Number.isFinite(time)||time<0)return;

    if(resumeGuard>0){
      if(time<resumeGuard-5)return;
      resumeGuard=0;
    }

    const second=Math.floor(time);
    if(!force&&lastSavedSecond>=0&&Math.abs(second-lastSavedSecond)<5)return;
    lastSavedSecond=second;

    const previous=progress[currentKey]||{};
    progress[currentKey]={
      currentTime:time,
      duration,
      completed:Boolean(previous.completed)||isCompleted(time,duration,ended),
      title:currentTitle,
      updatedAt:Date.now()
    };
    persistProgress();
    decorateArticles();
  }

  function decorateArticles(){
    document.querySelectorAll('#episodes article').forEach(article=>{
      const title=article.querySelector('h2')?.textContent?.trim();
      const play=article.querySelector('.links .primary');
      if(!title||!play)return;
      const record=progress[episodeKey(title)];
      let badge=article.querySelector('.vedator-listen-status');

      if(!record||record.currentTime<10){
        badge?.remove();
        article.classList.remove('vedator-listened','vedator-in-progress');
        if(play.textContent!=='Přehrát')play.textContent='Přehrát';
        return;
      }

      if(!badge){
        badge=document.createElement('div');
        badge.className='vedator-listen-status';
        article.querySelector('h2')?.insertAdjacentElement('afterend',badge);
      }

      const percent=record.duration>0?Math.min(100,Math.round(record.currentTime/record.duration*100)):0;
      if(record.completed){
        badge.className='vedator-listen-status completed';
        badge.textContent='✓ Poslechnuto';
        article.classList.add('vedator-listened');
        article.classList.remove('vedator-in-progress');
        if(play.textContent!=='Přehrát znovu')play.textContent='Přehrát znovu';
      }else{
        badge.className='vedator-listen-status in-progress';
        badge.textContent=`▶ Rozposloucháno${percent?` · ${percent} %`:''}`;
        article.classList.add('vedator-in-progress');
        article.classList.remove('vedator-listened');
        const label=`Pokračovat ${formatTime(record.currentTime)}`;
        if(play.textContent!==label)play.textContent=label;
      }
    });
  }

  function resetAudio(save=true){
    if(save)saveCurrentProgress(true);

    switchingSource=true;
    currentSession+=1;
    audio.onloadedmetadata=null;
    audio.onerror=null;
    try{audio.pause()}catch(error){}
    audio.removeAttribute('src');
    audio.load();

    currentKey='';
    currentTitle='';
    currentUrl='';
    lastSavedSecond=-1;
    resumeGuard=0;
    switchingSource=false;
  }

  function openAudio(url,title){
    if(!url)return;
    resetAudio(true);

    const session=++currentSession;
    const key=episodeKey(title);
    const record=progress[key];

    currentTitle=title;
    currentKey=key;
    currentUrl=url;
    lastSavedSecond=-1;
    resumeGuard=record&&!record.completed&&record.currentTime>10?record.currentTime:0;
    switchingSource=true;

    barTitle.textContent=title;
    cardTitle.textContent=title;
    help.textContent=record&&!record.completed&&record.currentTime>10
      ?`Pokračování od ${formatTime(record.currentTime)} se načítá…`
      :'Pozice se ukládá do tohoto zařízení.';

    if(!visible()){
      modal.hidden=false;
      document.body.classList.add('vedator-audio-open');
      history.pushState({vedatorAudio:true},'');
      historyEntry=true;
    }

    audio.onloadedmetadata=()=>{
      if(session!==currentSession||currentKey!==key)return;

      if(record&&!record.completed&&record.currentTime>5&&Number.isFinite(audio.duration)){
        const target=Math.min(record.currentTime,Math.max(0,audio.duration-1));
        try{audio.currentTime=target}catch(error){}
      }else{
        resumeGuard=0;
      }

      switchingSource=false;
      help.textContent=record&&!record.completed&&record.currentTime>10
        ?`Pokračuje od ${formatTime(record.currentTime)}.`
        :'Pozice se ukládá do tohoto zařízení.';
    };

    audio.onerror=()=>{
      if(session!==currentSession)return;
      switchingSource=false;
      help.textContent='Zvuk se nepodařilo načíst. Zkuste přehrávání spustit znovu.';
    };

    audio.src=url;
    audio.load();

    const playPromise=audio.play();
    if(playPromise&&typeof playPromise.catch==='function'){
      playPromise.catch(()=>{
        if(session!==currentSession)return;
        switchingSource=false;
        help.textContent='Klepněte na tlačítko přehrávání v přehrávači.';
      });
    }

    if('mediaSession'in navigator&&'MediaMetadata'in window){
      navigator.mediaSession.metadata=new MediaMetadata({title,artist:'Vedátorský podcast'});
    }
  }

  function hideAudio(){
    resetAudio(true);
    modal.hidden=true;
    document.body.classList.remove('vedator-audio-open');
  }

  function requestClose(){
    if(historyEntry)history.back();
    else hideAudio();
  }

  audio.addEventListener('playing',()=>{
    switchingSource=false;
    if(currentKey)help.textContent='Pozice se průběžně ukládá do tohoto zařízení.';
  });
  audio.addEventListener('seeked',()=>{
    if(resumeGuard>0&&audio.currentTime>=resumeGuard-5)resumeGuard=0;
    saveCurrentProgress(true);
  });
  audio.addEventListener('timeupdate',()=>saveCurrentProgress(false));
  audio.addEventListener('pause',()=>saveCurrentProgress(true));
  audio.addEventListener('ended',()=>saveCurrentProgress(true,true));
  window.addEventListener('pagehide',()=>saveCurrentProgress(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveCurrentProgress(true)});

  back.addEventListener('click',requestClose);
  window.addEventListener('popstate',()=>{
    if(visible()){
      historyEntry=false;
      hideAudio();
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&visible())requestClose();
  });

  document.addEventListener('click',event=>{
    const play=event.target.closest('.links .primary');
    if(!play)return;
    const url=play.getAttribute('href')||play.dataset.url;
    if(!url)return;
    event.preventDefault();
    event.stopPropagation();
    openAudio(url,episodeTitle(play));
  },true);

  const episodesBox=document.querySelector('#episodes');
  if(episodesBox)new MutationObserver(decorateArticles).observe(episodesBox,{childList:true});
  decorateArticles();
})();