(()=>{
  if(window.__vedatorActionLabelsFix)return;
  window.__vedatorActionLabelsFix=true;

  const language=()=>window.vedatorUiLanguage?.()==='cz'?'cz':'sk';
  const selector='#episodes .links .primary,#episodes button,#questions .faq-play,#questions .faq-more';

  function translated(text){
    const lang=language();
    let match;
    if((match=text.match(/^(Pokračovat|Pokračovať)(.*)$/i)))return(lang==='sk'?'Pokračovať':'Pokračovat')+match[2];
    if((match=text.match(/^(Pokračovat znovu|Pokračovať znovu)(.*)$/i)))return(lang==='sk'?'Pokračovať znovu':'Pokračovat znovu')+match[2];
    if(/^(Přehrát|Prehrať)$/i.test(text))return lang==='sk'?'Prehrať':'Přehrát';
    if(/^(Přehrát znovu|Prehrať znovu)$/i.test(text))return lang==='sk'?'Prehrať znovu':'Přehrát znovu';
    if(/^(Číst více|Čítať viac)$/i.test(text))return lang==='sk'?'Čítať viac':'Číst více';
    if(/^(Číst méně|Čítať menej)$/i.test(text))return lang==='sk'?'Čítať menej':'Číst méně';
    return null;
  }

  function update(element){
    if(!element?.matches?.(selector))return;
    const current=element.textContent.trim();
    const next=translated(current);
    if(/^(Pokračovat|Pokračovať)/i.test(current))delete element.dataset.vedatorButtonKey;
    if(next&&next!==current)element.textContent=next;
  }

  function scan(root=document){
    if(root.nodeType===1)update(root);
    root.querySelectorAll?.(selector).forEach(update);
  }

  let queued=false;
  const observer=new MutationObserver(records=>{
    if(queued)return;
    const relevant=records.some(record=>{
      if(record.type==='characterData')return record.target.parentElement?.matches?.(selector);
      return [...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.(selector)||node.querySelector?.(selector)));
    });
    if(!relevant)return;
    queued=true;
    queueMicrotask(()=>{queued=false;observer.disconnect();scan();observe()});
  });
  const observe=()=>observer.observe(document.body,{childList:true,subtree:true,characterData:true});

  window.addEventListener('vedatorlanguagechange',()=>scan());
  document.addEventListener('click',event=>{if(event.target.closest?.('#episodes button,#questions .faq-more'))queueMicrotask(()=>scan())},true);
  scan();
  observe();
})();