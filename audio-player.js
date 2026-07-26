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
          <p class="vedator-audio-card__help">Pozice se ukládá do tohoto zařízení.</p>
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
  let restoringPosition=false;
  let automaticSeek=false;
  let restoreTimer=0;
  let lastSavedSecond=-1;
  let lastControlPointer=0;

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
    if(!currentKey||switchingSource||restoringPosition||automaticSeek||audio.seeking||audio.readyState===0)return;
    if(currentUrl&&audio.currentSrc&&absoluteUrl(currentUrl)!==audio.currentSrc)return;

    const duration=Number.isFinite(audio.duration)?audio.duration:(progress[currentKey]?.duration||0);
    const time=ended&&duration>0?duration:audio.currentTime;
    if(!Number.isFinite(time)||time<0)return;

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

  function clearRestoreTimer(){
    if(restoreTimer){
      clearTimeout(restoreTimer);
      restoreTimer=0;
    }
  }

  function finishRestore(session,key,successful=true){
    if(session!==currentSession||key!==currentKey)return;
    clearRestoreTimer();
    restoringPosition=false;
    automaticSeek=false;
    switchingSource=false;
    help.textContent=successful
      ?`Pokračuje od ${formatTime(audio.currentTime)}. Pozice se průběžně ukládá.`
      :'Uloženou pozici se nepodařilo načíst. Přehrávání a ruční posun jsou nyní odblokované.';
  }

  function cancelRestoreForManualSeek(){
    if(!restoringPosition)return;
    clearRestoreTimer();
    restoringPosition=false;
    automaticSeek=false;
    switchingSource=false;
    help.textContent='Automatické pokračování bylo zrušeno ručním posunem.';
  }

  function resetAudio(save=true){
    if(save)saveCurrentProgress(true);

    switchingSource=true;
    currentSession+=1;
    clearRestoreTimer();
    restoringPosition=false;
    automaticSeek=false;
    audio.onloadedmetadata=null;
    audio.onerror=null;
    try{audio.pause()}catch(error){}
    audio.removeAttribute('src');
    audio.load();

    currentKey='';
    currentTitle='';
    currentUrl='';
    lastSavedSecond=-1;
    switchingSource=false;
  }

  function openAudio(url,title){
    if(!url)return;
    resetAudio(true);

    const session=++currentSession;
    const key=episodeKey(title);
    const record=progress[key];
    const shouldResume=Boolean(record&&!record.completed&&record.currentTime>10);

    currentTitle=title;
    currentKey=key;
    currentUrl=url;
    lastSavedSecond=-1;
    switchingSource=true;
    restoringPosition=shouldResume;
    automaticSeek=false;

    barTitle.textContent=title;
    cardTitle.textContent=title;
    help.textContent=shouldResume
      ?`Načítá se pokračování od ${formatTime(record.currentTime)}…`
      :'Pozice se ukládá do tohoto zařízení.';

    if(!visible()){
      modal.hidden=false;
      document.body.classList.add('vedator-audio-open');
      history.pushState({vedatorAudio:true},'');
      historyEntry=true;
    }

    audio.onloadedmetadata=()=>{
      if(session!==currentSession||currentKey!==key)return;

      if(!shouldResume||!Number.isFinite(audio.duration)||audio.duration<=0){
        restoringPosition=false;
        switchingSource=false;
        help.textContent='Pozice se ukládá do tohoto zařízení.';
        return;
      }

      const target=Math.min(record.currentTime,Math.max(0,audio.duration-1));
      automaticSeek=true;
      try{
        if(typeof audio.fastSeek==='function')audio.fastSeek(target);
        else audio.currentTime=target;
      }catch(error){
        finishRestore(session,key,false);
        return;
      }

      restoreTimer=setTimeout(()=>{
        if(session!==currentSession||!restoringPosition)return;
        finishRestore(session,key,false);
      },5000);
    };

    audio.onerror=()=>{
      if(session!==currentSession)return;
      clearRestoreTimer();
      switchingSource=false;
      restoringPosition=false;
      automaticSeek=false;
      help.textContent='Zvuk se nepodařilo načíst. Zkuste epizodu zavřít a spustit znovu.';
    };

    audio.src=url;
    audio.load();

    const playPromise=audio.play();
    if(playPromise&&typeof playPromise.catch==='function'){
      playPromise.catch(()=>{
        if(session!==currentSession)return;
        if(!restoringPosition)switchingSource=false;
        help.textContent=shouldResume
          ?`Po načtení pozice ${formatTime(record.currentTime)} klepněte na přehrávání.`
          :'Klepněte na tlačítko přehrávání v přehrávači.';
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

  audio.addEventListener('pointerdown',()=>{lastControlPointer=Date.now()});
  audio.addEventListener('touchstart',()=>{lastControlPointer=Date.now()},{passive:true});
  audio.addEventListener('seeking',()=>{
    const manual=Date.now()-lastControlPointer<2000;
    if(manual)cancelRestoreForManualSeek();
  });
  audio.addEventListener('seeked',()=>{
    if(restoringPosition&&automaticSeek){
      finishRestore(currentSession,currentKey,true);
      return;
    }
    saveCurrentProgress(true);
  });
  audio.addEventListener('playing',()=>{
    if(restoringPosition||automaticSeek)return;
    switchingSource=false;
    if(currentKey)help.textContent='Pozice se průběžně ukládá do tohoto zařízení.';
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