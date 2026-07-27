(()=>{
  if(window.__vedatorViewLayoutFix)return;
  window.__vedatorViewLayoutFix=true;

  const topics=document.querySelector('#topics');
  const tabs=document.querySelector('.tabs');
  if(!topics||!tabs)return;

  function isEpisodesTab(tab){
    if(!tab)return false;
    const view=String(tab.dataset.view||'').toLowerCase();
    const text=String(tab.textContent||'').trim().toLowerCase();
    return view==='episodes'||text==='epizódy'||text==='epizody';
  }

  function sync(){
    const active=tabs.querySelector('.tab.active');
    const show=isEpisodesTab(active);
    topics.classList.toggle('hidden',!show);
    topics.hidden=!show;
    topics.style.setProperty('display',show?'':'none',show?'':'important');
    topics.setAttribute('aria-hidden',String(!show));
  }

  tabs.addEventListener('click',()=>{
    requestAnimationFrame(sync);
    setTimeout(sync,0);
    setTimeout(sync,80);
  },true);

  new MutationObserver(sync).observe(tabs,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  new MutationObserver(sync).observe(topics,{attributes:true,attributeFilter:['class','style','hidden']});
  sync();
})();