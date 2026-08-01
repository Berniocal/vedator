(()=>{
  if(window.__vedatorQuestionCountLanguage)return;
  window.__vedatorQuestionCountLanguage=true;

  const NativeMutationObserver=window.MutationObserver;
  const nativeAddEventListener=window.addEventListener.bind(window);
  const nativeRemoveEventListener=window.removeEventListener.bind(window);

  if(!window.__vedatorLanguageBatchController){
    const listeners=[];
    let generation=0;

    window.__vedatorLanguageBatching=false;

    window.MutationObserver=class VedatorMutationObserver extends NativeMutationObserver{
      constructor(callback){
        super((records,observer)=>{
          if(window.__vedatorLanguageBatching)return;
          callback(records,observer);
        });
      }
    };

    window.addEventListener=function(type,listener,options){
      if(type==='vedatorlanguagechange'&&listener){
        listeners.push({listener,options});
        return;
      }
      return nativeAddEventListener(type,listener,options);
    };

    window.removeEventListener=function(type,listener,options){
      if(type==='vedatorlanguagechange'&&listener){
        const index=listeners.findIndex(item=>item.listener===listener);
        if(index>=0)listeners.splice(index,1);
        return;
      }
      return nativeRemoveEventListener(type,listener,options);
    };

    nativeAddEventListener('vedatorlanguagechange',event=>{
      const current=++generation;
      const queue=listeners.slice();
      let index=0;
      window.__vedatorLanguageBatching=true;

      const finish=()=>{
        setTimeout(()=>{
          if(current===generation)window.__vedatorLanguageBatching=false;
        },0);
      };

      const step=()=>{
        if(current!==generation)return;
        const end=Math.min(index+4,queue.length);
        for(;index<end;index++){
          const entry=queue[index];
          try{
            if(typeof entry.listener==='function')entry.listener.call(window,event);
            else entry.listener?.handleEvent?.(event);
          }catch(error){
            setTimeout(()=>{throw error},0);
          }
          if(entry.options&&typeof entry.options==='object'&&entry.options.once){
            const originalIndex=listeners.findIndex(item=>item.listener===entry.listener);
            if(originalIndex>=0)listeners.splice(originalIndex,1);
          }
        }
        if(index<queue.length)requestAnimationFrame(step);
        else finish();
      };

      requestAnimationFrame(step);
    });

    window.__vedatorLanguageBatchController={listeners};
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
  new NativeMutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  nativeAddEventListener('vedatorlanguagechange',schedule);

  if(!document.querySelector('script[data-vedator-translations-158-end-143-part1]')){
    const script=document.createElement('script');
    script.src='./question-translations-158-end-143-part1.js';
    script.async=false;
    script.dataset.vedatorTranslations158End143Part1='1';
    document.head.appendChild(script);
  }

  if(!document.querySelector('script[data-vedator-translations-143-end-138-part1]')){
    const script=document.createElement('script');
    script.src='./question-translations-143-end-138-part1.js';
    script.async=false;
    script.dataset.vedatorTranslations143End138Part1='1';
    document.head.appendChild(script);
  }

  if(!document.querySelector('script[data-vedator-translations-138-end-133-part1]')){
    const script=document.createElement('script');
    script.src='./question-translations-138-end-133-part1.js';
    script.async=false;
    script.dataset.vedatorTranslations138End133Part1='1';
    document.head.appendChild(script);
  }

  if(!document.querySelector('script[data-vedator-translations-128-part1]')){
    const script=document.createElement('script');
    script.src='./question-translations-128-part1.js';
    script.async=false;
    script.dataset.vedatorTranslations128Part1='1';
    document.head.appendChild(script);
  }

  if(!document.querySelector('script[data-vedator-translations-128-end-119-part1]')){
    const script=document.createElement('script');
    script.src='./question-translations-128-end-119-part1.js';
    script.async=false;
    script.dataset.vedatorTranslations128End119Part1='1';
    document.head.appendChild(script);
  }

  if(!document.querySelector('script[data-vedator-translations-119-end-112-part1]')){
    const script=document.createElement('script');
    script.src='./question-translations-119-end-112-part1.js';
    script.async=false;
    script.dataset.vedatorTranslations119End112Part1='1';
    document.head.appendChild(script);
  }
})();
