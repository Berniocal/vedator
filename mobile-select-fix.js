(()=>{
  if(window.__vedatorMobileSelectFix)return;
  window.__vedatorMobileSelectFix=true;

  document.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    const select=event.target.closest?.('select.sort');
    if(!select||select.disabled||select.classList.contains('hidden'))return;
    if(typeof select.showPicker!=='function')return;
    event.preventDefault();
    event.stopPropagation();
    try{
      select.focus({preventScroll:true});
      select.showPicker();
    }catch{}
  },true);
})();