(()=>{
  if(window.__vedatorQuestionCountLanguage)return;
  window.__vedatorQuestionCountLanguage=true;

  if(!window.__vedatorLanguageMutationGuard){
    const NativeMutationObserver=window.MutationObserver;
    window.MutationObserver=class VedatorMutationObserver extends NativeMutationObserver{
      constructor(callback){
        super((records,observer)=>{
          if(window.__vedatorLanguageChanging)return;
          callback(records,observer);
        });
      }
    };
    window.__vedatorLanguageMutationGuard=true;
    let switchToken=0;
    document.addEventListener('click',event=>{
      if(!event.target.closest?.('.vedator-language-switch button[data-lang]'))return;
      const token=++switchToken;
      window.__vedatorLanguageChanging=true;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(token===switchToken)window.__vedatorLanguageChanging=false;
      }));
    },true);
  }

  const normalizeLanguage=value=>{
    const lang=String(value||'').toLowerCase();
    if(lang.startsWith('sk'))return 'sk';
    if(lang.startsWith('cs')||lang.startsWith('cz'))return 'cs';
    return '';
  };
  const language=()=>{
    try{
      const ui=normalizeLanguage(window.vedatorUiLanguage?.());
      if(ui)return ui;
    }catch(_){}
    const html=normalizeLanguage(document.documentElement.lang);
    if(html)return html;
    try{
      const stored=localStorage.getItem('vedator-ui-language-v1')||localStorage.getItem('vedator-ui-language')||localStorage.getItem('vedator-language');
      return normalizeLanguage(stored)||'cs';
    }catch(_){return 'cs'}
  };

  const numberFrom=text=>Number(String(text).match(/^\s*(\d+)/)?.[1]);
  const foundPattern=/^\s*\d+\s+(?:nalezená otázka|nalezené otázky|nalezených otázek|nájdená otázka|nájdené otázky|nájdených otázok)\s*$/i;
  const totalPattern=/^\s*\d+\s+(?:otázek|otázok)\s*$/i;
  const foundLabel=(n,sk)=>{
    if(sk)return n===1?'1 nájdená otázka':n>=2&&n<=4?`${n} nájdené otázky`:`${n} nájdených otázok`;
    return n===1?'1 nalezená otázka':n>=2&&n<=4?`${n} nalezené otázky`:`${n} nalezených otázek`;
  };

  let applying=false,scheduled=false;
  function translateNode(node,sk){
    if(!node)return;
    const text=(node.textContent||'').trim();
    let next='';
    if(foundPattern.test(text))next=foundLabel(numberFrom(text),sk);
    else if(totalPattern.test(text))next=`${numberFrom(text)} ${sk?'otázok':'otázek'}`;
    else if(/^(?:Hledám|Hľadám) otázky…?$/.test(text))next=sk?'Hľadám otázky…':'Hledám otázky…';
    else if(/^(?:Načítám|Načítavam) otázky…?$/.test(text))next=sk?'Načítavam otázky…':'Načítám otázky…';
    if(next&&node.textContent!==next)node.textContent=next;
  }
  function apply(){
    if(applying)return;
    applying=true;
    try{
      const sk=language()==='sk';
      translateNode(document.querySelector('#count'),sk);
      document.querySelectorAll('.faq-loading').forEach(node=>translateNode(node,sk));
    }finally{applying=false}
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;apply()});
  }

  apply();
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('vedatorlanguagechange',schedule);
})();
