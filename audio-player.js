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
          <div class="vedator-audio-seek-box">
            <div class="vedator-audio-seek-label">Přesný posun v epizodě</div>
            <input class="vedator-audio-seek" type="range" min="0" max="1" value="0" step="1" disabled aria-label="Pozice v epizodě">
            <div class="vedator-audio-seek-times"><span class="vedator-audio-current">0:00</span><span class="vedator-audio-duration">–:––</span></div>
          </div>
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
  const seek=modal.querySelector('.vedator-audio-seek');
  const currentTimeLabel=modal.querySelector('.vedator-audio-current');
  const durationLabel=modal.querySelector('.vedator-audio-duration');

  let historyEntry=false;
  let currentKey='';
  let currentTitle='';
  let currentUrl='';
  let currentSession=0;
  let lastSavedSecond=-1;
  let restoreTarget=null;
  let restoreTimer=0;
  let isUserSeeking=false;
  let allowBackwardSaveUntil=0;

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

  function clearRestore(){
    if(restoreTimer){
      clearTimeout(restoreTimer);
      restoreTimer=0;
    }
    restoreTarget=null;
  }

  function updateSeekDisplay(usePreview=false){
    const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:0;
    if(duration>0){
      seek.disabled=false;
      seek.max=String(Math.floor(duration));
      durationLabel.textContent=formatTime(duration);
    }else{
      seek.disabled=true;
      seek.max='1';
      durationLabel.textContent='–:––';
    }

    if(!isUserSeeking&&!usePreview){
      const value=Number.isFinite(audio.currentTime)?audio.currentTime:0;
      seek.value=String(Math.min(Number(seek.max)||1,Math.max(0,Math.floor(value))));
    }
    currentTimeLabel.textContent=formatTime(Number(seek.value)||0);
  }

  function saveCurrentProgress(force=false,ended=false){
    if(!currentKey||isUserSeeking||audio.seeking||audio.readyState===0)return;
    if(currentUrl&&audio.currentSrc&&absoluteUrl(currentUrl)!==audio.currentSrc)return;

    const previous=progress[currentKey]||{};
    const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:(previous.duration||0);
    const time=ended&&duration>0?duration:audio.currentTime;
    if(!Number.isFinite(time)||time<0)return;

    if(restoreTarget!==null&&time<restoreTarget-4)return;
    if(previous.currentTime>30&&time<previous.currentTime-15&&Date.now()>allowBackwardSaveUntil&&!ended)return;

    const second=Math.floor(time);
    if(!force&&lastSavedSecond>=0&&Math.abs(second-lastSavedSecond)<5)return;
    lastSavedSecond=second;

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
        play.textContent='Přehrát znovu';
      }else{
        badge.className='vedator-listen-status in-progress';
        badge.textContent=`▶ Rozposloucháno${percent?` · ${percent} %`:''}`;
        article.classList.add('vedator-in-progress');
        article.classList.remove('vedator-listened');
        play.textContent=`Pokračovat ${formatTime(record.currentTime)}`;
      }
    });
  }

  function cancelAutomaticRestore(message='Automatické pokračování bylo zrušeno ručním posunem.'){
    if(restoreTarget===null)return;
    clearRestore();
    help.textContent=message;
  }

  function resetAudio(save=true){
    if(save)saveCurrentProgress(true);
    currentSession+=1;
    clearRestore();
    audio.onloadedmetadata=null;
    audio.onerror=null;
    try{audio.pause()}catch(error){}
    audio.removeAttribute('src');
    audio.load();
    currentKey='';
    currentTitle='';
    currentUrl='';
    lastSavedSecond=-1;
    isUserSeeking=false;
    seek.disabled=true;
    seek.value='0';
    currentTimeLabel.textContent='0:00';
    durationLabel.textContent='–:––';
  }

  function attemptPlay(session,shouldResume,record){
    const promise=audio.play();
    if(promise&&typeof promise.catch==='function'){
      promise.catch(()=>{
        if(session!==currentSession)return;
        help.textContent=shouldResume
          ?`Pozice ${formatTime(record.currentTime)} je připravena. Klepněte na přehrávání.`
          :'Klepněte na tlačítko přehrávání v přehrávači.';
      });
    }
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
      updateSeekDisplay();

      if(shouldResume&&Number.isFinite(audio.duration)&&audio.duration>0){
        const target=Math.min(record.currentTime,Math.max(0,audio.duration-1));
        restoreTarget=target;
        try{
          audio.currentTime=target;
          seek.value=String(Math.floor(target));
          updateSeekDisplay(true);
        }catch(error){
          clearRestore();
          help.textContent='Uloženou pozici se nepodařilo načíst. Můžete se posunout ručně.';
        }
        restoreTimer=setTimeout(()=>{
          if(session!==currentSession||restoreTarget===null)return;
          clearRestore();
          help.textContent='Automatický posun trval příliš dlouho. Ruční posun je plně dostupný.';
        },4000);
      }else{
        clearRestore();
        help.textContent='Pozice se ukládá do tohoto zařízení.';
      }
    };

    audio.onerror=()=>{
      if(session!==currentSession)return;
      clearRestore();
      help.textContent='Zvuk se nepodařilo načíst. Zkuste epizodu zavřít a spustit znovu.';
    };

    audio.src=url;
    audio.load();
    attemptPlay(session,shouldResume,record||{});

    if('mediaSession'in navigator&&'MediaMetadata'in window){
      navigator.mediaSession.metadata=new MediaMetadata({title,artist:'Vedátorský podcast'});
    }
  }

  function commitManualSeek(){
    if(seek.disabled||!currentKey)return;
    const target=Math.max(0,Math.min(Number(seek.max)||0,Number(seek.value)||0));
    cancelAutomaticRestore();
    allowBackwardSaveUntil=Date.now()+4000;
    try{audio.currentTime=target}catch(error){}
    isUserSeeking=false;
    currentTimeLabel.textContent=formatTime(target);
    help.textContent=`Posunuto na ${formatTime(target)}.`;
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

  seek.addEventListener('pointerdown',()=>{
    isUserSeeking=true;
    cancelAutomaticRestore();
  });
  seek.addEventListener('touchstart',()=>{
    isUserSeeking=true;
    cancelAutomaticRestore();
  },{passive:true});
  seek.addEventListener('input',()=>{
    isUserSeeking=true;
    cancelAutomaticRestore();
    updateSeekDisplay(true);
  });
  seek.addEventListener('change',commitManualSeek);
  seek.addEventListener('pointerup',commitManualSeek);
  seek.addEventListener('touchend',commitManualSeek,{passive:true});
  seek.addEventListener('keyup',event=>{
    if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key))commitManualSeek();
  });

  audio.addEventListener('durationchange',updateSeekDisplay);
  audio.addEventListener('loadeddata',updateSeekDisplay);
  audio.addEventListener('timeupdate',()=>{
    updateSeekDisplay();
    saveCurrentProgress(false);
  });
  audio.addEventListener('seeked',()=>{
    if(restoreTarget!==null){
      const target=restoreTarget;
      clearRestore();
      help.textContent=`Pokračuje od ${formatTime(target)}. Pozice se průběžně ukládá.`;
    }
    isUserSeeking=false;
    updateSeekDisplay();
    saveCurrentProgress(true);
  });
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