(()=>{
  if(window.__vedatorEpisodeChapters)return;
  window.__vedatorEpisodeChapters=true;

  const CHAPTERS={
    300:[
      {seconds:89,title:'Jak bychom se domlouvali s mimozemskou civilizací?'},{seconds:393,title:'Existují barevné galaxie?'},{seconds:494,title:'Poznali bychom úplně jinou mimozemskou civilizaci?'},{seconds:642,title:'Proč se světlo ve vakuu šíří jinak než v látce?'},{seconds:782,title:'Co je vlastně velký třesk?'},{seconds:1152,title:'Jakými zákony regulovat AI?'},{seconds:1449,title:'Proč mají objekty vysokou excentricitu?'},{seconds:1793,title:'Jaké technologie mohou pomoci klimatu?'},{seconds:2192,title:'Jak vznikly Saturnovy prstence?'},{seconds:2347,title:'Změní se souhvězdí v budoucnosti?'},{seconds:2506,title:'Kdy budou další rozhovory o vesmíru?'}
    ],
    326:[
      {seconds:91,title:'Dá se proletět raketou skrz Jupiter?'},{seconds:272,title:'Jak se topí led pod bruslí?'},{seconds:522,title:'Proč se Země otočí vícekrát vůči hvězdám než vůči Slunci?'},{seconds:706,title:'Jak funguje mikrovlnka?'},{seconds:878,title:'V jaké vodě člověk plave rychleji?'},{seconds:977,title:'Jak může černá díra uvěznit světlo?'},{seconds:1117,title:'Jak souvisí kruhové spektrum barev s vlnovými délkami?'},{seconds:1359,title:'Bude se těleso ve vesmíru točit donekonečna?'},{seconds:1524,title:'Nejpřekvapivější experimenty v historii vědy'},{seconds:1847,title:'Může GMO potravina ublížit člověku?'},{seconds:2136,title:'Poděkování od posluchačky Danky'}
    ],
    332:[
      {seconds:140,title:'Jak může být vesmír nekonečný, když se rozpíná?'},{seconds:275,title:'Jak by fungovalo cestování do budoucnosti?'},{seconds:399,title:'Jak velký by musel být člověk, aby překročil všechny lidi?'},{seconds:529,title:'Co bylo dřív – slepice nebo vejce?'},{seconds:667,title:'Jak vznikla naše planeta, hvězdy a kameny?'},{seconds:788,title:'Kdyby se vesmír přestal rozpínat, vznikl by život později?'},{seconds:931,title:'Proč Vikingové měli rohy na přilbách?'},{seconds:1025,title:'Jak čůrají netopýři?'},{seconds:1090,title:'Jaké číslo je před nekonečnem?'},{seconds:1141,title:'Proč není vidět vzduch?'},{seconds:1342,title:'Proč jsou některé rostliny jedovaté?'},{seconds:1520,title:'Proč si ryby nemohou sednout?'},{seconds:1610,title:'Existují draci?'},{seconds:1743,title:'Dá se podívat dovnitř sopky?'},{seconds:1915,title:'Existují mimozemšťané?'}
    ],
    337:[
      {seconds:227,title:'Kvantová náhodnost a skryté parametry'},{seconds:366,title:'Je ve fyzice něco úplně náhodné?'},{seconds:421,title:'Schrödingerova kočka s člověkem a uspávacím plynem'},{seconds:558,title:'Žijeme v simulaci?'},{seconds:755,title:'Mimozemšťané bez gravitace: jak vysvětlit gravitaci?'},{seconds:914,title:'Proč vidíme stále stejnou stranu Měsíce?'},{seconds:1180,title:'Ovlivňuje rotace Země délku letu letadla?'},{seconds:1364,title:'Jak funguje mikrovlnka?'},{seconds:1635,title:'Když si nafoukám helium do uší, budu slyšet jinak?'},{seconds:1729,title:'Proč při fouknutí cítíme teplo a jindy chlad?'},{seconds:1826,title:'Posunul se odhad věku vesmíru na 30 miliard let?'},{seconds:2133,title:'Proč se po zatřesení limonádou zvýší tlak?'},{seconds:2247,title:'Co nejkrásnějšího jste viděli?'}
    ],
    340:[
      {seconds:120,title:'Entropie, absolutní nula a směr času'},{seconds:260,title:'Může kovová kulička opravit rozbitou stěnu?'},{seconds:461,title:'Může se Země převrátit kvůli Džanibekovovu efektu?'},{seconds:703,title:'Proč černá díra pohlcuje věci?'},{seconds:806,title:'Co je kometa 3I/ATLAS?'},{seconds:922,title:'Cíl v počtu přehrání podcastu'},{seconds:1117,title:'Pokrok v solárních plachetnicích'},{seconds:1327,title:'Proč kope kolo pod vysokým napětím?'},{seconds:1411,title:'Může pochodující vojsko zničit most?'},{seconds:1587,title:'Na jaké škole učí Samuel?'},{seconds:1664,title:'Co kdyby galaxie rotovala opačně?'},{seconds:1759,title:'Co znamená slovo rozumět?'},{seconds:1930,title:'Hrajete ještě Magic: The Gathering?'},{seconds:1991,title:'Proč tornádo nepřekročí rovník?'},{seconds:2131,title:'Musí se při letu počítat s rotací Země?'}
    ]
  };

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
    html.theme-dark #episodes article .episode-summary>summary{color:#c8bdff}
    html.theme-dark #episodes article .episode-summary .summary-time{color:#b9adff}
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
    const number=episodeNumber(article?.querySelector('h2')?.textContent);
    if(!CHAPTERS[number])return;
    const seconds=parseTime(block.querySelector('.summary-time')?.textContent);
    const play=article.querySelector('.links .primary');
    if(!Number.isFinite(seconds)||!play)return;
    event.preventDefault();event.stopPropagation();
    window.__vedatorRequestedStart={episode:number,time:seconds,createdAt:Date.now()};
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
    function activeChapters(){return CHAPTERS[episodeNumber(titleNode.textContent)]||null}
    function sync(){
      const chapters=activeChapters();
      row.classList.toggle('active',Boolean(chapters));
      if(!chapters)return;
      const current=audio.currentTime||0;
      previous.disabled=!chapters.some(chapter=>chapter.seconds<current-1);
      next.disabled=!chapters.some(chapter=>chapter.seconds>current+1);
    }
    function jump(seconds){
      if(!activeChapters())return;
      try{audio.currentTime=seconds}catch{return}
      audio.play().catch(()=>{});sync();
    }
    previous.onclick=()=>{const chapters=activeChapters();if(!chapters)return;const current=audio.currentTime||0;const earlier=chapters.filter(chapter=>chapter.seconds<current-1);const target=earlier[earlier.length-1];if(target)jump(target.seconds)};
    next.onclick=()=>{const chapters=activeChapters();if(!chapters)return;const current=audio.currentTime||0;const target=chapters.find(chapter=>chapter.seconds>current+1);if(target)jump(target.seconds)};
    let lastSecond=-1;
    audio.addEventListener('timeupdate',()=>{const second=Math.floor(audio.currentTime||0);if(second===lastSecond)return;lastSecond=second;sync()});
    audio.addEventListener('loadedmetadata',sync);
    new MutationObserver(sync).observe(titleNode,{childList:true,characterData:true,subtree:true});
    sync();return true;
  }
  if(!installControls()){
    const observer=new MutationObserver((_,self)=>{if(installControls())self.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
  }
})();