(()=>{
  if(window.__vedatorAudioPlayer)return;
  window.__vedatorAudioPlayer=true;

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
          <p class="vedator-audio-card__help">Přehrávání zůstává uvnitř aplikace. Po zavření okna se přehrávač zastaví.</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const back=modal.querySelector('.vedator-audio-modal__back');
  const barTitle=modal.querySelector('.vedator-audio-modal__title');
  const cardTitle=modal.querySelector('.vedator-audio-card__title');
  const audio=modal.querySelector('audio');
  let historyEntry=false;

  const visible=()=>!modal.hidden;
  const episodeTitle=element=>element.closest('article')?.querySelector('h2')?.textContent?.trim()||'Vedátorský podcast';

  function openAudio(url,title){
    if(!url)return;
    barTitle.textContent=title;
    cardTitle.textContent=title;
    audio.src=url;
    if(!visible()){
      modal.hidden=false;
      document.body.classList.add('vedator-audio-open');
      history.pushState({vedatorAudio:true},'');
      historyEntry=true;
    }
    audio.play().catch(()=>{});
    if('mediaSession'in navigator&&'MediaMetadata'in window){
      navigator.mediaSession.metadata=new MediaMetadata({title,artist:'Vedátorský podcast'});
    }
  }

  function hideAudio(){
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    modal.hidden=true;
    document.body.classList.remove('vedator-audio-open');
  }

  function requestClose(){
    if(historyEntry)history.back();
    else hideAudio();
  }

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
})();