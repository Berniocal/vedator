(()=>{
  if(window.__vedatorEpisode300Chapters)return;
  window.__vedatorEpisode300Chapters=true;

  const CHAPTERS=[
    {seconds:89,title:'Jak bychom se domlouvali s mimozemskou civilizací?'},
    {seconds:393,title:'Existují barevné galaxie?'},
    {seconds:494,title:'Poznali bychom úplně jinou mimozemskou civilizaci?'},
    {seconds:642,title:'Proč se světlo ve vakuu šíří jinak než v látce?'},
    {seconds:782,title:'Co je vlastně velký třesk?'},
    {seconds:1152,title:'Jakými zákony regulovat AI?'},
    {seconds:1449,title:'Proč mají objekty vysokou excentricitu?'},
    {seconds:1793,title:'Jaké technologie mohou pomoci klimatu?'},
    {seconds:2192,title:'Jak vznikly Saturnovy prstence?'},
    {seconds:2347,title:'Změní se souhvězdí v budoucnosti?'},
    {seconds:2506,title:'Kdy budou další rozhovory o vesmíru?'}
  ];

  const style=document.createElement('style');
  style.textContent=`
    #episodes article .episode-summary .summary-block{cursor:pointer;border-radius:10px;padding:6px 8px;margin-left:-8px;margin-right:-8px;touch-action:manipulation}
    #episodes article .episode-summary .summary-block:active{background:rgba(91,75,219,.1)}
    #episodes article .episode-summary .summary-time{text-decoration:underline;text-underline-offset:3px}
    .vedator-question-controls{display:none;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .vedator-question-controls.active{display:grid}
    .vedator-question-btn{border:1px solid #d8d1ff;background:linear-gradient(180deg,#f7f5ff,#ebe7ff);color:#392b9b;border-radius:14px;min-height:46px;padding:8px 10px;font:inherit;font-weight:800;cursor:pointer;touch-action:manipulation}
    .vedator-question-btn:disabled{opacity:.5;cursor:not-allowed}
    html.theme-dark .vedator-question-btn{background:linear-gradient(180deg,#273147,#1d2534);border-color:#3c4963;color:#ece8ff}
  `;
  document.head.appendChild(style);

  function episodeNumber(value){return Number(String(value||'').match(/\bpodcast\s+(\d+)\b/i)?.[1]||0)}
  function parseTime(value){
    const parts=String(value||'').trim().match(/\d{1,2}:\d{2}(?::\d{2})?/)?.[0]?.split(':').map(Number);
    if(!parts)return null;
    return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];
  }

  document.addEventListener('click',event=>{
    const block=event.target.closest('#episodes article .episode-summary .summary-block');
    if(!block)return;
    const article=block.closest('article');
    if(episodeNumber(article?.querySelector('h2')?.textContent)!==300)return;
    const seconds=parseTime(block.querySelector('.summary-time')?.textContent);
    const play=article.querySelector('.links .primary');
    if(!Number.isFinite(seconds)||!play)return;
    event.preventDefault();event.stopPropagation();
    window.__vedatorRequestedStart={episode:300,time:seconds,createdAt:Date.now()};
    play.click();
  },true);

  function installControls(){
    const card=document.querySelector('.vedator-audio-card');
    const audio=card?.querySelector('audio');
    const controls=card?.querySelector('.vedator-custom-controls');
    const titleNode=card?.querySelector('.vedator-audio-card__title');
    if(!card||!audio||!controls||!titleNode)return false;
    if(controls.querySelector('.vedator-question-controls'))return true;

    const row=document.createElement('div');
    row.className='vedator-question-controls';
    row.innerHTML='<button type="button" class="vedator-question-btn previous-question">← Předchozí otázka</button><button type="button" class="vedator-question-btn next-question">Další otázka →</button>';
    controls.appendChild(row);
    const previous=row.querySelector('.previous-question');
    const next=row.querySelector('.next-question');

    function isEpisode300(){return episodeNumber(titleNode.textContent)===300}
    function sync(){
      const active=isEpisode300();
      row.classList.toggle('active',active);
      if(!active)return;
      const current=audio.currentTime||0;
      previous.disabled=!CHAPTERS.some(chapter=>chapter.seconds<current-1);
      next.disabled=!CHAPTERS.some(chapter=>chapter.seconds>current+1);
    }
    function jump(seconds){
      if(!isEpisode300())return;
      try{audio.currentTime=seconds}catch{return}
      audio.play().catch(()=>{});
      sync();
    }
    previous.onclick=()=>{
      const current=audio.currentTime||0;
      const earlier=CHAPTERS.filter(chapter=>chapter.seconds<current-1);
      const target=earlier[earlier.length-1];
      if(target)jump(target.seconds);
    };
    next.onclick=()=>{
      const current=audio.currentTime||0;
      const target=CHAPTERS.find(chapter=>chapter.seconds>current+1);
      if(target)jump(target.seconds);
    };

    let lastSecond=-1;
    audio.addEventListener('timeupdate',()=>{
      const second=Math.floor(audio.currentTime||0);
      if(second===lastSecond)return;
      lastSecond=second;sync();
    });
    audio.addEventListener('loadedmetadata',sync);
    new MutationObserver(sync).observe(titleNode,{childList:true,characterData:true,subtree:true});
    sync();
    return true;
  }

  if(!installControls()){
    const observer=new MutationObserver((_,self)=>{if(installControls())self.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
  }
})();