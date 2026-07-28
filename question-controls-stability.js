(()=>{
  if(window.__vedatorQuestionControlsStability)return;
  window.__vedatorQuestionControlsStability=true;

  const FAQ_EPISODES=new Set([190,218,226,244,248,257,263,270,272,278,284,289,295,300,313,319,326,332,337,340]);
  const style=document.createElement('style');
  style.textContent='.vedator-question-controls.vedator-faq-visible{display:grid!important}';
  document.head.appendChild(style);

  function episodeNumber(value){
    return Number(String(value||'').match(/\b(?:podcast\s*)?(\d{2,4})\b/i)?.[1]||0);
  }

  function sync(){
    const card=document.querySelector('.vedator-audio-card');
    const title=card?.querySelector('.vedator-audio-card__title');
    const rows=card?.querySelectorAll('.vedator-question-controls');
    if(!card||!title||!rows?.length)return false;

    const number=episodeNumber(title.textContent);
    if(!number)return true;

    const visible=FAQ_EPISODES.has(number);
    rows.forEach(row=>{
      row.classList.toggle('vedator-faq-visible',visible&&(!row.classList.contains('vedator-190-218-226-controls')||[190,218,226].includes(number)));
      if(!visible)row.classList.remove('active');
    });
    return true;
  }

  let titleObserver=null;
  function install(){
    const title=document.querySelector('.vedator-audio-card__title');
    if(!title||!sync())return false;
    if(titleObserver)titleObserver.disconnect();
    titleObserver=new MutationObserver(sync);
    titleObserver.observe(title,{childList:true,characterData:true,subtree:true});
    return true;
  }

  if(!install()){
    const observer=new MutationObserver(()=>{
      if(install())observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener('play',sync,true);
  document.addEventListener('loadedmetadata',sync,true);
})();