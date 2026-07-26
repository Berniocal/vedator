(()=>{
  if(window.__vedatorInAppViewer)return;
  window.__vedatorInAppViewer=true;

  const viewer=document.createElement('section');
  viewer.className='vedator-viewer';
  viewer.hidden=true;
  viewer.setAttribute('role','dialog');
  viewer.setAttribute('aria-modal','true');
  viewer.innerHTML=`
    <div class="vedator-viewer__shell">
      <div class="vedator-viewer__bar">
        <button class="vedator-viewer__back" type="button" aria-label="Zavřít">←</button>
        <div class="vedator-viewer__title">Detail dílu</div>
        <a class="vedator-viewer__external" href="#" target="_blank" rel="noopener">Prohlížeč ↗</a>
      </div>
      <div class="vedator-viewer__notice">Pokud se stránka nezobrazí, její provozovatel zakázal vložení. Použijte tlačítko „Prohlížeč“.</div>
      <iframe class="vedator-viewer__frame" title="Detail podcastu" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <div class="vedator-viewer__audio" hidden>
        <div class="vedator-audio-card">
          <div class="vedator-audio-card__kicker">Vedátorský podcast</div>
          <div class="vedator-audio-card__title"></div>
          <audio controls playsinline preload="metadata"></audio>
          <p class="vedator-audio-card__help">Přehrávání zůstává uvnitř aplikace. Po zavření okna se přehrávač zastaví.</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(viewer);

  const back=viewer.querySelector('.vedator-viewer__back');
  const titleEl=viewer.querySelector('.vedator-viewer__title');
  const external=viewer.querySelector('.vedator-viewer__external');
  const notice=viewer.querySelector('.vedator-viewer__notice');
  const frame=viewer.querySelector('.vedator-viewer__frame');
  const audioPanel=viewer.querySelector('.vedator-viewer__audio');
  const audioTitle=viewer.querySelector('.vedator-audio-card__title');
  const audio=viewer.querySelector('audio');
  let historyEntry=false;

  const visible=()=>!viewer.hidden;
  const episodeTitle=element=>{
    const article=element.closest('article');
    if(article?.querySelector('h2'))return article.querySelector('h2').textContent.trim();
    const seriesTitle=element.querySelector?.('.episode-title')?.textContent?.trim();
    return seriesTitle||element.textContent.trim()||'Vedátorský podcast';
  };

  function prepare(url,title){
    titleEl.textContent=title||'Vedátorský podcast';
    external.href=url;
    if(!visible()){
      viewer.hidden=false;
      document.body.classList.add('vedator-viewer-open');
      history.pushState({vedatorViewer:true},'');
      historyEntry=true;
    }
  }

  function openPage(url,title){
    prepare(url,title);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audioPanel.hidden=true;
    frame.hidden=false;
    notice.hidden=false;
    frame.src=url;
  }

  function openAudio(url,title){
    prepare(url,title);
    frame.src='about:blank';
    frame.hidden=true;
    notice.hidden=true;
    audioPanel.hidden=false;
    audioTitle.textContent=title||'Vedátorský podcast';
    audio.src=url;
    audio.play().catch(()=>{});
    if('mediaSession'in navigator&&'MediaMetadata'in window){
      navigator.mediaSession.metadata=new MediaMetadata({title:title||'Vedátorský podcast',artist:'Vedátorský podcast'});
    }
  }

  function hideViewer(){
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    frame.src='about:blank';
    viewer.hidden=true;
    document.body.classList.remove('vedator-viewer-open');
  }

  function requestClose(){
    if(historyEntry){
      history.back();
    }else{
      hideViewer();
    }
  }

  back.addEventListener('click',requestClose);
  window.addEventListener('popstate',()=>{
    if(visible()){
      historyEntry=false;
      hideViewer();
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&visible())requestClose();
  });

  document.addEventListener('click',event=>{
    const target=event.target.closest('a,button');
    if(!target)return;

    const links=target.closest('.links');
    const series=target.closest('.series-body');
    const directPlay=target.classList.contains('inapp-play');
    const directDetail=target.classList.contains('inapp-detail');
    if(!links&&!series&&!directPlay&&!directDetail)return;

    const url=target.dataset.url||target.getAttribute('href');
    if(!url||url==='#')return;

    const isPlay=directPlay||(links&&target.classList.contains('primary'));
    const isDetail=directDetail||series||(links&&target.classList.contains('secondary'));
    if(!isPlay&&!isDetail)return;

    event.preventDefault();
    event.stopPropagation();
    const title=target.dataset.title||episodeTitle(target);
    isPlay?openAudio(url,title):openPage(url,title);
  },true);
})();
