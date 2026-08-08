(()=>{
  if(window.__vedatorPlaylistEditorMobile)return;
  window.__vedatorPlaylistEditorMobile=true;

  const editor=document.querySelector('.vedator-editor');
  if(!editor)return;
  const box=editor.querySelector('.vedator-editor-box');
  const sourceSwitch=editor.querySelector('.vedator-source-switch');
  const columns=editor.querySelector('.vedator-editor-columns');
  const order=editor.querySelector('.vedator-edit-order');
  const choices=editor.querySelector('.vedator-editor-list');
  const search=editor.querySelector('.vedator-editor-search');
  if(!box||!sourceSwitch||!columns||!order||!choices)return;

  const PLAYLIST_KEY='vedator-user-playlists-v1';
  const language=()=>{try{return window.vedatorUiLanguage?.()==='sk'?'sk':'cz'}catch{return'cz'}};
  const text=(cz,sk)=>language()==='sk'?sk:cz;
  const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value};

  const style=document.createElement('style');
  style.textContent=`
    .vedator-editor-work-switch{display:none}
    @media(max-width:650px){
      .vedator-editor{padding:6px;align-items:stretch}
      .vedator-editor-box.vedator-editor-mobile-enhanced{
        width:100%;height:calc(100dvh - 12px);max-height:calc(100dvh - 12px);
        grid-template-rows:auto auto auto minmax(0,1fr) auto;border-radius:18px
      }
      .vedator-editor-mobile-enhanced .vedator-editor-head{padding:10px 13px}
      .vedator-editor-mobile-enhanced .vedator-editor-head strong{font-size:1.05rem}
      .vedator-editor-mobile-enhanced .vedator-source-switch{padding:7px 10px;gap:6px}
      .vedator-editor-mobile-enhanced .vedator-source-switch button{flex:1;padding:7px 10px}
      .vedator-editor-work-switch{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:7px 10px;border-bottom:1px solid var(--line)}
      .vedator-editor-work-switch button{min-width:0;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:10px;padding:8px 7px;font:inherit;font-size:.86rem;font-weight:800;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .vedator-editor-work-switch button.active{background:var(--accent2);border-color:var(--accent);color:var(--accent)}
      .vedator-editor-mobile-enhanced .vedator-editor-columns{display:block;min-height:0;overflow:hidden}
      .vedator-editor-mobile-enhanced .vedator-editor-pane{height:100%;min-height:0;padding:9px 9px 0}
      .vedator-editor-mobile-enhanced .vedator-editor-pane+.vedator-editor-pane{border:0}
      .vedator-editor-mobile-enhanced[data-mobile-section="added"] .vedator-editor-pane:nth-child(2),
      .vedator-editor-mobile-enhanced[data-mobile-section="add"] .vedator-editor-pane:nth-child(1){display:none}
      .vedator-editor-mobile-enhanced .vedator-editor-pane h3{margin:1px 1px 7px;font-size:1rem;line-height:1.2}
      .vedator-editor-mobile-enhanced .vedator-editor-scroll{height:100%;padding-bottom:9px;overscroll-behavior:contain}
      .vedator-editor-mobile-enhanced .vedator-editor-search{margin-bottom:7px;padding:9px 11px;border-radius:10px;font-size:.94rem}
      .vedator-editor-mobile-enhanced .vedator-editor-list,
      .vedator-editor-mobile-enhanced .vedator-edit-order{gap:5px}
      .vedator-editor-mobile-enhanced .vedator-editor-choice,
      .vedator-editor-mobile-enhanced .vedator-edit-row{gap:7px;border-radius:10px;padding:7px 9px;min-height:0}
      .vedator-editor-mobile-enhanced .vedator-editor-choice{grid-template-columns:24px minmax(0,1fr) auto;font-size:.92rem;line-height:1.2}
      .vedator-editor-mobile-enhanced .vedator-editor-choice input{width:18px;height:18px;margin:0}
      .vedator-editor-mobile-enhanced .vedator-editor-choice small{font-size:.78rem;white-space:nowrap}
      .vedator-editor-mobile-enhanced .vedator-edit-row{grid-template-columns:32px minmax(0,1fr) 30px;font-size:.91rem;line-height:1.18}
      .vedator-editor-mobile-enhanced .vedator-edit-row b{font-size:.93rem}
      .vedator-editor-mobile-enhanced .vedator-item-sub{font-size:.76rem}
      .vedator-editor-mobile-enhanced .vedator-edit-controls{gap:0}
      .vedator-editor-mobile-enhanced .vedator-edit-move,
      .vedator-editor-mobile-enhanced .vedator-edit-remove{min-width:28px;min-height:27px;padding:2px;font-size:.88rem}
      .vedator-editor-mobile-enhanced .vedator-playlist-empty{padding:18px 8px}
      .vedator-editor-mobile-enhanced .vedator-editor-foot{padding:8px 10px max(8px,env(safe-area-inset-bottom));gap:8px}
      .vedator-editor-mobile-enhanced .vedator-editor-save,
      .vedator-editor-mobile-enhanced .vedator-editor-cancel{padding:9px 14px}
    }
  `;
  document.head.appendChild(style);

  const workSwitch=document.createElement('div');
  workSwitch.className='vedator-editor-work-switch';
  workSwitch.innerHTML='<button type="button" data-section="added"></button><button type="button" data-section="add"></button>';
  sourceSwitch.after(workSwitch);
  box.classList.add('vedator-editor-mobile-enhanced');

  const addedButton=workSwitch.querySelector('[data-section="added"]');
  const addButton=workSwitch.querySelector('[data-section="add"]');

  function currentMode(){return sourceSwitch.querySelector('button.active')?.dataset.mode==='q'?'q':'e'}
  function selectedCount(){return order.querySelectorAll('.vedator-edit-row[data-ref]').length}
  function setSection(section,focus=false){
    const value=section==='add'?'add':'added';
    if(box.dataset.mobileSection!==value)box.dataset.mobileSection=value;
    addedButton.classList.toggle('active',value==='added');
    addButton.classList.toggle('active',value==='add');
    if(focus&&value==='add')search?.focus({preventScroll:true});
  }
  function sync(countOverride){
    const count=Number.isInteger(countOverride)?countOverride:selectedCount();
    setText(addedButton,text(`Přidané (${count})`,`Pridané (${count})`));
    setText(addButton,currentMode()==='q'?text('Přidat otázky','Pridať otázky'):text('Přidat epizody','Pridať epizódy'));
    if(!box.dataset.mobileSection)setSection(count?'added':'add');
    else setSection(box.dataset.mobileSection);
  }
  const syncAfterEvent=()=>queueMicrotask(sync);

  workSwitch.addEventListener('click',event=>{
    const button=event.target.closest('button[data-section]');
    if(button)setSection(button.dataset.section,true);
  });
  choices.addEventListener('change',syncAfterEvent);
  order.addEventListener('click',syncAfterEvent);
  sourceSwitch.addEventListener('click',syncAfterEvent);
  window.addEventListener('vedatorlanguagechange',sync);

  document.addEventListener('click',event=>{
    const edit=event.target.closest('.vedator-playlist-icon.edit');
    if(!edit)return;
    delete box.dataset.mobileSection;
    let count=null;
    try{
      const id=edit.closest('.vedator-playlist-card')?.dataset.id;
      const playlists=JSON.parse(localStorage.getItem(PLAYLIST_KEY)||'[]');
      const playlist=Array.isArray(playlists)?playlists.find(item=>String(item?.id)===String(id)):null;
      if(playlist)count=Array.isArray(playlist.items)?playlist.items.length:0;
    }catch{}
    if(Number.isInteger(count))sync(count);
    else queueMicrotask(sync);
  });

  sync();
})();
